import type { Locator } from 'playwright-core';
import type { Target } from '../config/steps.js';
import { centerOf, intersect, type Point, type Rect, type Size } from '../shared/geometry.js';
import { redact } from '../shared/redact.js';
import { pollUntil, sleep } from '../shared/time.js';
import type { ActionContext } from './context.js';
import { describeTarget, locate, stepFailed } from './locate.js';
import { callHelper } from './page-scripts.js';
import { revealTarget } from './scroll.js';
import type { ScrollMode } from './scroll-plan.js';

const MIN_OPACITY = 0.1;
const SETTLE_TOLERANCE_PX = 4;
const SETTLE_SAMPLE_MS = 60;
const SETTLE_MAX_MS = 1_000;
const WAIT_POLL_MS = 100;
const COVER_WAIT_MS = 2_000;

export interface PreparedTarget {
  readonly locator: Locator;
  readonly box: Rect;
  readonly point: Point;
}

export interface PrepareOptions {
  readonly enabled?: boolean;
  readonly mode?: ScrollMode;
}

export async function prepareTarget(
  context: ActionContext,
  target: Target,
  options: PrepareOptions = {},
): Promise<PreparedTarget> {
  const locator = await locate(context.session.page, target, { timeoutMs: context.timeoutMs });
  await waitUntilOpaque(locator, target, context.timeoutMs);
  await revealTarget(context, locator, options.mode);
  const box = await waitUntilSettled(locator, target);
  if (options.enabled) await waitUntilEnabled(locator, target, context.timeoutMs);
  await waitUntilUncovered(locator, target);
  return { locator, box, point: aimPoint(box, context.session.identity.viewport) };
}

export async function moveToTarget(
  context: ActionContext,
  target: Target,
  prepared: PreparedTarget,
): Promise<PreparedTarget> {
  await context.pointer.moveTo(prepared.point, context.speed);
  const box = await waitUntilSettled(prepared.locator, target);
  let { point } = prepared;
  if (!contains(box, point)) {
    point = aimPoint(box, context.session.identity.viewport);
    await context.pointer.moveTo(point, context.speed);
  }
  await waitUntilUncovered(prepared.locator, target);
  return { locator: prepared.locator, box, point };
}

export function aimPoint(box: Rect, viewport: Size): Point {
  return centerOf(intersect(box, { x: 0, y: 0, ...viewport }) ?? box);
}

async function waitUntilOpaque(locator: Locator, target: Target, timeoutMs: number): Promise<void> {
  if (await callHelper(locator, 'checkable')) return;
  const opaque = await pollUntil(
    async () => (await callHelper(locator, 'opacity')) >= MIN_OPACITY,
    timeoutMs,
    WAIT_POLL_MS,
  );
  if (!opaque)
    throw stepFailed(
      `${describeTarget(target)} is see-through (opacity 0), so it counts as hidden.`,
    );
}

async function waitUntilSettled(locator: Locator, target: Target): Promise<Rect> {
  const end = performance.now() + SETTLE_MAX_MS;
  let previous = await boxOf(locator, target);
  while (performance.now() < end) {
    await sleep(SETTLE_SAMPLE_MS);
    const current = await boxOf(locator, target);
    if (shift(previous, current) < SETTLE_TOLERANCE_PX) return current;
    previous = current;
  }
  return previous;
}

async function waitUntilEnabled(
  locator: Locator,
  target: Target,
  timeoutMs: number,
): Promise<void> {
  const enabled = await pollUntil(() => locator.isEnabled(), timeoutMs, WAIT_POLL_MS);
  if (!enabled) throw stepFailed(`${describeTarget(target)} stayed disabled.`);
}

async function waitUntilUncovered(locator: Locator, target: Target): Promise<void> {
  let cover: string | null = null;
  const clear = await pollUntil(
    async () => {
      cover = await callHelper(locator, 'cover');
      return cover === null;
    },
    COVER_WAIT_MS,
    WAIT_POLL_MS,
  );
  if (!clear) {
    throw stepFailed(
      `${describeTarget(target)} is covered by ${redact(cover ?? 'another element')}.`,
      'Close the covering element first, for example a cookie banner, with its own click step.',
    );
  }
}

async function boxOf(locator: Locator, target: Target): Promise<Rect> {
  const box = await locator.boundingBox();
  if (!box) throw stepFailed(`${describeTarget(target)} disappeared.`);
  return box;
}

function shift(a: Rect, b: Rect): number {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.width - b.width),
    Math.abs(a.height - b.height),
  );
}

function contains(box: Rect, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}
