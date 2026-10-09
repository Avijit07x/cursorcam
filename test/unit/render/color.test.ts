import { describe, expect, it } from 'vitest';
import { i420Size, LIMITED_BT709, rgbaToI420 } from '../../../src/render/page/color.js';

function convertSolid(red: number, green: number, blue: number): [number, number, number] {
  const width = 4;
  const height = 2;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    rgba.set([red, green, blue, 255], index * 4);
  const out = new Uint8Array(i420Size(width, height));
  rgbaToI420(rgba, width, height, out);
  return [out[0] ?? -1, out[width * height] ?? -1, out[width * height + 2] ?? -1];
}

describe('limited-range BT.709 conversion', () => {
  it('maps white, black and grey to the video range', () => {
    expect(convertSolid(255, 255, 255)).toEqual([235, 128, 128]);
    expect(convertSolid(0, 0, 0)).toEqual([16, 128, 128]);
    expect(convertSolid(128, 128, 128)).toEqual([126, 128, 128]);
  });

  it('uses the BT.709 weights for colors', () => {
    expect(convertSolid(255, 0, 0)).toEqual([63, 102, 240]);
    expect(convertSolid(0, 255, 0)).toEqual([173, 42, 26]);
    expect(convertSolid(0, 0, 255)).toEqual([32, 240, 118]);
  });

  it('averages each 2×2 block for color and keeps every pixel for brightness', () => {
    const rgba = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
    ]);
    const out = new Uint8Array(i420Size(2, 2));
    rgbaToI420(rgba, 2, 2, out);

    expect([...out]).toEqual([235, 16, 235, 16, 128, 128]);
  });

  it('describes the tags written into the file', () => {
    expect(LIMITED_BT709).toEqual({
      primaries: 'bt709',
      transfer: 'bt709',
      matrix: 'bt709',
      fullRange: false,
    });
    expect(i420Size(1920, 1080)).toBe(1920 * 1080 * 1.5);
  });
});
