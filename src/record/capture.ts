import type { Page } from 'playwright-core';
import type { BrowserSession, PageSwitchReason } from '../browser/session.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { redactUrl } from '../shared/redact.js';
import type { EventLog } from './events.js';
import type { FrameStore } from './frames.js';
import { startScreencast, type Screencast } from './screencast.js';

const FIRST_FRAME_TIMEOUT_MS = 5_000;

export class Capture {
  readonly #session: BrowserSession;
  readonly #store: FrameStore;
  readonly #events: EventLog;
  #screencast: Screencast | undefined;
  #tab = 0;
  #switching: Promise<void> = Promise.resolve();
  #stopFollowing: (() => void) | undefined;

  constructor(session: BrowserSession, store: FrameStore, events: EventLog) {
    this.#session = session;
    this.#store = store;
    this.#events = events;
  }

  async start(): Promise<void> {
    await this.#startOn(this.#session.page);
    const first = await this.#session.guard(this.#store.nextFrame(FIRST_FRAME_TIMEOUT_MS));
    if (!first) {
      throw new CursorCamError('The browser did not send any video frames.', {
        exitCode: ExitCode.Timeout,
        hint: 'Run cursorcam doctor to check the browser.',
      });
    }
    this.#stopFollowing = this.#session.onPageSwitch((page, reason) => {
      this.#switching = this.#switching.then(() => this.#follow(page, reason));
    });
  }

  async stop(): Promise<void> {
    this.#stopFollowing?.();
    await this.#switching;
    await this.#screencast?.stop();
    this.#screencast = undefined;
  }

  async #follow(page: Page, reason: PageSwitchReason): Promise<void> {
    this.#events.log({ type: 'tab', reason, url: redactUrl(page.url()) });
    await this.#screencast?.stop();
    this.#tab += 1;
    await this.#startOn(page).catch(() =>
      this.#events.log({ type: 'warning', message: 'Could not record the new tab.' }),
    );
  }

  async #startOn(page: Page): Promise<void> {
    const tab = this.#tab;
    this.#screencast = await startScreencast(page, (frame) => this.#store.add(frame, tab));
  }
}
