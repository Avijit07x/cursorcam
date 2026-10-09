import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Frame, Page } from 'playwright-core';
import { PageHandlers } from '../browser/handlers.js';
import { IDENTITIES, type IdentityName } from '../browser/identity.js';
import { launchBrowser } from '../browser/launch.js';
import { formatLocator } from '../config/locator-syntax.js';
import type { Target } from '../config/steps.js';
import { isLocalUrl } from '../config/urls.js';
import { candidatesFor } from '../record/locate.js';
import { NetworkTracker } from '../record/network.js';
import { captureFirstFrame } from '../record/screencast.js';
import { openUrl } from '../record/waits.js';
import { centerOf, distance, type Rect, type Size } from '../shared/geometry.js';
import { redact } from '../shared/redact.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';
import { collectTargets, type RawTarget, type TargetWarning } from './collect.js';

export interface InspectOptions {
  readonly url: string;
  readonly viewport: IdentityName;
  readonly outDir: string;
  readonly paths: AppPaths;
  readonly lifecycle: Lifecycle;
  readonly filter?: string | undefined;
  readonly limit: number;
  readonly mask?: readonly string[];
  readonly loginState?: string | undefined;
}

export interface InspectTarget {
  readonly locator: Target;
  readonly role: string;
  readonly name: string;
  readonly where: string;
  readonly disabled: boolean;
}

export interface InspectReport {
  readonly url: string;
  readonly frame: string;
  readonly total: number;
  readonly targets: readonly InspectTarget[];
  readonly warnings: readonly string[];
}

interface FoundTarget {
  readonly raw: RawTarget;
  readonly frame: string | undefined;
}

const FRAME_FILE = 'frame.jpg';
const PAGE_TIMEOUT_MS = 30_000;
const IN_VIEW = 'in view';
const MAX_TEXT_LOCATOR = 40;
const SAME_SPOT_PX = 3;
const FIELD_TAGS: ReadonlySet<string> = new Set(['input', 'textarea', 'select']);
const WARNING_TEXT: Readonly<Record<TargetWarning, string>> = {
  picker: 'its picker will not show in the video. Type the value instead.',
  select: 'the option list only shows in the video with "showList": true.',
  tooltip: 'its tooltip will not show in the video.',
};
const NO_VIEWPORT_META =
  'The page has no viewport meta tag, so phones show the desktop layout zoomed out.';

export async function inspectPage(options: InspectOptions): Promise<InspectReport> {
  const identity = IDENTITIES[options.viewport];
  const session = await launchBrowser({
    identity,
    paths: options.paths,
    settings: { ignoreHTTPSErrors: isLocalUrl(options.url) },
    ...(options.loginState ? { loginState: options.loginState } : {}),
  });
  options.lifecycle.add(() => session.dispose());
  const handlers = await PageHandlers.install(session, { mask: options.mask ?? [] });
  const network = new NetworkTracker(session);
  try {
    const { page } = session;
    await session.guard(openUrl(page, options.url, PAGE_TIMEOUT_MS));
    await session.guard(network.waitForQuiet());
    const frame = join(options.outDir, FRAME_FILE);
    await writeFile(frame, (await session.guard(captureFirstFrame(page))).data);

    const { found, hasViewportMeta } = await collectAll(page);
    const matching = found.filter((target) => matchesFilter(target.raw, options.filter));
    const ordered = matching.toSorted((a, b) =>
      compareTargets(a.raw.box, b.raw.box, identity.viewport),
    );
    const targets: InspectTarget[] = [];
    const warnings: string[] = [];
    for (const target of ordered) {
      if (targets.length >= options.limit) break;
      const locator = await bestLocator(page, target);
      if (!locator) continue;
      targets.push({
        locator,
        role: roleLabel(target.raw),
        name: redact(target.raw.name),
        where: whereIs(target.raw.box, identity.viewport),
        disabled: target.raw.disabled,
      });
      if (target.raw.warning)
        warnings.push(`${describe(locator)}: ${WARNING_TEXT[target.raw.warning]}`);
    }
    if (identity.mobile && !hasViewportMeta) warnings.push(NO_VIEWPORT_META);
    return { url: options.url, frame, total: matching.length, targets, warnings };
  } finally {
    network.dispose();
    handlers.dispose();
  }
}

async function collectAll(page: Page): Promise<{ found: FoundTarget[]; hasViewportMeta: boolean }> {
  const main = await page.mainFrame().evaluate(collectTargets);
  const found: FoundTarget[] = main.targets.map((raw) => ({ raw, frame: undefined }));
  for (const frame of page.mainFrame().childFrames()) {
    const selector = await frameSelector(frame);
    if (!selector) continue;
    const summary = await frame.evaluate(collectTargets).catch(() => undefined);
    for (const raw of summary?.targets ?? []) found.push({ raw, frame: selector });
  }
  return { found, hasViewportMeta: main.hasViewportMeta };
}

async function frameSelector(frame: Frame): Promise<string | undefined> {
  const element = await frame.frameElement().catch(() => undefined);
  if (!element) return undefined;
  const selector = await element.evaluate((node) => {
    if (!(node instanceof Element)) return '';
    const name = node.getAttribute('name');
    const src = node.getAttribute('src');
    if (node.id) return `#${CSS.escape(node.id)}`;
    if (name) return `iframe[name="${CSS.escape(name)}"]`;
    if (src) return `iframe[src="${CSS.escape(src)}"]`;
    return '';
  });
  await element.dispose();
  return selector || undefined;
}

function suggestions(raw: RawTarget): string[] {
  const list: string[] = [];
  if (raw.testId) list.push(`testid=${raw.testId}`);
  if (raw.role && raw.name)
    list.push(formatLocator({ kind: 'role', role: raw.role, name: raw.name }));
  if (raw.label) list.push(`label=${raw.label}`);
  if (raw.placeholder) list.push(`placeholder=${raw.placeholder}`);
  if (raw.text && raw.text.length <= MAX_TEXT_LOCATOR && !FIELD_TAGS.has(raw.tag))
    list.push(`text=${raw.text}`);
  if (raw.css) list.push(raw.css);
  return list;
}

async function bestLocator(page: Page, target: FoundTarget): Promise<Target | undefined> {
  for (const find of suggestions(target.raw)) {
    const frame = target.frame === undefined ? {} : { frame: target.frame };
    const loose: Target = target.frame === undefined ? find : { find, ...frame };
    if (await pointsAt(page, loose, target)) return loose;
    const exact: Target = { find, exact: true, ...frame };
    if (
      !find.startsWith('testid=') &&
      find !== target.raw.css &&
      (await pointsAt(page, exact, target))
    )
      return exact;
  }
  return undefined;
}

async function pointsAt(page: Page, locator: Target, target: FoundTarget): Promise<boolean> {
  try {
    const candidates = candidatesFor(page, locator);
    if ((await candidates.count()) !== 1) return false;
    if (target.frame !== undefined) return true;
    const box = await candidates.boundingBox();
    return box !== null && distance(centerOf(box), centerOf(target.raw.box)) <= SAME_SPOT_PX;
  } catch {
    return false;
  }
}

function matchesFilter(raw: RawTarget, filter: string | undefined): boolean {
  if (!filter) return true;
  const needle = filter.toLowerCase();
  return [raw.role, raw.name, raw.label, raw.placeholder, raw.testId, raw.text, raw.tag].some(
    (value) => value.toLowerCase().includes(needle),
  );
}

function compareTargets(a: Rect, b: Rect, viewport: Size): number {
  const aInView = whereIs(a, viewport) === IN_VIEW;
  const bInView = whereIs(b, viewport) === IN_VIEW;
  if (aInView !== bInView) return aInView ? -1 : 1;
  const sameRow = Math.abs(a.y - b.y) < Math.min(a.height, b.height) / 2;
  return sameRow ? a.x - b.x : a.y - b.y;
}

function whereIs(box: Rect, viewport: Size): string {
  if (box.y >= viewport.height)
    return `${Math.round(box.y - viewport.height + box.height)} px below`;
  if (box.y + box.height <= 0) return `${Math.round(-box.y)} px above`;
  if (box.x >= viewport.width || box.x + box.width <= 0) return 'off to the side';
  return IN_VIEW;
}

function roleLabel(raw: RawTarget): string {
  if (raw.role) return raw.role;
  return raw.password ? 'password' : raw.tag;
}

export function describe(locator: Target): string {
  return typeof locator === 'string' ? locator : JSON.stringify(locator);
}
