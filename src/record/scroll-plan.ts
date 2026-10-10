import { clamp, easeInOutCubic, intersect, type Point, type Rect } from '../shared/geometry.js';
import type { ScrollerInfo, ScrollMeasure } from './page-scripts.js';

export type ScrollMode = 'reveal' | 'center';

export interface ScrollPlan {
  readonly index: number;
  readonly delta: Point;
  readonly area: Rect;
}

const COMFORT_MARGIN = 0.12;
const MIN_SCROLL_PX = 2;
const SCROLL_BASE_MS = 300;
const SCROLL_MS_PER_PX = 0.35;
const SCROLL_MIN_MS = 350;
const SCROLL_MAX_MS = 1400;

export function planScroll(measure: ScrollMeasure, mode: ScrollMode): ScrollPlan | undefined {
  const view: Rect = { x: 0, y: 0, ...measure.viewport };
  let target: Rect = measure.element;
  for (const [index, scroller] of measure.scrollers.entries()) {
    const area = intersect(scroller.rect, view);
    if (area && !stuckInView(scroller, area, target)) {
      const delta = {
        x: worthScrolling(
          clamp(
            axisDelta(target.x, target.width, area.x, area.width, mode),
            -scroller.left,
            scroller.maxLeft - scroller.left,
          ),
        ),
        y: worthScrolling(
          clamp(
            axisDelta(target.y, target.height, area.y, area.height, mode),
            -scroller.top,
            scroller.maxTop - scroller.top,
          ),
        ),
      };
      if (delta.x !== 0 || delta.y !== 0) return { index, delta, area };
    }
    target = intersect(target, scroller.rect) ?? scroller.rect;
  }
  return undefined;
}

function stuckInView(scroller: ScrollerInfo, area: Rect, target: Rect): boolean {
  return (
    scroller.pinned &&
    target.x >= area.x &&
    target.y >= area.y &&
    target.x + target.width <= area.x + area.width &&
    target.y + target.height <= area.y + area.height
  );
}

function worthScrolling(value: number): number {
  return Math.abs(value) < MIN_SCROLL_PX ? 0 : value;
}

function axisDelta(
  start: number,
  size: number,
  viewStart: number,
  viewSize: number,
  mode: ScrollMode,
): number {
  const margin = viewSize * COMFORT_MARGIN;
  const fits = start >= viewStart + margin && start + size <= viewStart + viewSize - margin;
  if (mode === 'reveal' && fits) return 0;
  if (size > viewSize - 2 * margin) return start - (viewStart + margin);
  return start + size / 2 - (viewStart + viewSize / 2);
}

export function scrollDuration(distancePx: number, speed = 1): number {
  const ms = clamp(
    SCROLL_BASE_MS + Math.abs(distancePx) * SCROLL_MS_PER_PX,
    SCROLL_MIN_MS,
    SCROLL_MAX_MS,
  );
  return ms / speed;
}

export function wheelSteps(total: number, steps: number): number[] {
  const deltas: number[] = [];
  let sent = 0;
  for (let step = 1; step <= steps; step += 1) {
    const wanted = Math.round(total * easeInOutCubic(step / steps));
    deltas.push(wanted - sent);
    sent = wanted;
  }
  return deltas;
}
