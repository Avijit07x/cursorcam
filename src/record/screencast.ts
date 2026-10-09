import type { Page } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { withTimeout } from '../shared/time.js';

export interface ScreencastFrame {
  readonly data: Buffer;
  readonly timestamp: number;
  readonly scrollX: number;
  readonly scrollY: number;
}

export interface Screencast {
  stop(): Promise<void>;
}

const JPEG_QUALITY = 75;
const FIRST_FRAME_TIMEOUT_MS = 5_000;

export async function startScreencast(
  page: Page,
  onFrame: (frame: ScreencastFrame) => void,
): Promise<Screencast> {
  const cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    onFrame({
      data: Buffer.from(data, 'base64'),
      timestamp: metadata.timestamp ?? Date.now() / 1000,
      scrollX: metadata.scrollOffsetX,
      scrollY: metadata.scrollOffsetY,
    });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: JPEG_QUALITY });

  return {
    stop: async () => {
      await cdp.send('Page.stopScreencast').catch(() => undefined);
      await cdp.detach().catch(() => undefined);
    },
  };
}

export async function captureFirstFrame(
  page: Page,
  timeoutMs: number = FIRST_FRAME_TIMEOUT_MS,
): Promise<ScreencastFrame> {
  const first = Promise.withResolvers<ScreencastFrame>();
  const screencast = await startScreencast(page, first.resolve);
  try {
    return await withTimeout(
      first.promise,
      timeoutMs,
      () =>
        new CursorCamError('The browser did not send any video frames.', {
          exitCode: ExitCode.Timeout,
        }),
    );
  } finally {
    await screencast.stop();
  }
}
