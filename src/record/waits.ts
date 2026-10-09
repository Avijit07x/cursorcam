import { errors, type Frame, type Page, type Request, type Response } from 'playwright-core';
import { assertNotBlocked } from '../browser/blocked.js';
import type { BrowserSession } from '../browser/session.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { redactUrl } from '../shared/redact.js';
import { pollUntil, sleep, withTimeout } from '../shared/time.js';
import type { EventLog } from './events.js';
import { frameOf, type NetworkTracker } from './network.js';

const NAVIGATION_GRACE_MS = 250;
const FONTS_TIMEOUT_MS = 3_000;
const POLL_MS = 50;
const HTTP_ERROR_STATUS = 400;
const HTTP_UNAUTHORIZED = 401;

export async function waitForFonts(page: Page): Promise<void> {
  await withTimeout(
    page.evaluate(() => document.fonts.ready.then(() => true)),
    FONTS_TIMEOUT_MS,
    () => new Error('fonts'),
  ).catch(() => undefined);
}

export async function waitForPageLoad(page: Page, timeoutMs: number): Promise<void> {
  try {
    await page.waitForLoadState('load', { timeout: timeoutMs });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    throw new CursorCamError(`The page did not finish loading within ${timeoutMs / 1000} s.`, {
      exitCode: ExitCode.PageLoadFailed,
      hint: 'Check that the app is running and fast enough, or raise "timeout" in the steps file.',
    });
  }
}

export class NavigationWatch {
  readonly #session: BrowserSession;
  readonly #events: EventLog;
  readonly #page: Page;
  readonly #stop: () => void;
  #request: Request | undefined;
  #committed = false;
  #ended = false;
  #switched = false;

  constructor(session: BrowserSession, events: EventLog) {
    this.#session = session;
    this.#events = events;
    this.#page = session.page;
    const page = this.#page;
    const onRequest = (request: Request) => {
      if (!request.isNavigationRequest() || frameOf(request) !== page.mainFrame()) return;
      this.#request = request;
      this.#committed = false;
      this.#ended = false;
      events.log({ type: 'navigate', phase: 'start', url: redactUrl(request.url()) });
    };
    const onFailed = (request: Request) => {
      if (request === this.#request) this.#ended = true;
    };
    const onNavigated = (frame: Frame) => {
      if (frame === page.mainFrame()) this.#committed = true;
    };
    const onDownload = () => {
      this.#ended = true;
    };
    page.on('request', onRequest);
    page.on('requestfailed', onFailed);
    page.on('framenavigated', onNavigated);
    page.on('download', onDownload);
    const stopSwitch = session.onPageSwitch(() => {
      this.#switched = true;
    });
    let stopped = false;
    this.#stop = () => {
      if (stopped) return;
      stopped = true;
      page.off('request', onRequest);
      page.off('requestfailed', onFailed);
      page.off('framenavigated', onNavigated);
      page.off('download', onDownload);
      stopSwitch();
    };
  }

  dispose(): void {
    this.#stop();
  }

  async settle(network: NetworkTracker, timeoutMs: number): Promise<void> {
    try {
      await sleep(NAVIGATION_GRACE_MS);
      if (this.#request && !this.#committed && !this.#ended) {
        await pollUntil(
          () => Promise.resolve(this.#committed || this.#ended || this.#page.isClosed()),
          timeoutMs,
          POLL_MS,
        );
      }
    } finally {
      this.#stop();
    }
    const page = this.#session.page;
    if (page.isClosed()) return;
    const loadedNewDocument = this.#request !== undefined && this.#committed;
    if (loadedNewDocument || this.#switched) {
      await waitForPageLoad(page, timeoutMs);
      if (loadedNewDocument)
        this.#events.log({ type: 'navigate', phase: 'load', url: redactUrl(page.url()) });
      await assertNotBlocked(page);
    }
    await network.waitForQuiet();
    await waitForFonts(page);
  }
}

export async function openUrl(page: Page, url: string, timeoutMs: number): Promise<void> {
  const shown = redactUrl(url);
  let response: Response | null;
  try {
    response = await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
  } catch (error) {
    throw new CursorCamError(`Could not open ${shown}.`, {
      exitCode: ExitCode.PageLoadFailed,
      hint: 'Check that the app is running at this address.',
      cause: error,
    });
  }
  await assertNotBlocked(page);
  const status = response?.status() ?? 0;
  if (status >= HTTP_ERROR_STATUS) {
    throw new CursorCamError(`${shown} answered with HTTP ${status}.`, {
      exitCode: ExitCode.PageLoadFailed,
      hint:
        status === HTTP_UNAUTHORIZED
          ? 'The site needs a login. Add httpCredentials to the steps file.'
          : 'Check the address and that the app is running.',
    });
  }
  await waitForFonts(page);
}
