import { describe, expect, it } from 'vitest';
import { jpegSize } from '../../../src/shared/jpeg.js';

function segment(marker: number, body: number[]): number[] {
  const length = body.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...body];
}

function jpegHeader(width: number, height: number, startOfFrame = 0xc0): Buffer {
  const app0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const frame = segment(startOfFrame, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3]);
  return Buffer.from([0xff, 0xd8, ...app0, ...frame]);
}

describe('jpegSize', () => {
  it('reads the size from a baseline frame header after other segments', () => {
    expect(jpegSize(jpegHeader(2560, 1600))).toEqual({ width: 2560, height: 1600 });
  });

  it('reads progressive frame headers', () => {
    expect(jpegSize(jpegHeader(1170, 2532, 0xc2))).toEqual({ width: 1170, height: 2532 });
  });

  it('returns undefined for data that is not a JPEG', () => {
    expect(jpegSize(Buffer.from('not a jpeg at all, just text'))).toBeUndefined();
  });
});
