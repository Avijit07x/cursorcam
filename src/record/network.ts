import type { Frame, Page, Request } from 'playwright-core';
import type { BrowserSession } from '../browser/session.js';
import { sleep } from '../shared/time.js';

const IGNORED_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'websocket',
  'eventsource',
  'media',
  'manifest',
  'texttrack',
  'ping',
]);
const LONG_LIVED_MS = 5_000;
const QUIET_MS = 500;
const QUIET_CAP_MS = 3_000;
const POLL_MS = 50;

interface Pending {
  readonly start: number;
  readonly frame: Frame | undefined;
}

export function isTracked(resourceType: string): boolean {
  return !IGNORED_RESOURCE_TYPES.has(resourceType);
}

export function activeCount(pending: Iterable<{ readonly start: number }>, now: number): number {
  let count = 0;
  for (const request of pending) if (now - request.start < LONG_LIVED_MS) count += 1;
  return count;
}

export class NetworkTracker {
  readonly #pending = new Map<Request, Pending>();
  readonly #stop: () => void;
  #lastChange = performance.now();

  constructor(session: BrowserSession) {
    this.#stop = session.forEachPage((page) => this.#attach(page));
  }

  async waitForQuiet(capMs = QUIET_CAP_MS): Promise<void> {
    const end = performance.now() + capMs;
    while (performance.now() < end) {
      const now = performance.now();
      if (activeCount(this.#pending.values(), now) === 0 && now - this.#lastChange >= QUIET_MS)
        return;
      await sleep(POLL_MS);
    }
  }

  dispose(): void {
    this.#stop();
    this.#pending.clear();
  }

  #attach(page: Page): () => void {
    const onRequest = (request: Request) => {
      if (!isTracked(request.resourceType())) return;
      this.#pending.set(request, { start: performance.now(), frame: frameOf(request) });
      this.#lastChange = performance.now();
    };
    const onDone = (request: Request) => {
      if (this.#pending.delete(request)) this.#lastChange = performance.now();
    };
    const onNavigated = (frame: Frame) => {
      for (const [request, pending] of this.#pending) {
        if (pending.frame === frame && !request.isNavigationRequest())
          this.#pending.delete(request);
      }
    };
    page.on('request', onRequest);
    page.on('requestfinished', onDone);
    page.on('requestfailed', onDone);
    page.on('framenavigated', onNavigated);
    return () => {
      page.off('request', onRequest);
      page.off('requestfinished', onDone);
      page.off('requestfailed', onDone);
      page.off('framenavigated', onNavigated);
      for (const [request, pending] of this.#pending) {
        if (pending.frame?.page() === page) this.#pending.delete(request);
      }
    };
  }
}

export function frameOf(request: Request): Frame | undefined {
  try {
    return request.frame();
  } catch {
    return undefined;
  }
}
