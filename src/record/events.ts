import { createWriteStream, type WriteStream } from 'node:fs';
import { once } from 'node:events';
import type { ActionName } from '../config/steps.js';
import { roundTo, type Rect } from '../shared/geometry.js';

export type RecordEvent =
  | {
      readonly type: 'step';
      readonly phase: 'start' | 'end';
      readonly index: number;
      readonly action: ActionName;
      readonly zoom?: number | false;
      readonly pauseAfter?: number;
    }
  | { readonly type: 'cursor'; readonly x: number; readonly y: number }
  | {
      readonly type: 'button';
      readonly phase: 'down' | 'up';
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'click';
      readonly x: number;
      readonly y: number;
      readonly count: number;
      readonly target: Rect;
    }
  | { readonly type: 'tap'; readonly x: number; readonly y: number; readonly target: Rect }
  | { readonly type: 'hover'; readonly target: Rect }
  | {
      readonly type: 'typing';
      readonly phase: 'start' | 'end';
      readonly target: Rect;
      readonly fast: boolean;
      readonly chars: number;
    }
  | { readonly type: 'key'; readonly key: string }
  | { readonly type: 'scroll'; readonly phase: 'start' | 'end'; readonly target?: Rect }
  | { readonly type: 'jump' }
  | { readonly type: 'navigate'; readonly phase: 'start' | 'load'; readonly url: string }
  | { readonly type: 'tab'; readonly reason: 'opened' | 'closed'; readonly url: string }
  | {
      readonly type: 'dialog';
      readonly kind: string;
      readonly message: string;
      readonly accepted: boolean;
    }
  | { readonly type: 'select'; readonly target: Rect }
  | {
      readonly type: 'drag';
      readonly phase: 'start' | 'end';
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'ask'; readonly phase: 'wait' | 'done'; readonly label: string }
  | { readonly type: 'download'; readonly file: string }
  | { readonly type: 'warning'; readonly message: string };

export type LoggedEvent = RecordEvent & { readonly t: number; readonly wall: number };

export interface Clock {
  now(): number;
}

export function createClock(): Clock {
  const start = performance.now();
  return { now: () => performance.now() - start };
}

export class EventLog {
  readonly clock: Clock;
  readonly #stream: WriteStream | undefined;
  readonly #warnings: string[] = [];
  readonly #onError: (error: Error) => void;

  constructor(clock: Clock, file: string | undefined, onError: (error: Error) => void) {
    this.clock = clock;
    this.#onError = onError;
    this.#stream = file ? createWriteStream(file, { flags: 'a' }) : undefined;
    this.#stream?.on('error', onError);
  }

  get warnings(): readonly string[] {
    return this.#warnings;
  }

  log(event: RecordEvent): void {
    if (event.type === 'warning') this.#warnings.push(event.message);
    if (!this.#stream || this.#stream.destroyed) return;
    const line: LoggedEvent = { ...event, t: roundTo(this.clock.now(), 1), wall: Date.now() };
    this.#stream.write(`${JSON.stringify(line)}\n`);
  }

  async close(): Promise<void> {
    const stream = this.#stream;
    if (!stream || stream.destroyed) return;
    stream.end();
    try {
      await once(stream, 'finish');
    } catch (error) {
      this.#onError(error as Error);
    }
  }
}
