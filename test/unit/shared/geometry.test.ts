import { describe, expect, it } from 'vitest';
import {
  centerOf,
  clamp,
  distance,
  easeInOutCubic,
  intersect,
  lerp,
  lerpPoint,
  roundRect,
  roundTo,
} from '../../../src/shared/geometry.js';

describe('geometry', () => {
  it('measures points and rectangles', () => {
    expect(centerOf({ x: 10, y: 20, width: 100, height: 40 })).toEqual({ x: 60, y: 40 });
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerpPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundRect({ x: 1.4, y: 1.6, width: 9.5, height: 2.2 })).toEqual({
      x: 1,
      y: 2,
      width: 10,
      height: 2,
    });
  });

  it('intersects rectangles', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    expect(intersect(a, { x: 50, y: 60, width: 100, height: 100 })).toEqual({
      x: 50,
      y: 60,
      width: 50,
      height: 40,
    });
    expect(intersect(a, { x: 200, y: 0, width: 10, height: 10 })).toBeUndefined();
  });

  it('eases in and out between 0 and 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  });
});
