import type { Frame, Page, Request } from 'playwright-core';
import { LOGIN_IDENTITY } from '../browser/identity.js';
import { launchBrowser } from '../browser/launch.js';
import { isLocalUrl } from '../config/urls.js';
import { frameSelector } from '../inspect/inspect.js';
import { LOGIN_TIMEOUT_MS, openLoginPage, windowClosed } from '../login/capture.js';
import { frameOf } from '../record/network.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { withTimeout } from '../shared/time.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';
import { CAPTURE_BINDING, CAPTURE_SCRIPT, type PageEvent } from './page.js';
import type { FlowEvent } from './steps.js';

export interface FlowRequest {
  readonly url: string;
  readonly paths: AppPaths;
  readonly lifecycle: Lifecycle;
  readonly loginState?: string | undefined;
  readonly headed?: boolean;
  readonly timeoutMs?: number;
  readonly onOpen?: (page: Page) => void;
}

const HEADERS_TIMEOUT_MS = 2_000;

export interface CapturedFlow {
  readonly events: readonly FlowEvent[];
  readonly timedOut: boolean;
}

export async function captureFlow(request: FlowRequest): Promise<CapturedFlow> {
  const session = await launchBrowser({
    identity: LOGIN_IDENTITY,
    paths: request.paths,
    headed: request.headed ?? true,
    settings: { ignoreHTTPSErrors: isLocalUrl(request.url) },
    ...(request.loginState ? { loginState: request.loginState } : {}),
  });
  const interrupted = new AbortController();
  request.lifecycle.add(() => {
    interrupted.abort();
    return session.dispose();
  });

  const events: FlowEvent[] = [];
  const arriving = new Set<Promise<void>>();
  const add = (event: Promise<FlowEvent>) => {
    const adding = event.then((flowEvent) => {
      events.push(flowEvent);
    });
    arriving.add(adding);
    void adding.finally(() => arriving.delete(adding));
  };
  await session.context.exposeBinding(CAPTURE_BINDING, ({ frame }, event: PageEvent) => {
    add(inFrame(frame, event));
  });
  await session.context.addInitScript({ content: CAPTURE_SCRIPT });
  await openLoginPage(session.page, request.url);

  const onRequest = (sent: Request) => {
    const frame = frameOf(sent);
    if (!sent.isNavigationRequest() || sent.redirectedFrom() || frame?.parentFrame() !== null)
      return;
    add(gotoEvent(sent, Date.now()));
  };
  session.context.on('request', onRequest);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void session.dispose();
  }, request.timeoutMs ?? LOGIN_TIMEOUT_MS);
  request.onOpen?.(session.page);
  try {
    await windowClosed(session.context, () => Promise.resolve());
  } finally {
    clearTimeout(timer);
    session.context.off('request', onRequest);
  }
  await Promise.all(arriving);

  if (interrupted.signal.aborted) {
    throw new CursorCamError('Stopped before the steps were saved.', {
      exitCode: ExitCode.Interrupted,
    });
  }
  return { events, timedOut };
}

// The browser sends Sec-Fetch-Site: none for a page opened from the address bar or a bookmark.
// Back, forward and sites on plain http other than localhost get no such header.
async function gotoEvent(sent: Request, at: number): Promise<FlowEvent> {
  const headers = await withTimeout(
    sent.allHeaders(),
    HEADERS_TIMEOUT_MS,
    () => new Error('slow'),
  ).catch(() => undefined);
  const site = headers?.['sec-fetch-site'];
  return { kind: 'goto', at, url: sent.url(), byHand: site === undefined ? null : site === 'none' };
}

// A target in an iframe names the frame. Frames inside frames cannot be named, so they get none.
async function inFrame(frame: Frame, event: PageEvent): Promise<FlowEvent> {
  const parent = frame.parentFrame();
  if (parent === null || parent.parentFrame() !== null) return { ...event, frame: null };
  const selector = await frameSelector(frame).catch(() => undefined);
  return { ...event, frame: selector ?? null };
}
