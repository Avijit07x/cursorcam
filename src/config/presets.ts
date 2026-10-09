import { z } from 'zod';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import presetsFile from './presets.json' with { type: 'json' };

const PresetSchema = z.strictObject({
  width: z.int().positive(),
  height: z.int().positive(),
  fps: z.int().positive(),
  bitrate: z.int().positive(),
  minSeconds: z.number().positive().optional(),
  maxSeconds: z.number().positive().optional(),
  maxBytes: z.int().positive().optional(),
});

const PresetsFileSchema = z.strictObject({
  checked: z.iso.date(),
  presets: z.record(z.string(), PresetSchema),
});

export type Preset = z.output<typeof PresetSchema>;
export type VideoFormat = 'landscape' | 'square' | 'vertical';

export const DEFAULT_PRESET = 'default';
const PRESETS = PresetsFileSchema.parse(presetsFile);

export const PRESET_NAMES: readonly string[] = Object.keys(PRESETS.presets);

export function presetsCheckedOn(): string {
  return PRESETS.checked;
}

export function findPreset(name: string = DEFAULT_PRESET): Preset {
  const preset = PRESETS.presets[name];
  if (!preset) {
    throw new CursorCamError(`There is no preset named "${name}".`, {
      exitCode: ExitCode.BadInput,
      hint: `Presets: ${PRESET_NAMES.join(', ')}.`,
    });
  }
  return preset;
}

export function frameSizeFor(
  preset: Preset,
  format: VideoFormat,
): { width: number; height: number } {
  const short = Math.min(preset.width, preset.height);
  const long = Math.max(preset.width, preset.height);
  switch (format) {
    case 'landscape':
      return { width: long, height: short };
    case 'square':
      return { width: short, height: short };
    case 'vertical':
      return { width: short, height: long };
  }
}
