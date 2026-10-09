import type { LoggedEvent } from '../record/events.js';
import type { FrameRecord } from '../record/frames.js';
import { lastIndexAtOrBefore } from '../shared/search.js';

export interface TimedFrame {
  readonly index: number;
  readonly time: number;
  readonly tab: number;
  readonly scrollX: number;
  readonly scrollY: number;
}

export interface TimeSegment {
  readonly outStart: number;
  readonly outEnd: number;
  readonly srcStart: number;
  readonly srcEnd: number;
  readonly dialog?: number;
}

export interface TimeOptions {
  readonly trimIdle: boolean;
  readonly dialogs: boolean;
}

export const LOAD_SETTLE_MS = 150;
const MAX_LOAD_HOLD_MS = 4_000;
const IDLE_MIN_MS = 1_500;
const IDLE_KEEP_MS = 350;
const IDLE_OUT_MS = 450;
const DIALOG_HOLD_MS = 1_400;

const ACTIVITY_TYPES: ReadonlySet<LoggedEvent['type']> = new Set([
  'cursor',
  'button',
  'click',
  'tap',
  'hover',
  'typing',
  'key',
  'scroll',
  'select',
  'drag',
  'dialog',
  'navigate',
  'tab',
  'jump',
]);

export function correctFrameTimes(frames: readonly FrameRecord[]): TimedFrame[] {
  let offset = Infinity;
  for (const frame of frames) offset = Math.min(offset, frame.at - frame.ts);
  return frames.map((frame) => ({
    index: frame.index,
    time: frame.ts + offset,
    tab: frame.tab,
    scrollX: frame.scrollX,
    scrollY: frame.scrollY,
  }));
}

export function loadingRanges(events: readonly LoggedEvent[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start: number | undefined;
  for (const event of events) {
    if (event.type === 'navigate' && event.phase === 'start') start ??= event.t;
    const loaded = (event.type === 'navigate' && event.phase === 'load') || event.type === 'tab';
    if (loaded && start !== undefined) {
      ranges.push([start, event.t + LOAD_SETTLE_MS]);
      start = undefined;
    }
  }
  if (start !== undefined) ranges.push([start, start + MAX_LOAD_HOLD_MS]);
  return ranges;
}

export class FramePicker {
  readonly #frames: TimedFrame[];
  readonly #loading: readonly [number, number][];

  constructor(frames: readonly TimedFrame[], loading: readonly [number, number][]) {
    let newestTab = -1;
    this.#frames = frames.filter((frame) => {
      if (frame.tab < newestTab) return false;
      newestTab = frame.tab;
      return true;
    });
    this.#loading = loading;
  }

  get first(): TimedFrame | undefined {
    return this.#frames[0];
  }

  at(time: number): TimedFrame {
    const range = this.#loading.find(([start, end]) => time > start && time <= end);
    const index = lastIndexAtOrBefore(this.#frames, range ? range[0] : time, (frame) => frame.time);
    const frame = this.#frames[Math.max(index, 0)];
    if (!frame) throw new Error('A recording always has at least one frame.');
    return frame;
  }
}

export class TimeMap {
  readonly segments: readonly TimeSegment[];

  constructor(segments: readonly TimeSegment[]) {
    this.segments = segments;
  }

  get duration(): number {
    return this.segments.at(-1)?.outEnd ?? 0;
  }

  segmentAt(outTime: number): TimeSegment | undefined {
    return this.segments.find((segment) => outTime < segment.outEnd) ?? this.segments.at(-1);
  }

  outputAt(sourceTime: number): number {
    const segment =
      this.segments.find(
        (candidate) => sourceTime >= candidate.srcStart && sourceTime < candidate.srcEnd,
      ) ?? this.segments.at(-1);
    if (!segment) return 0;
    const span = segment.srcEnd - segment.srcStart;
    if (span <= 0) return segment.outStart;
    const progress = Math.min(Math.max((sourceTime - segment.srcStart) / span, 0), 1);
    return segment.outStart + (segment.outEnd - segment.outStart) * progress;
  }

  sourceAt(outTime: number): number {
    const segment = this.segmentAt(outTime);
    if (!segment) return 0;
    const span = segment.outEnd - segment.outStart;
    if (span <= 0 || segment.srcEnd === segment.srcStart) return segment.srcStart;
    const progress = Math.min(Math.max((outTime - segment.outStart) / span, 0), 1);
    return segment.srcStart + (segment.srcEnd - segment.srcStart) * progress;
  }
}

export function buildTimeMap(
  events: readonly LoggedEvent[],
  start: number,
  end: number,
  options: TimeOptions,
): TimeMap {
  const quiet = options.trimIdle ? idleStretches(events, start, end) : [];
  const freezes = options.dialogs
    ? events.flatMap((event, index) => (event.type === 'dialog' ? [{ time: event.t, index }] : []))
    : [];
  const cuts = [
    ...quiet.flatMap(([from, to]) => [from, to]),
    ...freezes.map((freeze) => freeze.time),
  ];
  const points = [
    ...new Set([start, end, ...cuts.filter((time) => time > start && time < end)]),
  ].sort((a, b) => a - b);

  const segments: TimeSegment[] = [];
  let out = 0;
  let dialogNumber = 0;
  for (const [position, from] of points.entries()) {
    const freeze = freezes.find((candidate) => candidate.time === from);
    if (freeze) {
      segments.push({
        outStart: out,
        outEnd: out + DIALOG_HOLD_MS,
        srcStart: from,
        srcEnd: from,
        dialog: dialogNumber,
      });
      dialogNumber += 1;
      out += DIALOG_HOLD_MS;
    }
    const to = points[position + 1];
    if (to === undefined) break;
    const idle = quiet.some(([quietStart, quietEnd]) => quietStart === from && quietEnd === to);
    const length = idle ? Math.min(to - from, IDLE_OUT_MS) : to - from;
    segments.push({ outStart: out, outEnd: out + length, srcStart: from, srcEnd: to });
    out += length;
  }
  return new TimeMap(segments);
}

function idleStretches(
  events: readonly LoggedEvent[],
  start: number,
  end: number,
): [number, number][] {
  const busy = activityTimes(events);
  const protectedRanges = protectedStretches(events, end);
  const stretches: [number, number][] = [];
  let previous = start;
  for (const time of [...busy, end]) {
    if (time - previous > IDLE_MIN_MS) {
      stretches.push(
        ...withoutRanges([previous + IDLE_KEEP_MS, time - IDLE_KEEP_MS], protectedRanges),
      );
    }
    previous = Math.max(previous, time);
  }
  return stretches;
}

function withoutRanges(
  stretch: [number, number],
  ranges: readonly [number, number][],
): [number, number][] {
  let pieces = [stretch];
  for (const [rangeStart, rangeEnd] of ranges) {
    pieces = pieces.flatMap(([from, to]): [number, number][] => {
      if (to <= rangeStart || from >= rangeEnd) return [[from, to]];
      const before: [number, number] = [from, rangeStart - IDLE_KEEP_MS];
      const after: [number, number] = [rangeEnd + IDLE_KEEP_MS, to];
      return [before, after].filter(([start, stop]) => stop > start);
    });
  }
  return pieces.filter(([from, to]) => to - from > IDLE_OUT_MS);
}

function activityTimes(events: readonly LoggedEvent[]): number[] {
  const times: number[] = [];
  let waitingForAnswer = false;
  for (const event of events) {
    if (event.type === 'ask') waitingForAnswer = event.phase === 'wait';
    if (ACTIVITY_TYPES.has(event.type) && !waitingForAnswer) times.push(event.t);
  }
  return times.sort((a, b) => a - b);
}

function protectedStretches(events: readonly LoggedEvent[], end: number): [number, number][] {
  const ranges: [number, number][] = [];
  let pauseStart: number | undefined;
  let lastStepEnd: number | undefined;
  for (const event of events) {
    if (event.type !== 'step') continue;
    if (event.phase === 'end') {
      lastStepEnd = event.t;
      if (event.pauseAfter) ranges.push([event.t - event.pauseAfter, event.t]);
    }
    if (event.action !== 'pause') continue;
    if (event.phase === 'start') pauseStart = event.t;
    else if (pauseStart !== undefined) {
      ranges.push([pauseStart, event.t]);
      pauseStart = undefined;
    }
  }
  if (lastStepEnd !== undefined) ranges.push([lastStepEnd, end]);
  return ranges;
}
