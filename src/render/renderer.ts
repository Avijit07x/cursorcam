import { access, open, rename, rm, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { IDENTITIES } from '../browser/identity.js';
import { launchBrowser } from '../browser/launch.js';
import type { BrowserSession } from '../browser/session.js';
import {
  DEFAULT_PRESET,
  findPreset,
  frameSizeFor,
  type Preset,
  type VideoFormat,
} from '../config/presets.js';
import type { Style } from '../config/style.js';
import type { LoggedEvent } from '../record/events.js';
import {
  FRAMES_DIR,
  FRAMES_INDEX_FILE,
  frameFileName,
  type FrameRecord,
} from '../record/frames.js';
import { EVENTS_FILE, type RunFile } from '../runs/dirs.js';
import { readJsonLines } from '../runs/files.js';
import { readRecordingMeta } from '../runs/meta.js';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { formatBytes } from '../shared/format.js';
import { clamp } from '../shared/geometry.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';
import {
  assertDurationFits,
  bitrateFor,
  isBelowMinimumBitrate,
  retryBitrate,
  sizeLimit,
} from './fit.js';
import type {
  DrawFrame,
  RenderApi,
  RenderJob,
  RenderProgress,
  RenderSummary,
  StillRequest,
} from './job.js';
import { planJob, type PlannedJob, type RecordingData } from './plan.js';
import { startRenderServer, type RenderServer } from './server.js';
import { verifyVideo, type VideoFacts } from './verify.js';

const MAX_ATTEMPTS = 3;
const MAX_WORKERS = 4;
const SPARE_CORES = 2;
const PART_SUFFIX = '.part';
const DISK_FULL_CODE = 'ENOSPC';

export interface RenderRequest {
  readonly outDir: string;
  readonly run: RunFile;
  readonly style: Style;
  readonly presetName?: string | undefined;
  readonly maxBytes?: number | undefined;
  readonly paths: AppPaths;
  readonly lifecycle: Lifecycle;
  readonly session?: BrowserSession | undefined;
  readonly onProgress?: (progress: RenderProgress) => void;
}

export interface RenderOutcome {
  readonly file: string;
  readonly poster: string;
  readonly facts: VideoFacts;
  readonly codec: RenderSummary['codec'];
  readonly warnings: readonly string[];
  readonly job: RenderJob;
}

export async function loadRecording(cacheDir: string): Promise<RecordingData> {
  const meta = await readRecordingMeta(cacheDir);
  const framesThere = await access(join(cacheDir, FRAMES_DIR)).then(
    () => true,
    () => false,
  );
  if (!framesThere) {
    throw new CursorCamError('The raw frames for this run are gone.', {
      exitCode: ExitCode.BadInput,
      hint: 'Frames are kept for 7 days, or until --clean. Record the steps again.',
    });
  }
  return {
    meta,
    frames: await readJsonLines<FrameRecord>(join(cacheDir, FRAMES_INDEX_FILE)),
    events: await readJsonLines<LoggedEvent>(join(cacheDir, EVENTS_FILE)),
  };
}

function outputName(kind: 'video' | 'poster', presetName: string, format: VideoFormat): string {
  const parts: string[] = [kind];
  if (presetName !== DEFAULT_PRESET) parts.push(presetName);
  if (format !== 'landscape') parts.push(format);
  return parts.join('-');
}

export function videoFileName(presetName: string, format: VideoFormat): string {
  return `${outputName('video', presetName, format)}.mp4`;
}

export function posterFileName(presetName: string, format: VideoFormat): string {
  return `${outputName('poster', presetName, format)}.jpg`;
}

export async function renderVideo(request: RenderRequest): Promise<RenderOutcome> {
  const presetName = request.presetName ?? DEFAULT_PRESET;
  const preset = findPreset(presetName);
  const recording = await loadRecording(request.run.cacheDir);
  assertFormatFits(request.style.format, recording.meta.identity);
  const limit = sizeLimit(preset, request.maxBytes);
  const file = join(request.outDir, videoFileName(presetName, request.style.format));
  const poster = join(request.outDir, posterFileName(presetName, request.style.format));

  const server = await startRenderServer({
    frameFile: (index) => join(request.run.cacheDir, FRAMES_DIR, frameFileName(index)),
    backgroundFile: backgroundFile(request.style),
    onStill: (_, data) => writeFile(poster, data),
    ...(request.onProgress ? { onProgress: request.onProgress } : {}),
  });
  request.lifecycle.add(() => server.close());

  const planned = planWith(recording, request.style, preset, preset.bitrate, server);
  assertDurationFits(presetName, preset, planned.seconds);
  const warnings: string[] = [];
  let bitrate = bitrateFor(preset, planned.seconds, limit);
  if (isBelowMinimumBitrate(bitrate))
    warnings.push('The size limit is tight for this length, so the video may look soft.');
  const session = request.session ?? (await openRenderBrowser(request));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const job: RenderJob = { ...planned.job, output: { ...planned.job.output, bitrate } };
    server.useJob(job);
    const part = `${file}${PART_SUFFIX}`;
    const output = await open(part, 'w');
    server.writeTo(output);
    let summary: RenderSummary;
    try {
      summary = await encode(session, server);
      await server.flushWrites();
    } catch (error) {
      await rm(part, { force: true });
      throw encodeError(error, server);
    } finally {
      server.writeTo(undefined);
      await output.close();
    }
    await rename(part, file);
    const { width, height, frameCount } = job.output;
    const facts = await verifyVideo(file, { width, height, frames: frameCount });
    if (summary.codec !== 'avc') {
      warnings.push(
        'This browser cannot make H.264, so the video uses VP9. Install Google Chrome for the widest support.',
      );
    }
    if (limit === undefined || facts.bytes <= limit) {
      await drawPoster(session, server, job.frames[0]);
      return { file, poster, facts, codec: summary.codec, warnings, job };
    }
    bitrate = retryBitrate(bitrate, facts.bytes, limit);
  }
  throw new CursorCamError(`Could not fit the video under ${formatBytes(limit ?? 0)}.`, {
    exitCode: ExitCode.EncodeFailed,
    hint: 'Shorten the steps, turn on idle trimming, or use a larger --max-size.',
  });
}

export async function renderStills(
  request: RenderRequest & { readonly count: number },
  onStill: (name: string, data: Buffer) => Promise<void>,
): Promise<number> {
  const preset = findPreset(request.presetName ?? DEFAULT_PRESET);
  const recording = await loadRecording(request.run.cacheDir);
  const server = await startRenderServer({
    frameFile: (index) => join(request.run.cacheDir, FRAMES_DIR, frameFileName(index)),
    backgroundFile: backgroundFile(request.style),
    onStill,
  });
  request.lifecycle.add(() => server.close());
  const planned = planWith(recording, request.style, preset, preset.bitrate, server, request.count);
  server.useJob(planned.job);
  const requests = stillRequests(planned);
  const session = request.session ?? (await openRenderBrowser(request));
  return drawStills(session, server, requests);
}

async function drawPoster(
  session: BrowserSession,
  server: RenderServer,
  frame: DrawFrame | undefined,
): Promise<void> {
  if (frame) await drawStills(session, server, [{ kind: 'poster', name: 'poster', frame }]);
}

async function drawStills(
  session: BrowserSession,
  server: RenderServer,
  requests: readonly StillRequest[],
): Promise<number> {
  const page = await session.newBackgroundPage();
  try {
    await page.goto(server.url);
    await page.waitForFunction(() => 'cursorCamStills' in window);
    return await session.guard(
      page.evaluate((list) => (window as unknown as RenderApi).cursorCamStills(list), requests),
    );
  } catch (error) {
    throw encodeError(error, server);
  } finally {
    await page.close().catch(() => undefined);
  }
}

function planWith(
  recording: RecordingData,
  style: Style,
  preset: Preset,
  bitrate: number,
  server: RenderServer,
  stillCount?: number,
): PlannedJob {
  return planJob({
    ...(stillCount === undefined ? {} : { stillCount }),
    recording,
    style,
    size: frameSizeFor(preset, style.format),
    fps: preset.fps,
    bitrate,
    workers: clamp(availableParallelism() - SPARE_CORES, 1, MAX_WORKERS),
    ...(typeof style.background === 'object' && 'image' in style.background
      ? { backgroundUrl: server.backgroundUrl }
      : {}),
  });
}

async function encode(session: BrowserSession, server: RenderServer): Promise<RenderSummary> {
  const page = await session.newBackgroundPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(server.url);
    await page.waitForFunction(() => 'cursorCamRender' in window);
    return await session.guard(
      page.evaluate(() => (window as unknown as RenderApi).cursorCamRender()),
    );
  } catch (error) {
    const detail = pageErrors[0];
    throw detail ? new Error(`${messageOf(error)} (${detail})`) : error;
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function openRenderBrowser(request: RenderRequest): Promise<BrowserSession> {
  const session = await launchBrowser({ identity: IDENTITIES.desktop, paths: request.paths });
  request.lifecycle.add(() => session.dispose());
  return session;
}

function encodeError(error: unknown, server: RenderServer): CursorCamError {
  if (error instanceof CursorCamError) return error;
  const failure = server.writeFailure();
  if ((failure as NodeJS.ErrnoException | undefined)?.code === DISK_FULL_CODE) {
    return new CursorCamError('The disk filled up while writing the video.', {
      exitCode: ExitCode.DiskFull,
      hint: 'Free some disk space, then render again. The recording is still there.',
      cause: failure,
    });
  }
  return new CursorCamError('Could not encode the video.', {
    exitCode: ExitCode.EncodeFailed,
    hint: 'Run cursorcam doctor to check the browser encoder.',
    cause: error,
  });
}

function assertFormatFits(format: VideoFormat, identity: 'desktop' | 'phone'): void {
  if (format === 'vertical' && identity !== 'phone') {
    throw new CursorCamError('Vertical videos need a phone recording.', {
      exitCode: ExitCode.BadInput,
      hint: 'Add "viewport": "phone" to the steps file and record again.',
    });
  }
}

function backgroundFile(style: Style): string | undefined {
  const background = style.background;
  return typeof background === 'object' && 'image' in background
    ? resolve(background.image)
    : undefined;
}

function stillRequests(planned: PlannedJob): StillRequest[] {
  const composites = planned.moments.stills.flatMap((still): StillRequest[] => {
    const frame = planned.job.frames[still.frame];
    return frame ? [{ kind: 'composite', name: still.name, frame }] : [];
  });
  const crops = planned.moments.crops.map((crop): StillRequest => ({
    kind: 'crop',
    name: crop.name,
    f: crop.source,
    rect: [crop.rect.x, crop.rect.y, crop.rect.width, crop.rect.height],
  }));
  return [...composites, ...crops];
}
