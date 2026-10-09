import type { Preset } from '../config/presets.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

const SIZE_SAFETY = 0.92;
const CONTAINER_BYTES = 64 * 1024;
const MIN_BITRATE = 400_000;
const BITS_PER_BYTE = 8;
const SIZE_UNITS: Readonly<Record<string, number>> = {
  '': 1,
  b: 1,
  k: 1e3,
  kb: 1e3,
  m: 1e6,
  mb: 1e6,
  g: 1e9,
  gb: 1e9,
};
const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*([kmg]?b?)$/i;

export function parseSize(text: string): number {
  const match = SIZE_PATTERN.exec(text.trim());
  const unit = SIZE_UNITS[(match?.[2] ?? '').toLowerCase()];
  const value = Number(match?.[1]);
  if (!match || unit === undefined || !Number.isFinite(value) || value <= 0) {
    throw new CursorCamError(`"${text}" is not a size. Use a size like 10MB or 500KB.`, {
      exitCode: ExitCode.BadInput,
    });
  }
  return Math.floor(value * unit);
}

export function sizeLimit(preset: Preset, maxBytes: number | undefined): number | undefined {
  const limits = [preset.maxBytes, maxBytes].filter(
    (limit): limit is number => limit !== undefined,
  );
  return limits.length > 0 ? Math.min(...limits) : undefined;
}

export function bitrateFor(preset: Preset, seconds: number, limit: number | undefined): number {
  if (limit === undefined) return preset.bitrate;
  const budget = ((limit * SIZE_SAFETY - CONTAINER_BYTES) * BITS_PER_BYTE) / Math.max(seconds, 1);
  return Math.max(MIN_BITRATE, Math.min(preset.bitrate, Math.floor(budget)));
}

export function retryBitrate(previous: number, actualBytes: number, limit: number): number {
  return Math.max(MIN_BITRATE, Math.floor((previous * limit * SIZE_SAFETY) / actualBytes));
}

export function isBelowMinimumBitrate(bitrate: number): boolean {
  return bitrate <= MIN_BITRATE;
}

export function assertDurationFits(presetName: string, preset: Preset, seconds: number): void {
  const shown = `${seconds.toFixed(1)} s`;
  if (preset.maxSeconds !== undefined && seconds > preset.maxSeconds) {
    throw new CursorCamError(
      `The video is ${shown}, but ${presetName} allows at most ${preset.maxSeconds} s.`,
      {
        exitCode: ExitCode.BadInput,
        hint: 'Remove or shorten steps, or turn on idle trimming, then render again.',
      },
    );
  }
  if (preset.minSeconds !== undefined && seconds < preset.minSeconds) {
    throw new CursorCamError(
      `The video is ${shown}, but ${presetName} needs at least ${preset.minSeconds} s.`,
      {
        exitCode: ExitCode.BadInput,
        hint: 'Add a pause step at the end, then record again.',
      },
    );
  }
}
