import type { Page } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { withTimeout } from '../shared/time.js';

const CHECK_EVERY_MS = 2_000;
const QUIET_AFTER_MS = 3_000;
const PING_TIMEOUT_MS = 10_000;

class PingTimeout extends Error {}

export interface LivenessOptions {
  readonly page: () => Page;
  readonly lastFrameAt: () => number;
  readonly now: () => number;
  readonly onHung: (error: CursorCamError) => void;
  readonly ping?: (page: Page) => Promise<unknown>;
  readonly checkEveryMs?: number;
  readonly pingTimeoutMs?: number;
}

export function watchLiveness(options: LivenessOptions): () => void {
  const ping = options.ping ?? ((page: Page) => page.evaluate(() => true));
  const pingTimeoutMs = options.pingTimeoutMs ?? PING_TIMEOUT_MS;
  let pinging = false;

  const check = async () => {
    if (pinging || options.now() - options.lastFrameAt() < QUIET_AFTER_MS) return;
    const page = options.page();
    if (page.isClosed()) return;
    pinging = true;
    try {
      await withTimeout(ping(page), pingTimeoutMs, () => new PingTimeout());
    } catch (error) {
      if (error instanceof PingTimeout && !page.isClosed()) {
        options.onHung(
          new CursorCamError('The page stopped responding.', {
            exitCode: ExitCode.Crashed,
            hint: 'The page may be stuck in a loop. Check it in a normal browser.',
          }),
        );
      }
    } finally {
      pinging = false;
    }
  };

  const timer = setInterval(() => void check(), options.checkEveryMs ?? CHECK_EVERY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
