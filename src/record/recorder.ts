import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { BROWSER_LABELS } from '../browser/finder.js';
import { PageHandlers } from '../browser/handlers.js';
import { IDENTITIES } from '../browser/identity.js';
import { launchBrowser, type BrowserSettings } from '../browser/launch.js';
import type { BrowserSession } from '../browser/session.js';
import { actionOf, type StepsPlan } from '../config/load-steps.js';
import type { StepsFileHeader } from '../config/steps.js';
import { isLocalUrl } from '../config/urls.js';
import { resolveText } from '../config/values.js';
import { EVENTS_FILE, type RunDirs } from '../runs/dirs.js';
import { writeRecordingMeta } from '../runs/meta.js';
import type { StatusFile } from '../runs/status.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { formatBytes } from '../shared/format.js';
import { redactUrl } from '../shared/redact.js';
import { sleep, withTimeout } from '../shared/time.js';
import { freeBytes } from '../system/disk.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';
import { AnswerChannel } from './ask.js';
import { Capture } from './capture.js';
import type { ActionContext } from './context.js';
import { createClock, EventLog } from './events.js';
import { FrameStore } from './frames.js';
import { watchLiveness } from './liveness.js';
import { Pointer } from './mouse.js';
import { NetworkTracker } from './network.js';
import { runSteps, type StepHooks } from './run-steps.js';
import { openUrl } from './waits.js';

export type RecordMode = 'record' | 'check';

export const FAILURE_FRAME = 'failure.jpg';
export const CHECK_DIR = 'check';
const MIN_FREE_TO_RECORD_BYTES = 1024 ** 3;
const END_HOLD_MS = 1_000;
const CHECK_FRAME_WAIT_MS = 400;
const SCREENSHOT_TIMEOUT_MS = 3_000;
const DOWNLOADS_DIR = 'downloads';

export interface RecordRequest {
  readonly plan: StepsPlan;
  readonly paths: AppPaths;
  readonly dirs: RunDirs;
  readonly mode: RecordMode;
  readonly lifecycle: Lifecycle;
  readonly status: StatusFile;
  readonly headed?: boolean;
  readonly loginState?: string | undefined;
  readonly env?: NodeJS.ProcessEnv;
  readonly onStepDone?: (index: number, frame: string | undefined) => void;
}

export interface Recording {
  readonly session: BrowserSession;
  readonly frames: number;
  readonly durationMs: number;
  readonly warnings: readonly string[];
}

export async function recordSteps(request: RecordRequest): Promise<Recording> {
  const { plan, paths, dirs, mode, lifecycle, status } = request;
  const env = request.env ?? process.env;
  const header = plan.header;
  const identity = IDENTITIES[header.viewport];
  if (mode === 'record') await ensureDiskSpace(paths.cache);

  const session = await launchBrowser({
    identity,
    paths,
    headed: request.headed ?? false,
    settings: browserSettings(header, env),
    ...(request.loginState ? { loginState: request.loginState } : {}),
  });
  lifecycle.add(() => session.dispose());
  session.context.setDefaultTimeout(header.timeout);

  const clock = createClock();
  const startedAt = new Date().toISOString();
  const fail = (error: CursorCamError) => session.fail(error);
  const events = new EventLog(
    clock,
    mode === 'record' ? join(dirs.cacheDir, EVENTS_FILE) : undefined,
    (error) =>
      fail(
        new CursorCamError('Could not save the recording events.', {
          exitCode: ExitCode.DiskFull,
          cause: error,
        }),
      ),
  );
  const handlers = await PageHandlers.install(session, {
    downloadsDir: join(dirs.outDir, DOWNLOADS_DIR),
    hideScrollbars: request.headed ?? false,
    mask: header.mask ?? [],
    onDialog: (dialog) => events.log({ type: 'dialog', ...dialog }),
    onDownload: (file) => events.log({ type: 'download', file: basename(file) }),
    onWarning: (message) => events.log({ type: 'warning', message }),
  });
  const network = new NetworkTracker(session);
  const store = new FrameStore({
    clock,
    onError: fail,
    ...(mode === 'record' ? { dir: dirs.cacheDir } : {}),
  });
  const capture = new Capture(session, store, events);
  const stopLiveness = watchLiveness({
    page: () => session.page,
    lastFrameAt: () => store.lastFrameAt,
    now: () => clock.now(),
    onHung: fail,
  });

  try {
    await status.update({
      state: mode === 'record' ? 'recording' : 'checking',
      steps: plan.steps.length,
    });
    await session.guard(openUrl(session.page, header.url, header.timeout));
    await session.guard(network.waitForQuiet());
    await capture.start();
    const context: ActionContext = {
      session,
      plan,
      events,
      pointer: new Pointer(session, events),
      handlers,
      timeoutMs: header.timeout,
      speed: 1,
      env,
      answers: new AnswerChannel(status),
    };
    await runSteps(context, network, stepHooks(request, store));
    await session.guard(sleep(END_HOLD_MS));
  } catch (error) {
    await saveFailureFrame(session, store, join(dirs.outDir, FAILURE_FRAME));
    throw error;
  } finally {
    stopLiveness();
    await capture.stop();
    network.dispose();
    handlers.dispose();
    await events.close();
    await store.close();
  }

  const durationMs = clock.now();
  const frames = store.count;
  if (mode === 'record') {
    await writeRecordingMeta(dirs.cacheDir, {
      version: 1,
      identity: identity.name,
      viewport: identity.viewport,
      scale: identity.scale,
      frames,
      durationMs,
      startedAt,
      browser: `${BROWSER_LABELS[session.install.kind]} ${session.version.full}`,
      url: redactUrl(header.url),
    });
  }
  return { session, frames, durationMs, warnings: events.warnings };
}

function stepHooks(request: RecordRequest, store: FrameStore): StepHooks {
  const { plan, status, mode, dirs } = request;
  const state = mode === 'record' ? 'recording' : 'checking';
  return {
    onStart: async (index, step) => {
      await status.update({
        state,
        step: index + 1,
        steps: plan.steps.length,
        action: actionOf(step),
      });
    },
    onEnd: async (index) => {
      if (mode !== 'check') {
        request.onStepDone?.(index, undefined);
        return;
      }
      const frame = await store.nextFrame(CHECK_FRAME_WAIT_MS);
      const file = join(dirs.outDir, CHECK_DIR, `step-${String(index + 1).padStart(2, '0')}.jpg`);
      if (frame) {
        await mkdir(join(dirs.outDir, CHECK_DIR), { recursive: true });
        await writeFile(file, frame);
      }
      request.onStepDone?.(index, frame ? file : undefined);
    },
  };
}

function browserSettings(header: StepsFileHeader, env: NodeJS.ProcessEnv): BrowserSettings {
  const credentials = header.httpCredentials;
  return {
    locale: header.locale,
    colorScheme: header.colorScheme,
    ignoreHTTPSErrors: header.ignoreHTTPSErrors ?? isLocalUrl(header.url),
    ...(header.timezone ? { timezoneId: header.timezone } : {}),
    ...(header.reducedMotion ? { reducedMotion: header.reducedMotion } : {}),
    ...(header.permissions ? { permissions: header.permissions } : {}),
    ...(credentials
      ? {
          httpCredentials: {
            username: resolveText(credentials.username, env).text,
            password: resolveText(credentials.password, env).text,
          },
        }
      : {}),
  };
}

async function ensureDiskSpace(dir: string): Promise<void> {
  const free = await freeBytes(dir);
  if (free >= MIN_FREE_TO_RECORD_BYTES) return;
  throw new CursorCamError(`Only ${formatBytes(free)} of disk space is free.`, {
    exitCode: ExitCode.DiskFull,
    hint: 'Free at least 1 GB, then record again. Recording uses up to 1 GB per minute.',
  });
}

async function saveFailureFrame(
  session: BrowserSession,
  store: FrameStore,
  file: string,
): Promise<void> {
  try {
    const frame =
      store.latest ??
      (await withTimeout(
        session.page.screenshot({ type: 'jpeg' }),
        SCREENSHOT_TIMEOUT_MS,
        () => new Error('slow'),
      ));
    await writeFile(file, frame);
  } catch {
    return;
  }
}
