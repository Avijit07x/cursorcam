import { describe, expect, it } from 'vitest';
import {
  buildTimeMap,
  correctFrameTimes,
  FramePicker,
  LOAD_SETTLE_MS,
  loadingRanges,
} from '../../../src/render/timeline.js';
import { at, frameAt } from '../../helpers/events.js';

describe('frame times', () => {
  it('moves browser times onto the recorder clock using the fastest arrival', () => {
    const frames = correctFrameTimes([
      { index: 1, at: 110, ts: 5_000, scrollX: 0, scrollY: 0, tab: 0 },
      { index: 2, at: 140, ts: 5_020, scrollX: 0, scrollY: 0, tab: 0 },
    ]);

    expect(frames.map((frame) => frame.time)).toEqual([110, 130]);
  });

  it('finds page loads, including ones that never finish', () => {
    const events = [
      at(100, { type: 'navigate', phase: 'start', url: 'a' }),
      at(300, { type: 'navigate', phase: 'load', url: 'a' }),
      at(1000, { type: 'navigate', phase: 'start', url: 'b' }),
    ];

    expect(loadingRanges(events)).toEqual([
      [100, 300 + LOAD_SETTLE_MS],
      [1000, 5000],
    ]);
  });
});

describe('FramePicker', () => {
  const frames = correctFrameTimes([
    frameAt(1, 0),
    frameAt(2, 200),
    frameAt(3, 260),
    frameAt(4, 500),
  ]);

  it('shows the latest frame, and holds the last good one while a page loads', () => {
    const picker = new FramePicker(frames, [[150, 400]]);

    expect(picker.at(100).index).toBe(1);
    expect(picker.at(300).index).toBe(1);
    expect(picker.at(401).index).toBe(3);
    expect(picker.at(600).index).toBe(4);
    expect(picker.at(-50).index).toBe(1);
  });

  it('drops late frames from a tab that was left', () => {
    const tabbed = correctFrameTimes([
      frameAt(1, 0),
      frameAt(2, 100, { tab: 1 }),
      frameAt(3, 120),
      frameAt(4, 200, { tab: 1 }),
    ]);
    const picker = new FramePicker(tabbed, []);

    expect(picker.at(150).index).toBe(2);
    expect(picker.at(250).index).toBe(4);
  });
});

describe('buildTimeMap', () => {
  const options = { trimIdle: true, dialogs: true };

  it('plays busy time at normal speed and squeezes idle waits', () => {
    const events = [at(0, { type: 'key', key: 'a' }), at(10_000, { type: 'key', key: 'b' })];
    const map = buildTimeMap(events, 0, 11_000, options);

    expect(map.duration).toBeLessThan(2_500);
    expect(map.sourceAt(0)).toBe(0);
    expect(map.sourceAt(map.duration)).toBe(11_000);
    expect(map.outputAt(map.sourceAt(200))).toBeCloseTo(200);
  });

  it('keeps pauses, pauses after steps and the ending at normal speed', () => {
    const events = [
      at(0, { type: 'step', phase: 'start', index: 0, action: 'pause' }),
      at(4_000, { type: 'step', phase: 'end', index: 0, action: 'pause' }),
      at(4_100, { type: 'step', phase: 'start', index: 1, action: 'click' }),
      at(4_200, {
        type: 'click',
        x: 1,
        y: 1,
        count: 1,
        target: { x: 0, y: 0, width: 2, height: 2 },
      }),
      at(8_200, { type: 'step', phase: 'end', index: 1, action: 'click', pauseAfter: 3_900 }),
    ];

    expect(buildTimeMap(events, 0, 10_000, options).duration).toBe(10_000);
  });

  it('holds the picture while a dialog card shows, only when dialogs are drawn', () => {
    const events = [at(500, { type: 'dialog', kind: 'alert', message: 'Hi', accepted: true })];
    const withCards = buildTimeMap(events, 0, 1_000, options);
    const without = buildTimeMap(events, 0, 1_000, { trimIdle: false, dialogs: false });

    expect(withCards.duration).toBe(2_400);
    expect(withCards.segmentAt(600)?.dialog).toBe(0);
    expect(withCards.sourceAt(1_000)).toBe(500);
    expect(without.duration).toBe(1_000);
  });

  it('squeezes the time spent waiting for an answer', () => {
    const events = [
      at(0, { type: 'ask', phase: 'wait', label: 'code' }),
      at(60_000, { type: 'ask', phase: 'done', label: 'code' }),
      at(60_100, { type: 'key', key: 'a' }),
    ];

    expect(buildTimeMap(events, 0, 60_200, options).duration).toBeLessThan(2_000);
  });

  it('keeps a pause after a step and still squeezes the long wait around it', () => {
    const events = [
      at(0, { type: 'key', key: 'a' }),
      at(1_000, { type: 'step', phase: 'end', index: 0, action: 'waitFor', pauseAfter: 500 }),
      at(1_000, { type: 'ask', phase: 'wait', label: 'code' }),
      at(60_000, { type: 'ask', phase: 'done', label: 'code' }),
      at(60_100, { type: 'key', key: 'b' }),
      at(60_150, { type: 'step', phase: 'end', index: 1, action: 'ask' }),
    ];
    const map = buildTimeMap(events, 0, 60_200, options);

    expect(map.duration).toBeLessThan(3_000);
    expect(map.outputAt(1_000) - map.outputAt(500)).toBeCloseTo(500);
  });
});
