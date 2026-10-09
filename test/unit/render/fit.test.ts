import { describe, expect, it } from 'vitest';
import { findPreset } from '../../../src/config/presets.js';
import {
  assertDurationFits,
  bitrateFor,
  isBelowMinimumBitrate,
  parseSize,
  retryBitrate,
  sizeLimit,
} from '../../../src/render/fit.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

describe('size fitting', () => {
  it('reads sizes in decimal units', () => {
    expect(parseSize('10MB')).toBe(10_000_000);
    expect(parseSize('1.5 gb')).toBe(1_500_000_000);
    expect(parseSize('500k')).toBe(500_000);
    expect(parseSize('2048')).toBe(2048);
    for (const bad of ['', 'ten MB', '-1MB', '0', '5TB'])
      expect(() => parseSize(bad)).toThrow('is not a size');
  });

  it('uses the tighter of the preset and the user limit', () => {
    expect(sizeLimit(findPreset('discord'), undefined)).toBe(20_000_000);
    expect(sizeLimit(findPreset('discord'), 10_000_000)).toBe(10_000_000);
    expect(sizeLimit(findPreset('default'), undefined)).toBeUndefined();
  });

  it('lowers the bitrate to fit the limit, but never below a floor', () => {
    const preset = findPreset('discord');
    expect(bitrateFor(preset, 30, undefined)).toBe(preset.bitrate);
    expect(bitrateFor(preset, 30, 20_000_000)).toBe(preset.bitrate);
    expect(bitrateFor(preset, 120, 20_000_000)).toBe(1_222_297);
    expect(bitrateFor(preset, 600, 1_000_000)).toBe(400_000);
    expect(isBelowMinimumBitrate(400_000)).toBe(true);
  });

  it('retries with a bitrate scaled by how much the file missed', () => {
    expect(retryBitrate(4_000_000, 25_000_000, 20_000_000)).toBe(2_944_000);
  });

  it('checks platform length rules', () => {
    expect(() => assertDurationFits('x', findPreset('x'), 150)).toThrow(
      expect.objectContaining({
        exitCode: ExitCode.BadInput,
        message: 'The video is 150.0 s, but x allows at most 140 s.',
      }),
    );
    expect(() => assertDurationFits('linkedin', findPreset('linkedin'), 2)).toThrow(
      'needs at least 3 s',
    );
    expect(() => assertDurationFits('default', findPreset('default'), 9_999)).not.toThrow();
  });
});
