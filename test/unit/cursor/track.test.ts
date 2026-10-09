import { describe, expect, it } from 'vitest';
import { CursorTrack } from '../../../src/cursor/track.js';
import { at, box } from '../../helpers/events.js';

describe('CursorTrack', () => {
  const events = [
    at(100, { type: 'cursor', x: 0, y: 0 }),
    at(116, { type: 'cursor', x: 16, y: 8 }),
    at(500, { type: 'cursor', x: 100, y: 100 }),
    at(600, { type: 'button', phase: 'down', x: 100, y: 100 }),
    at(670, { type: 'button', phase: 'up', x: 100, y: 100 }),
    at(670, { type: 'click', x: 100, y: 100, count: 1, target: box(80, 80) }),
  ];

  it('hides the cursor until it first moves, then smooths between move samples', () => {
    const track = new CursorTrack(events, false);

    expect(track.positionAt(50)).toBeUndefined();
    expect(track.positionAt(108)).toEqual({ x: 8, y: 4 });
    expect(track.positionAt(300)).toEqual({ x: 16, y: 8 });
    expect(track.positionAt(900)).toEqual({ x: 100, y: 100 });
  });

  it('knows when the button is down and draws a fading ripple after a click', () => {
    const track = new CursorTrack(events, false);

    expect(track.pressedAt(650)).toBe(true);
    expect(track.pressedAt(700)).toBe(false);
    expect(track.ripplesAt(670)).toEqual([{ x: 100, y: 100, progress: 0 }]);
    expect(track.ripplesAt(895)?.[0]?.progress).toBeCloseTo(0.5);
    expect(track.ripplesAt(2_000)).toEqual([]);
  });

  it('shows a touch dot only around taps on phones', () => {
    const track = new CursorTrack(
      [at(1_000, { type: 'tap', x: 40, y: 60, target: box(0, 0) })],
      true,
    );

    expect(track.positionAt(500)).toBeUndefined();
    expect(track.positionAt(950)).toEqual({ x: 40, y: 60 });
    expect(track.positionAt(1_300)).toEqual({ x: 40, y: 60 });
    expect(track.positionAt(1_500)).toBeUndefined();
  });
});
