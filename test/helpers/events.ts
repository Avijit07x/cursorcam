import type { LoggedEvent, RecordEvent } from '../../src/record/events.js';
import type { FrameRecord } from '../../src/record/frames.js';

export function at(t: number, event: RecordEvent): LoggedEvent {
  return { ...event, t, wall: t };
}

export function frameAt(
  index: number,
  time: number,
  extra: Partial<FrameRecord> = {},
): FrameRecord {
  return { index, at: time + 5, ts: time + 1_000_000, scrollX: 0, scrollY: 0, tab: 0, ...extra };
}

export const box = (x: number, y: number, width = 100, height = 40) => ({ x, y, width, height });
