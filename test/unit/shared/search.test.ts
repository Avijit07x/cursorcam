import { describe, expect, it } from 'vitest';
import { lastIndexAtOrBefore } from '../../../src/shared/search.js';

describe('lastIndexAtOrBefore', () => {
  const times = [10, 20, 20, 40];
  const find = (value: number) => lastIndexAtOrBefore(times, value, (time) => time);

  it('finds the last item at or before a value', () => {
    expect(find(5)).toBe(-1);
    expect(find(10)).toBe(0);
    expect(find(25)).toBe(2);
    expect(find(99)).toBe(3);
    expect(lastIndexAtOrBefore([], 1, (time: number) => time)).toBe(-1);
  });
});
