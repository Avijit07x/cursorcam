import { describe, expect, it } from 'vitest';
import {
  findPreset,
  frameSizeFor,
  PRESET_NAMES,
  presetsCheckedOn,
} from '../../../src/config/presets.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

describe('presets', () => {
  it('lists the platforms with a check date', () => {
    expect(PRESET_NAMES).toEqual(['default', 'youtube', 'x', 'linkedin', 'discord']);
    expect(presetsCheckedOn()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the published platform limits', () => {
    expect(findPreset()).toMatchObject({ width: 1920, height: 1080, fps: 60, bitrate: 8_000_000 });
    expect(findPreset('youtube')).toMatchObject({ fps: 60, bitrate: 12_000_000 });
    expect(findPreset('x')).toMatchObject({ fps: 30, maxSeconds: 140, maxBytes: 512_000_000 });
    expect(findPreset('linkedin')).toMatchObject({
      minSeconds: 3,
      maxSeconds: 900,
      maxBytes: 5_000_000_000,
    });
    expect(findPreset('discord')).toMatchObject({ width: 1280, height: 720, maxBytes: 20_000_000 });
  });

  it('refuses unknown presets', () => {
    expect(() => findPreset('tiktok')).toThrow(
      expect.objectContaining({ exitCode: ExitCode.BadInput }),
    );
  });

  it('turns a preset into square and vertical sizes', () => {
    const preset = findPreset('discord');
    expect(frameSizeFor(preset, 'landscape')).toEqual({ width: 1280, height: 720 });
    expect(frameSizeFor(preset, 'square')).toEqual({ width: 720, height: 720 });
    expect(frameSizeFor(preset, 'vertical')).toEqual({ width: 720, height: 1280 });
  });
});
