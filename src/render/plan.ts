import { CameraPath, cropFor } from '../camera/plan.js';
import {
  DEFAULT_GRADIENT_ANGLE,
  GRADIENTS,
  type BackgroundSpec,
  type Style,
} from '../config/style.js';
import { CursorTrack } from '../cursor/track.js';
import type { LoggedEvent } from '../record/events.js';
import type { FrameRecord } from '../record/frames.js';
import type { RecordingMeta } from '../runs/meta.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { roundTo, type Point, type Size } from '../shared/geometry.js';
import type { DrawFrame, JobBackground, RenderJob } from './job.js';
import { computeLayout } from './layout.js';
import { pickMoments, type Moments } from './moments.js';
import {
  buildTimeMap,
  correctFrameTimes,
  FramePicker,
  LOAD_SETTLE_MS,
  loadingRanges,
} from './timeline.js';

export interface RecordingData {
  readonly meta: RecordingMeta;
  readonly frames: readonly FrameRecord[];
  readonly events: readonly LoggedEvent[];
}

export interface JobRequest {
  readonly stillCount?: number;
  readonly recording: RecordingData;
  readonly style: Style;
  readonly size: Size;
  readonly fps: number;
  readonly bitrate: number;
  readonly workers: number;
  readonly backgroundUrl?: string;
}

export interface PlannedJob {
  readonly job: RenderJob;
  readonly seconds: number;
  readonly moments: Moments;
}

const MS_PER_SECOND = 1000;
const DEFAULT_STILLS = 6;
const KEY_FRAME_SECONDS = 2;
const MIN_LENGTH_MS = 500;
const COORDINATE_DIGITS = 2;
const PROTOCOL_PREFIX = /^https?:\/\//;
const TRAILING_SLASH = /\/$/;

export function planJob(request: JobRequest): PlannedJob {
  const { recording, style, size, fps } = request;
  const { meta, events } = recording;
  const picker = new FramePicker(correctFrameTimes(recording.frames), loadingRanges(events));
  const first = picker.first;
  if (!first) {
    throw new CursorCamError('The recording has no video frames.', {
      exitCode: ExitCode.EncodeFailed,
      hint: 'Record the steps again.',
    });
  }
  const start = first.time;
  const end = Math.max(meta.durationMs, start + MIN_LENGTH_MS);
  const timeMap = buildTimeMap(events, start, end, {
    trimIdle: style.trimIdle,
    dialogs: style.dialogs,
  });
  const touch = meta.identity === 'phone';
  const cursor = new CursorTrack(events, touch);
  const scrollAt = (time: number): Point => {
    const frame = picker.at(time);
    return { x: frame.scrollX, y: frame.scrollY };
  };
  const camera = new CameraPath({
    events,
    viewport: meta.viewport,
    start,
    end,
    scrollAt,
    cursorAt: (time) => cursor.positionAt(time),
    enabled: style.zoom.enabled,
    maxZoom: style.zoom.max,
    holdMs: style.zoom.hold,
  });
  const urls = urlTimeline(events, meta.url, style.urlBar);

  const frameCount = Math.max(1, Math.ceil((timeMap.duration * fps) / MS_PER_SECOND));
  const frames: DrawFrame[] = [];
  for (let index = 0; index < frameCount; index += 1) {
    const outTime = (index * MS_PER_SECOND) / fps;
    const sourceTime = timeMap.sourceAt(outTime);
    const frame = picker.at(sourceTime);
    const crop = cropFor(
      camera.at(sourceTime),
      { x: frame.scrollX, y: frame.scrollY },
      meta.viewport,
    );
    const draw: DrawFrame = {
      f: frame.index,
      crop: [round(crop.x), round(crop.y), round(crop.width), round(crop.height)],
      ...cursorState(cursor, sourceTime, style),
      ...dialogState(timeMap.segmentAt(outTime)?.dialog),
      ...urlState(urls, sourceTime),
    };
    frames.push(draw);
  }

  const job: RenderJob = {
    output: {
      width: size.width,
      height: size.height,
      fps,
      bitrate: request.bitrate,
      frameCount,
      keyFrameSeconds: KEY_FRAME_SECONDS,
    },
    source: { width: meta.viewport.width, height: meta.viewport.height, scale: meta.scale },
    layout: computeLayout(size, meta.viewport, style),
    background: jobBackground(style.background, request.backgroundUrl),
    cursor: style.cursor.show ? { kind: touch ? 'touch' : 'arrow', size: style.cursor.size } : null,
    dialogs: events.flatMap((event) =>
      event.type === 'dialog' ? [{ kind: event.kind, message: event.message }] : [],
    ),
    urls: urls.texts,
    frames,
    workers: request.workers,
  };
  const moments = pickMoments({
    events,
    timeMap,
    picker,
    fps,
    frameCount,
    viewport: meta.viewport,
    count: request.stillCount ?? DEFAULT_STILLS,
  });
  return { job, seconds: frameCount / fps, moments };
}

interface UrlTimeline {
  readonly texts: string[];
  readonly changes: { readonly time: number; readonly index: number }[];
}

function urlTimeline(
  events: readonly LoggedEvent[],
  firstUrl: string,
  setting: string | false | undefined,
): UrlTimeline {
  if (setting === false) return { texts: [], changes: [] };
  if (setting !== undefined) return { texts: [setting], changes: [{ time: -Infinity, index: 0 }] };
  const texts: string[] = [];
  const changes: { time: number; index: number }[] = [];
  const add = (time: number, url: string) => {
    const text = url.replace(PROTOCOL_PREFIX, '').replace(TRAILING_SLASH, '');
    let index = texts.indexOf(text);
    if (index === -1) index = texts.push(text) - 1;
    changes.push({ time, index });
  };
  add(-Infinity, firstUrl);
  for (const event of events) {
    if ((event.type === 'navigate' && event.phase === 'load') || event.type === 'tab') {
      add(event.t + LOAD_SETTLE_MS, event.url);
    }
  }
  return { texts, changes };
}

function urlState(urls: UrlTimeline, time: number): Pick<DrawFrame, 'url'> {
  const change = urls.changes.findLast((candidate) => candidate.time <= time);
  return change ? { url: change.index } : {};
}

function cursorState(
  track: CursorTrack,
  time: number,
  style: Style,
): Pick<DrawFrame, 'cursor' | 'ripples'> {
  if (!style.cursor.show) return {};
  const position = track.positionAt(time);
  const ripples = style.cursor.ripple
    ? track
        .ripplesAt(time)
        .map((ripple) => [round(ripple.x), round(ripple.y), round(ripple.progress)] as const)
    : [];
  return {
    ...(position
      ? { cursor: [round(position.x), round(position.y), track.pressedAt(time) ? 1 : 0] as const }
      : {}),
    ...(ripples.length > 0 ? { ripples } : {}),
  };
}

function dialogState(dialog: number | undefined): Pick<DrawFrame, 'dialog'> {
  return dialog === undefined ? {} : { dialog };
}

function jobBackground(background: BackgroundSpec, imageUrl: string | undefined): JobBackground {
  if (typeof background === 'string') {
    if (background.startsWith('#')) return { kind: 'solid', color: background };
    const [from, to] = GRADIENTS[background as keyof typeof GRADIENTS];
    return { kind: 'gradient', from, to, angle: DEFAULT_GRADIENT_ANGLE };
  }
  if ('image' in background) {
    if (!imageUrl) throw new Error('An image background needs its served address.');
    return { kind: 'image', url: imageUrl };
  }
  return { kind: 'gradient', from: background.from, to: background.to, angle: background.angle };
}

function round(value: number): number {
  return roundTo(value, COORDINATE_DIGITS);
}
