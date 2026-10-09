import type { BrowserSession } from '../browser/session.js';
import {
  centerOf,
  clamp,
  distance,
  easeInOutCubic,
  lerpPoint,
  roundTo,
  type Point,
  type Rect,
} from '../shared/geometry.js';
import { sleep } from '../shared/time.js';
import type { EventLog } from './events.js';

const MOVE_BASE_MS = 250;
const MOVE_MS_PER_PX = 0.45;
const MOVE_MIN_MS = 280;
const MOVE_MAX_MS = 900;
const FRAME_MS = 16;
const ARC_RATIO = 0.08;
const AIM_MS = 200;
const PRESS_HOLD_MS = 70;
const DOUBLE_CLICK_GAP_MS = 90;
const MIN_MOVE_PX = 1;

export function moveDuration(from: Point, to: Point, speed = 1): number {
  const ms = clamp(MOVE_BASE_MS + distance(from, to) * MOVE_MS_PER_PX, MOVE_MIN_MS, MOVE_MAX_MS);
  return ms / speed;
}

export function pointOnPath(from: Point, to: Point, progress: number): Point {
  const t = easeInOutCubic(progress);
  const length = distance(from, to);
  const direction = to.x >= from.x ? -1 : 1;
  const middle = lerpPoint(from, to, 0.5);
  const normal =
    length === 0
      ? { x: 0, y: 0 }
      : { x: (-(to.y - from.y) / length) * direction, y: ((to.x - from.x) / length) * direction };
  const control = {
    x: middle.x + normal.x * length * ARC_RATIO,
    y: middle.y + normal.y * length * ARC_RATIO,
  };
  const start = lerpPoint(from, control, t);
  const end = lerpPoint(control, to, t);
  return lerpPoint(start, end, t);
}

export class Pointer {
  readonly #session: BrowserSession;
  readonly #events: EventLog;
  readonly #touch: boolean;
  #position: Point;
  #shown = false;

  constructor(session: BrowserSession, events: EventLog) {
    this.#session = session;
    this.#events = events;
    this.#touch = session.identity.mobile;
    this.#position = centerOf({ x: 0, y: 0, ...session.identity.viewport });
  }

  get position(): Point {
    return this.#position;
  }

  async moveTo(target: Point, speed = 1): Promise<void> {
    const { mouse } = this.#session.page;
    if (this.#touch) {
      await mouse.move(target.x, target.y);
      this.#position = target;
      return;
    }
    if (!this.#shown) {
      this.#log(this.#position);
      this.#shown = true;
    }
    const from = this.#position;
    if (distance(from, target) < MIN_MOVE_PX) {
      await mouse.move(target.x, target.y);
      this.#position = target;
      return;
    }
    const duration = moveDuration(from, target, speed);
    const start = performance.now();
    for (let elapsed = FRAME_MS; ; elapsed += FRAME_MS) {
      const progress = Math.min(elapsed / duration, 1);
      const point = progress >= 1 ? target : pointOnPath(from, target, progress);
      await mouse.move(point.x, point.y);
      this.#position = point;
      this.#log(point);
      if (progress >= 1) return;
      await sleep(start + elapsed - performance.now());
    }
  }

  async click(target: Rect, count = 1): Promise<void> {
    await sleep(AIM_MS);
    const { x, y } = this.#position;
    if (this.#touch) {
      await this.#session.page.touchscreen.tap(x, y);
      this.#events.log({ type: 'tap', x, y, target });
      return;
    }
    for (let click = 1; click <= count; click += 1) {
      await this.down(click);
      await sleep(PRESS_HOLD_MS);
      await this.up(click);
      if (click < count) await sleep(DOUBLE_CLICK_GAP_MS);
    }
    this.#events.log({ type: 'click', x, y, count, target });
  }

  async down(clickCount = 1): Promise<void> {
    const { x, y } = this.#position;
    await this.#session.page.mouse.down({ clickCount });
    this.#events.log({ type: 'button', phase: 'down', x, y });
  }

  async up(clickCount = 1): Promise<void> {
    const { x, y } = this.#position;
    await this.#session.page.mouse.up({ clickCount });
    this.#events.log({ type: 'button', phase: 'up', x, y });
  }

  #log(point: Point): void {
    this.#events.log({ type: 'cursor', x: roundTo(point.x, 1), y: roundTo(point.y, 1) });
  }
}
