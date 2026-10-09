import type { LoggedEvent } from '../record/events.js';
import { clamp, intersect, type Rect, type Size } from '../shared/geometry.js';
import type { FramePicker, TimeMap } from './timeline.js';

export interface StillMoment {
  readonly name: string;
  readonly frame: number;
}

export interface CropMoment {
  readonly name: string;
  readonly source: number;
  readonly rect: Rect;
}

export interface Moments {
  readonly stills: readonly StillMoment[];
  readonly crops: readonly CropMoment[];
}

const AFTER_TYPING_MS = 350;
const CROP_PADDING_PX = 48;
const MS_PER_SECOND = 1000;
const NAME_DIGITS = 2;

export interface MomentInput {
  readonly events: readonly LoggedEvent[];
  readonly timeMap: TimeMap;
  readonly picker: FramePicker;
  readonly fps: number;
  readonly frameCount: number;
  readonly viewport: Size;
  readonly count: number;
}

export function pickMoments(input: MomentInput): Moments {
  const { events, timeMap, fps, frameCount } = input;
  const frameAt = (sourceTime: number) =>
    clamp(Math.round((timeMap.outputAt(sourceTime) * fps) / MS_PER_SECOND), 0, frameCount - 1);
  const stepEnds = events.filter((event) => event.type === 'step' && event.phase === 'end');
  const chosen = spread(stepEnds, input.count);
  const stills = chosen.map((event, position) => ({
    name: `still-${pad(position + 1)}-step-${pad(stepNumber(event))}.png`,
    frame: frameAt(event.t),
  }));
  if (stills.length === 0) stills.push({ name: `still-${pad(1)}.png`, frame: frameCount - 1 });

  const latestByStep = new Map<number, Omit<CropMoment, 'name'>>();
  let step = 0;
  for (const event of events) {
    if (event.type === 'step' && event.phase === 'start') step = event.index + 1;
    const shot = cropShotOf(event);
    if (!shot) continue;
    const target = shot.rect;
    const padded = intersect(
      {
        x: target.x - CROP_PADDING_PX,
        y: target.y - CROP_PADDING_PX,
        width: target.width + 2 * CROP_PADDING_PX,
        height: target.height + 2 * CROP_PADDING_PX,
      },
      { x: 0, y: 0, ...input.viewport },
    );
    if (!padded) continue;
    latestByStep.set(step, {
      source: input.picker.at(shot.time).index,
      rect: padded,
    });
  }
  const crops = [...latestByStep].map(([stepIndex, crop], position) => ({
    name: `crop-${pad(position + 1)}-step-${pad(stepIndex)}.png`,
    ...crop,
  }));
  return { stills, crops };
}

function cropShotOf(event: LoggedEvent): { rect: Rect; time: number } | undefined {
  if (event.type === 'click' || event.type === 'tap' || event.type === 'select') {
    return { rect: event.target, time: event.t };
  }
  if (event.type === 'typing' && event.phase === 'end') {
    return { rect: event.target, time: event.t + AFTER_TYPING_MS };
  }
  return undefined;
}

function stepNumber(event: LoggedEvent): number {
  return event.type === 'step' ? event.index + 1 : 0;
}

function spread<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  return Array.from({ length: count }, (_, position) => {
    const index = Math.round((position * (items.length - 1)) / Math.max(count - 1, 1));
    return items[index];
  }).filter((item): item is T => item !== undefined);
}

function pad(value: number): string {
  return String(value).padStart(NAME_DIGITS, '0');
}
