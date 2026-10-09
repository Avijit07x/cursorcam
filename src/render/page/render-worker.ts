import type { DrawFrame, RenderJob } from '../job.js';
import { i420Size, rgbaToI420 } from './color.js';
import { Compositor } from './compositor.js';
import { FrameCache } from './frame-cache.js';

export type WorkerRequest =
  | {
      readonly type: 'init';
      readonly job: RenderJob;
      readonly background: ImageBitmap | undefined;
      readonly frameBase: string;
    }
  | { readonly type: 'frame'; readonly id: number; readonly frame: DrawFrame };

export type WorkerReply =
  | { readonly id: number; readonly data: Uint8Array }
  | { readonly id: number; readonly error: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerReply, transfer?: Transferable[]): void;
}

interface WorkerState {
  readonly compositor: Compositor;
  readonly frames: FrameCache;
  readonly size: number;
}

const scope = globalThis as unknown as WorkerScope;
let state: WorkerState | undefined;
let queue: Promise<void> = Promise.resolve();

async function renderFrame(id: number, frame: DrawFrame): Promise<void> {
  try {
    if (!state) throw new Error('The render worker was not started.');
    const { compositor, frames, size } = state;
    compositor.draw(frame, await frames.get(frame.f));
    frames.releaseBefore(frame.f);
    const data = new Uint8Array(size);
    rgbaToI420(compositor.pixels(), compositor.canvas.width, compositor.canvas.height, data);
    scope.postMessage({ id, data }, [data.buffer]);
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
}

scope.onmessage = ({ data: request }) => {
  if (request.type === 'init') {
    state = {
      compositor: new Compositor(request.job, request.background, true),
      frames: new FrameCache((index) => `${request.frameBase}${index}`),
      size: i420Size(request.job.output.width, request.job.output.height),
    };
    request.background?.close();
    return;
  }
  queue = queue.then(() => renderFrame(request.id, request.frame));
};
