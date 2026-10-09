import type { DrawFrame, RenderJob } from '../job.js';
import type { WorkerReply, WorkerRequest } from './render-worker.js';

interface Pending {
  readonly resolve: (data: Uint8Array) => void;
  readonly reject: (error: Error) => void;
}

export class RenderPool {
  readonly #workers: Worker[];
  readonly #pending = new Map<number, Pending>();
  #next = 0;

  constructor(job: RenderJob, background: ImageBitmap | undefined, frameBase: string) {
    const shared: RenderJob = { ...job, frames: [] };
    this.#workers = Array.from({ length: job.workers }, () => {
      const worker = new Worker(new URL('./render-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerReply>) => this.#settle(event.data);
      worker.onerror = (event) =>
        this.#failAll(new Error(event.message || 'A render worker stopped.'));
      const init: WorkerRequest = { type: 'init', job: shared, background, frameBase };
      worker.postMessage(init);
      return worker;
    });
  }

  render(frame: DrawFrame): Promise<Uint8Array> {
    const id = this.#next;
    this.#next += 1;
    const worker = this.#workers[id % this.#workers.length];
    if (!worker) return Promise.reject(new Error('The render workers are closed.'));
    const result = new Promise<Uint8Array>((resolve, reject) =>
      this.#pending.set(id, { resolve, reject }),
    );
    const request: WorkerRequest = { type: 'frame', id, frame };
    worker.postMessage(request);
    return result;
  }

  close(): void {
    for (const worker of this.#workers) worker.terminate();
    this.#workers.length = 0;
    this.#failAll(new Error('The render workers were closed.'));
  }

  #settle(reply: WorkerReply): void {
    const pending = this.#pending.get(reply.id);
    if (!pending) return;
    this.#pending.delete(reply.id);
    if ('error' in reply) pending.reject(new Error(reply.error));
    else pending.resolve(reply.data);
  }

  #failAll(error: Error): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }
}
