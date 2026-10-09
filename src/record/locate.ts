import { errors, type FrameLocator, type Locator, type Page } from 'playwright-core';
import { parseLocator, type LocatorQuery } from '../config/locator-syntax.js';
import type { Target } from '../config/steps.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { centerOf, distance } from '../shared/geometry.js';
import { redact } from '../shared/redact.js';
import { callHelper } from './page-scripts.js';

type Scope = Page | FrameLocator | Locator;
type AriaRole = Parameters<Page['getByRole']>[0];

export interface TargetSpec {
  readonly find: string;
  readonly nth?: number | undefined;
  readonly within?: string | undefined;
  readonly near?: string | undefined;
  readonly frame?: string | undefined;
  readonly exact?: boolean | undefined;
}

export interface LocateOptions {
  readonly timeoutMs: number;
  readonly visibleOnly?: boolean;
}

const MAX_LISTED_MATCHES = 5;
const MS_PER_SECOND = 1000;
const INSPECT_HINT =
  'Run cursorcam inspect on the page to list targets, or add a waitFor step first.';

export function toSpec(target: Target): TargetSpec {
  return typeof target === 'string' ? { find: target } : target;
}

export function describeTarget(target: Target): string {
  const spec = toSpec(target);
  const parts = [spec.find];
  if (spec.nth !== undefined) parts.push(`nth ${spec.nth}`);
  if (spec.within) parts.push(`within ${spec.within}`);
  if (spec.near) parts.push(`near ${spec.near}`);
  if (spec.frame) parts.push(`in frame ${spec.frame}`);
  return parts.join(', ');
}

export function queryLocator(scope: Scope, query: LocatorQuery, exact: boolean): Locator {
  switch (query.kind) {
    case 'role':
      return scope.getByRole(
        query.role as AriaRole,
        query.name === undefined ? {} : { name: query.name, exact },
      );
    case 'label':
      return scope.getByLabel(query.value, { exact });
    case 'text':
      return scope.getByText(query.value, { exact });
    case 'placeholder':
      return scope.getByPlaceholder(query.value, { exact });
    case 'testid':
      return scope.getByTestId(query.value);
    case 'alt':
      return scope.getByAltText(query.value, { exact });
    case 'title':
      return scope.getByTitle(query.value, { exact });
    case 'css':
      return scope.locator(query.selector);
  }
}

export function candidatesFor(page: Page, target: Target, visibleOnly = true): Locator {
  const spec = toSpec(target);
  const exact = spec.exact ?? false;
  const root: Page | FrameLocator = spec.frame ? page.frameLocator(spec.frame) : page;
  const scope = spec.within ? visible(queryLocator(root, parseLocator(spec.within), exact)) : root;
  const all = queryLocator(scope, parseLocator(spec.find), exact);
  return visibleOnly ? visible(all) : all;
}

export async function locate(page: Page, target: Target, options: LocateOptions): Promise<Locator> {
  const spec = toSpec(target);
  const candidates = candidatesFor(page, target, options.visibleOnly ?? true);
  await waitForMatch(candidates, target, options.timeoutMs, options.visibleOnly ?? true);
  const count = await candidates.count();

  if (spec.nth !== undefined) {
    const index = spec.nth < 0 ? count + spec.nth : spec.nth;
    if (index < 0 || index >= count) {
      throw stepFailed(
        `${describeTarget(target)} has ${count} matches, so nth ${spec.nth} does not exist.`,
      );
    }
    return candidates.nth(index);
  }
  if (spec.near) return nearest(page, candidates, count, spec, options.timeoutMs);
  if (count > 1) {
    const matches = await listMatches(candidates);
    throw stepFailed(
      `${describeTarget(target)} matches ${count} elements:\n${matches}`,
      'Add "nth", "within" or "near" to the target, or use a more exact locator.',
    );
  }
  return candidates.first();
}

export async function waitForGone(page: Page, target: Target, timeoutMs: number): Promise<void> {
  try {
    await candidatesFor(page, target).first().waitFor({ state: 'detached', timeout: timeoutMs });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    throw stepFailed(`${describeTarget(target)} was still visible after ${seconds(timeoutMs)}.`);
  }
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

async function waitForMatch(
  candidates: Locator,
  target: Target,
  timeoutMs: number,
  visibleOnly: boolean,
): Promise<void> {
  try {
    await candidates
      .first()
      .waitFor({ state: visibleOnly ? 'visible' : 'attached', timeout: timeoutMs });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    throw stepFailed(
      `Could not find ${describeTarget(target)} within ${seconds(timeoutMs)}.`,
      INSPECT_HINT,
    );
  }
}

async function nearest(
  page: Page,
  candidates: Locator,
  count: number,
  spec: TargetSpec,
  timeoutMs: number,
): Promise<Locator> {
  const anchorTarget = spec.frame
    ? { find: spec.near ?? '', frame: spec.frame }
    : (spec.near ?? '');
  const anchor = await locate(page, anchorTarget, { timeoutMs });
  const anchorBox = await anchor.boundingBox();
  if (!anchorBox) throw stepFailed(`${spec.near ?? ''} is not visible, so "near" cannot use it.`);
  const anchorCenter = centerOf(anchorBox);

  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < count; index += 1) {
    const box = await candidates.nth(index).boundingBox();
    if (!box) continue;
    const gap = distance(centerOf(box), anchorCenter);
    if (gap < bestDistance) {
      bestDistance = gap;
      bestIndex = index;
    }
  }
  return candidates.nth(bestIndex);
}

async function listMatches(candidates: Locator): Promise<string> {
  const descriptions: string[] = [];
  const count = Math.min(await candidates.count(), MAX_LISTED_MATCHES);
  for (let index = 0; index < count; index += 1) {
    const description = await callHelper(candidates.nth(index), 'describe').catch(() => 'element');
    descriptions.push(`  ${index}: ${redact(description)}`);
  }
  return descriptions.join('\n');
}

function seconds(ms: number): string {
  return `${Math.round(ms / MS_PER_SECOND)} s`;
}

export function stepFailed(message: string, hint?: string): CursorCamError {
  return new CursorCamError(message, { exitCode: ExitCode.StepFailed, hint });
}

export async function waitForVisible(page: Page, target: Target, timeoutMs: number): Promise<void> {
  await waitForMatch(candidatesFor(page, target), target, timeoutMs, true);
}
