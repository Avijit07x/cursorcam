import type { LoggedEvent } from '../record/events.js';
import { lerpPoint, type Point } from '../shared/geometry.js';
import { lastIndexAtOrBefore } from '../shared/search.js';

export interface Ripple extends Point {
  readonly progress: number;
}

interface Sample extends Point {
  readonly t: number;
}

const SMOOTH_GAP_MS = 40;
const RIPPLE_MS = 450;
const TOUCH_BEFORE_MS = 120;
const TOUCH_AFTER_MS = 380;

export class CursorTrack {
  readonly #samples: Sample[] = [];
  readonly #presses: [number, number][] = [];
  readonly #clicks: Sample[] = [];
  readonly #touch: boolean;

  constructor(events: readonly LoggedEvent[], touch: boolean) {
    this.#touch = touch;
    let pressedAt: number | undefined;
    for (const event of events) {
      if (event.type === 'cursor') this.#samples.push({ t: event.t, x: event.x, y: event.y });
      if (event.type === 'click' || event.type === 'tap')
        this.#clicks.push({ t: event.t, x: event.x, y: event.y });
      if (event.type === 'button' && event.phase === 'down') pressedAt = event.t;
      if (event.type === 'button' && event.phase === 'up' && pressedAt !== undefined) {
        this.#presses.push([pressedAt, event.t]);
        pressedAt = undefined;
      }
    }
  }

  positionAt(time: number): Point | undefined {
    if (this.#touch) return this.#touchAt(time);
    const samples = this.#samples;
    const index = lastIndexAtOrBefore(samples, time, (sample) => sample.t);
    const current = samples[index];
    if (!current) return undefined;
    const next = samples[index + 1];
    if (!next || next.t - current.t > SMOOTH_GAP_MS) return { x: current.x, y: current.y };
    return lerpPoint(current, next, (time - current.t) / (next.t - current.t));
  }

  pressedAt(time: number): boolean {
    return this.#presses.some(([down, up]) => time >= down && time <= up);
  }

  ripplesAt(time: number): Ripple[] {
    return this.#clicks
      .filter((click) => time >= click.t && time - click.t < RIPPLE_MS)
      .map((click) => ({ x: click.x, y: click.y, progress: (time - click.t) / RIPPLE_MS }));
  }

  #touchAt(time: number): Point | undefined {
    const tap = this.#clicks.find(
      (click) => time >= click.t - TOUCH_BEFORE_MS && time <= click.t + TOUCH_AFTER_MS,
    );
    return tap ? { x: tap.x, y: tap.y } : undefined;
  }
}
