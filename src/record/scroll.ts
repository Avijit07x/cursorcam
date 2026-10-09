import type { Locator } from 'playwright-core';
import { centerOf, clamp, type Point, type Rect } from '../shared/geometry.js';
import { sleep } from '../shared/time.js';
import type { ActionContext } from './context.js';
import { callHelper, type ScrollPosition } from './page-scripts.js';
import {
  planScroll,
  scrollDuration,
  wheelSteps,
  type ScrollMode,
  type ScrollPlan,
} from './scroll-plan.js';

const WHEEL_FRAME_MS = 16;
const MAX_ROUNDS = 5;
const SETTLE_SAMPLE_MS = 60;
const SETTLE_MAX_MS = 1_500;
const MOVED_PX = 1;
const PROBE_GRID = [0.5, 0.25, 0.75] as const;

export type ScrollEdge = 'top' | 'bottom';

export async function revealTarget(
  context: ActionContext,
  locator: Locator,
  mode: ScrollMode = 'reveal',
): Promise<void> {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const plan = planScroll(await callHelper(locator, 'measureScrollers', false), mode);
    if (!plan) return;
    const moved = await wheelScroll(context, locator, false, plan);
    if (!moved) await jumpScroll(context, locator, false, plan);
  }
}

export async function scrollContainer(
  context: ActionContext,
  container: Locator,
  how: ScrollEdge | number,
): Promise<void> {
  const measure = await callHelper(container, 'measureScrollers', true);
  const [scroller] = measure.scrollers;
  if (!scroller) return;
  const view: Rect = { x: 0, y: 0, ...measure.viewport };
  const delta = { x: 0, y: verticalDelta(scroller.top, scroller.maxTop, how) };
  if (Math.abs(delta.y) < MOVED_PX) return;
  const plan: ScrollPlan = { index: 0, delta, area: clipTo(scroller.rect, view) };
  const moved = await wheelScroll(context, container, true, plan);
  if (!moved) await jumpScroll(context, container, true, plan);
}

function verticalDelta(top: number, maxTop: number, how: ScrollEdge | number): number {
  if (how === 'top') return -top;
  if (how === 'bottom') return maxTop - top;
  return clamp(how, -top, maxTop - top);
}

function clipTo(rect: Rect, view: Rect): Rect {
  const x = clamp(rect.x, view.x, view.x + view.width);
  const y = clamp(rect.y, view.y, view.y + view.height);
  return {
    x,
    y,
    width: clamp(rect.x + rect.width, x, view.x + view.width) - x,
    height: clamp(rect.y + rect.height, y, view.y + view.height) - y,
  };
}

async function jumpScroll(
  context: ActionContext,
  locator: Locator,
  self: boolean,
  plan: ScrollPlan,
): Promise<void> {
  await callHelper(locator, 'jumpScroll', self, plan.index, plan.delta);
  context.events.log({ type: 'jump' });
}

async function wheelScroll(
  context: ActionContext,
  locator: Locator,
  self: boolean,
  plan: ScrollPlan,
): Promise<boolean> {
  const point = await wheelPoint(context, locator, self, plan);
  if (!point) return false;
  await context.pointer.moveTo(point, context.speed);
  const before = await callHelper(locator, 'scrollPosition', self, plan.index);
  context.events.log({ type: 'scroll', phase: 'start' });
  await wheel(context, plan.delta);
  const after = await waitUntilStill(locator, self, plan.index);
  context.events.log({ type: 'scroll', phase: 'end' });
  return movedBetween(before, after);
}

async function wheelPoint(
  context: ActionContext,
  locator: Locator,
  self: boolean,
  plan: ScrollPlan,
): Promise<Point | undefined> {
  const { area } = plan;
  const current = context.pointer.position;
  const inside =
    current.x > area.x &&
    current.x < area.x + area.width &&
    current.y > area.y &&
    current.y < area.y + area.height;
  const candidates: Point[] = inside ? [current, centerOf(area)] : [centerOf(area)];
  for (const fx of PROBE_GRID) {
    for (const fy of PROBE_GRID) {
      candidates.push({ x: area.x + area.width * fx, y: area.y + area.height * fy });
    }
  }
  for (const candidate of candidates) {
    if (await callHelper(locator, 'wheelReaches', self, plan.index, candidate)) return candidate;
  }
  return undefined;
}

async function wheel(context: ActionContext, delta: Point): Promise<void> {
  const distance = Math.max(Math.abs(delta.x), Math.abs(delta.y));
  const steps = Math.max(1, Math.round(scrollDuration(distance, context.speed) / WHEEL_FRAME_MS));
  const xs = wheelSteps(delta.x, steps);
  const ys = wheelSteps(delta.y, steps);
  const start = performance.now();
  for (let step = 0; step < steps; step += 1) {
    const dx = xs[step] ?? 0;
    const dy = ys[step] ?? 0;
    if (dx !== 0 || dy !== 0) await context.session.page.mouse.wheel(dx, dy);
    await sleep(start + (step + 1) * WHEEL_FRAME_MS - performance.now());
  }
}

async function waitUntilStill(
  locator: Locator,
  self: boolean,
  index: number,
): Promise<ScrollPosition | null> {
  const end = performance.now() + SETTLE_MAX_MS;
  let previous = await callHelper(locator, 'scrollPosition', self, index);
  while (performance.now() < end) {
    await sleep(SETTLE_SAMPLE_MS);
    const current = await callHelper(locator, 'scrollPosition', self, index);
    if (!movedBetween(previous, current)) return current;
    previous = current;
  }
  return previous;
}

function movedBetween(before: ScrollPosition | null, after: ScrollPosition | null): boolean {
  if (!before || !after) return false;
  return (
    Math.abs(after.left - before.left) >= MOVED_PX || Math.abs(after.top - before.top) >= MOVED_PX
  );
}
