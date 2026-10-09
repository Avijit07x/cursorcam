import { describe, expect, it } from 'vitest';
import { formatBytes, formatSeconds } from '../../../src/shared/format.js';

describe('formatBytes', () => {
  it.each([
    [120, '1 KB'],
    [412_345, '412 KB'],
    [5_430_000, '5.4 MB'],
    [20_000_000, '20.0 MB'],
    [31_400_000_000, '31.4 GB'],
  ])('formats %d bytes as %s, in the decimal units platforms use', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('formatSeconds', () => {
  it('shows seconds with one decimal', () => {
    expect(formatSeconds(10_540)).toBe('10.5 s');
  });
});
