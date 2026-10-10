import type {
  CropBox,
  DrawFrame,
  RenderApi,
  RenderJob,
  RenderProgress,
  RenderSummary,
  StillRequest,
} from '../job.js';
import { Compositor } from './compositor.js';
import { openEncoder } from './encoder.js';
import { FrameCache } from './frame-cache.js';
import { RenderPool } from './render-pool.js';

const PROGRESS_EVERY_FRAMES = 30;
const POSTER_QUALITY = 0.9;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
  return (await response.json()) as T;
}

async function post(path: string, body: BodyInit): Promise<void> {
  const response = await fetch(path, { method: 'POST', body });
  if (!response.ok) throw new Error(`Could not send ${path} (HTTP ${response.status}).`);
}

function reportProgress(progress: RenderProgress): void {
  void post('progress', JSON.stringify(progress)).catch(() => undefined);
}

async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not load the background image (HTTP ${response.status}).`);
  return createImageBitmap(await response.blob());
}

async function loadSvg(svg: string): Promise<ImageBitmap> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function backgroundOf(job: RenderJob): Promise<ImageBitmap | undefined> {
  const background = job.background;
  if (background.kind === 'image') return loadImage(background.url);
  if (background.kind === 'scene') return loadSvg(background.svg);
  return undefined;
}

async function openCompositor(job: RenderJob): Promise<Compositor> {
  const image = await backgroundOf(job);
  try {
    return new Compositor(job, image);
  } finally {
    image?.close();
  }
}

async function renderVideo(): Promise<RenderSummary> {
  const started = performance.now();
  const job = await fetchJson<RenderJob>('job');
  const total = job.frames.length;
  const background = await backgroundOf(job);
  const pool = new RenderPool(job, background, new URL('frame/', location.href).href);
  background?.close();
  const encoder = await openEncoder(job.output, (chunk) =>
    post(`output?position=${chunk.position}`, chunk.data),
  );
  const pending: Promise<Uint8Array>[] = [];
  let encoded = 0;

  const encodeNext = async (): Promise<void> => {
    const next = pending.shift();
    if (!next) return;
    await encoder.add(await next, encoded);
    encoded += 1;
    if (encoded % PROGRESS_EVERY_FRAMES === 0) reportProgress({ done: encoded, total });
  };

  try {
    for (const frame of job.frames) {
      const converted = pool.render(frame);
      converted.catch(() => undefined);
      pending.push(converted);
      if (pending.length >= job.workers) await encodeNext();
    }
    while (pending.length > 0) await encodeNext();
    await encoder.finish();
  } catch (error) {
    await encoder.cancel().catch(() => undefined);
    throw error;
  } finally {
    pool.close();
  }
  reportProgress({ done: encoded, total });
  return { frames: encoded, ms: performance.now() - started, codec: encoder.codec };
}

async function renderStills(requests: readonly StillRequest[]): Promise<number> {
  const job = await fetchJson<RenderJob>('job');
  const compositor = await openCompositor(job);
  const frames = new FrameCache((index) => `frame/${index}`);
  try {
    for (const request of requests) {
      const image = await stillImage(request, compositor, frames, job.source.scale);
      await post(`still?name=${encodeURIComponent(request.name)}`, image);
    }
  } finally {
    frames.close();
  }
  return requests.length;
}

async function stillImage(
  request: StillRequest,
  compositor: Compositor,
  frames: FrameCache,
  scale: number,
): Promise<Blob> {
  switch (request.kind) {
    case 'composite':
      return compositeImage(compositor, request.frame, await frames.get(request.frame.f), {
        type: 'image/png',
      });
    case 'poster':
      return compositeImage(compositor, request.frame, await frames.get(request.frame.f), {
        type: 'image/jpeg',
        quality: POSTER_QUALITY,
      });
    case 'crop':
      return cropImage(await frames.get(request.f), request.rect, scale);
  }
}

function compositeImage(
  compositor: Compositor,
  frame: DrawFrame,
  source: ImageBitmap,
  options: ImageEncodeOptions,
): Promise<Blob> {
  compositor.draw(frame, source);
  return compositor.canvas.convertToBlob(options);
}

function cropImage(source: ImageBitmap, rect: CropBox, scale: number): Promise<Blob> {
  const [x, y, width, height] = rect.map((value) => Math.round(value * scale)) as [
    number,
    number,
    number,
    number,
  ];
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot draw on a canvas.');
  context.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas.convertToBlob({ type: 'image/png' });
}

const api: RenderApi = { cursorCamRender: renderVideo, cursorCamStills: renderStills };
Object.assign(window, api);
