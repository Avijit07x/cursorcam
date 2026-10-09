import { describe, expect, it } from 'vitest';
import { moveDuration, pointOnPath } from '../../../src/record/mouse.js';
import { distance } from '../../../src/shared/geometry.js';

describe('cursor path', () => {
  const from = { x: 100, y: 100 };
  const to = { x: 700, y: 400 };

  it('starts and ends exactly on the points', () => {
    expect(pointOnPath(from, to, 0)).toEqual(from);
    expect(pointOnPath(from, to, 1)).toEqual(to);
  });

  it('bends gently away from the straight line', () => {
    const middle = pointOnPath(from, to, 0.5);
    const straight = { x: 400, y: 250 };
    const bend = distance(middle, straight);

    expect(bend).toBeGreaterThan(5);
    expect(bend).toBeLessThan(distance(from, to) * 0.1);
  });

  it('moves in small, even steps with no jumps', () => {
    const points = Array.from({ length: 41 }, (_, index) => pointOnPath(from, to, index / 40));
    const gaps = points.slice(1).map((point, index) => distance(point, points[index] ?? point));

    expect(Math.max(...gaps)).toBeLessThan(distance(from, to) / 10);
  });

  it('stays still for a zero-length move', () => {
    expect(pointOnPath(from, from, 0.5)).toEqual(from);
  });

  it('takes longer for longer moves, within limits', () => {
    expect(moveDuration(from, { x: 110, y: 100 })).toBe(280);
    expect(moveDuration(from, to)).toBeCloseTo(250 + distance(from, to) * 0.45);
    expect(moveDuration({ x: 0, y: 0 }, { x: 5000, y: 0 })).toBe(900);
    expect(moveDuration({ x: 0, y: 0 }, { x: 5000, y: 0 }, 2)).toBe(450);
  });
});
