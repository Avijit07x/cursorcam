import { join } from 'node:path';
import { InvalidArgumentError } from 'commander';
import type { BrowserSession } from '../browser/session.js';
import { PRESET_NAMES } from '../config/presets.js';
import { loadStyle, type Style } from '../config/style.js';
import { parseSize } from '../render/fit.js';
import { renderVideo, type RenderOutcome } from '../render/renderer.js';
import type { RunFile } from '../runs/dirs.js';
import { writeJsonAtomic } from '../runs/files.js';
import type { StatusFile } from '../runs/status.js';
import { formatBytes, formatSeconds } from '../shared/format.js';
import { roundTo } from '../shared/geometry.js';
import { removeDir } from '../system/cleanup.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';

export interface RenderOptions {
  readonly for?: string;
  readonly maxSize?: number;
  readonly style?: string;
  readonly format?: Style['format'];
  readonly clean?: boolean;
}

const STYLE_FILE = 'style.json';
const FORMATS: readonly Style['format'][] = ['landscape', 'square', 'vertical'];
const PROGRESS_DIGITS = 2;
const MS_PER_SECOND = 1000;

export function parsePreset(value: string): string {
  if (!PRESET_NAMES.includes(value)) {
    throw new InvalidArgumentError(`Use one of: ${PRESET_NAMES.join(', ')}.`);
  }
  return value;
}

export function parseFormat(value: string): Style['format'] {
  const format = FORMATS.find((candidate) => candidate === value);
  if (!format) throw new InvalidArgumentError(`Use one of: ${FORMATS.join(', ')}.`);
  return format;
}

export function parseMaxSize(value: string): number {
  try {
    return parseSize(value);
  } catch {
    throw new InvalidArgumentError('Use a size like 10MB or 500KB.');
  }
}

export async function renderRun(
  outDir: string,
  run: RunFile,
  options: RenderOptions,
  context: { paths: AppPaths; lifecycle: Lifecycle; status: StatusFile; session?: BrowserSession },
): Promise<RenderOutcome> {
  const loaded = await loadStyle(options.style);
  const style: Style = options.format ? { ...loaded, format: options.format } : loaded;
  await context.status.update({ state: 'rendering', progress: 0 });
  const outcome = await renderVideo({
    outDir,
    run,
    style,
    presetName: options.for,
    maxBytes: options.maxSize,
    paths: context.paths,
    lifecycle: context.lifecycle,
    session: context.session,
    onProgress: (progress) =>
      void context.status.update({
        state: 'rendering',
        progress: roundTo(progress.done / Math.max(progress.total, 1), PROGRESS_DIGITS),
      }),
  });
  await writeJsonAtomic(join(outDir, STYLE_FILE), style);
  if (options.clean) await removeDir(run.cacheDir);
  return outcome;
}

export function describeVideo(outcome: RenderOutcome): string {
  const { facts, job } = outcome;
  return [
    `Video: ${outcome.file} (${formatBytes(facts.bytes)}, ${formatSeconds(facts.seconds * MS_PER_SECOND)}, ${facts.width}×${facts.height} ${job.output.fps} fps)`,
    `Poster: ${outcome.poster}`,
  ].join('\n');
}
