import type { BrowserContext, Page } from 'playwright-core';
import { LOGIN_IDENTITY } from '../browser/identity.js';
import { launchBrowser } from '../browser/launch.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { redactUrl } from '../shared/redact.js';
import { withTimeout } from '../shared/time.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';

export type LoginState = Awaited<ReturnType<BrowserContext['storageState']>>;

export interface LoginRequest {
  readonly url: string;
  readonly paths: AppPaths;
  readonly lifecycle: Lifecycle;
  readonly startFrom?: string | undefined;
  readonly timeoutMs?: number;
  readonly onOpen?: () => void;
}

export const LOGIN_TIMEOUT_MS = 9 * 60_000;
const SNAPSHOT_INTERVAL_MS = 1_000;
const PAGE_TIMEOUT_MS = 30_000;
const LAST_SNAPSHOT_TIMEOUT_MS = 2_000;
const MS_PER_MINUTE = 60_000;

export async function captureLogin(request: LoginRequest): Promise<LoginState> {
  const session = await launchBrowser({
    identity: LOGIN_IDENTITY,
    paths: request.paths,
    headed: true,
    ...(request.startFrom ? { loginState: request.startFrom } : {}),
  });
  const interrupted = new AbortController();
  request.lifecycle.add(() => {
    interrupted.abort();
    return session.dispose();
  });
  const snapshots = new Snapshots(session.context);
  const timeoutMs = request.timeoutMs ?? LOGIN_TIMEOUT_MS;
  try {
    await openLoginPage(session.page, request.url);
    await snapshots.take();
    snapshots.start();
    request.onOpen?.();
    await withTimeout(
      windowClosed(session.context, () => snapshots.take()),
      timeoutMs,
      () =>
        new CursorCamError(
          `The login window was still open after ${Math.round(timeoutMs / MS_PER_MINUTE)} minutes.`,
          {
            exitCode: ExitCode.Timeout,
            hint: 'Run cursorcam login again, log in, then close the browser window to save.',
          },
        ),
    );
  } finally {
    snapshots.stop();
  }
  if (interrupted.signal.aborted) {
    throw new CursorCamError('Stopped before the login was saved.', {
      exitCode: ExitCode.Interrupted,
    });
  }
  const state = snapshots.latest;
  if (!state || (state.cookies.length === 0 && state.origins.length === 0)) {
    throw new CursorCamError('Nothing was saved: the site set no cookies or storage.', {
      exitCode: ExitCode.BadInput,
      hint: 'Log in fully, wait for the logged-in page, then close the window.',
    });
  }
  return state;
}

async function openLoginPage(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
  } catch (error) {
    throw new CursorCamError(`Could not open ${redactUrl(url)}.`, {
      exitCode: ExitCode.PageLoadFailed,
      hint: 'Check the address and that the site is running.',
      cause: error,
    });
  }
}

export function windowClosed(
  context: BrowserContext,
  beforeClose: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    const detachers: (() => void)[] = [];
    const finish = () => {
      for (const detach of detachers.splice(0)) detach();
      resolve();
    };
    const onPageClose = () => {
      if (context.pages().length > 0) return;
      void withTimeout(beforeClose(), LAST_SNAPSHOT_TIMEOUT_MS, () => new Error('slow'))
        .catch(() => undefined)
        .finally(finish);
    };
    const watch = (page: Page) => {
      page.on('close', onPageClose);
      detachers.push(() => page.off('close', onPageClose));
    };
    context.on('close', finish);
    context.on('page', watch);
    detachers.push(
      () => context.off('close', finish),
      () => context.off('page', watch),
    );
    for (const page of context.pages()) watch(page);
  });
}

class Snapshots {
  readonly #context: BrowserContext;
  #latest: LoginState | undefined;
  #pending: Promise<void> | undefined;
  #timer: NodeJS.Timeout | undefined;

  constructor(context: BrowserContext) {
    this.#context = context;
  }

  get latest(): LoginState | undefined {
    return this.#latest;
  }

  take(): Promise<void> {
    this.#pending ??= this.#context
      .storageState({ indexedDB: true })
      .then((state) => {
        this.#latest = state;
      })
      .catch(() => undefined)
      .finally(() => {
        this.#pending = undefined;
      });
    return this.#pending;
  }

  start(): void {
    this.#timer = setInterval(() => void this.take(), SNAPSHOT_INTERVAL_MS);
  }

  stop(): void {
    clearInterval(this.#timer);
  }
}
