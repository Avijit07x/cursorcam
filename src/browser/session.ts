import type { BrowserContext, Page } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { removeDir } from '../system/cleanup.js';
import type { BrowserInstall } from './finder.js';
import type { Identity } from './identity.js';
import type { BrowserVersion } from './version.js';

interface SessionParts {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly identity: Identity;
  readonly install: BrowserInstall;
  readonly version: BrowserVersion;
  readonly profileDir: string;
}

export type PageSwitchReason = 'opened' | 'closed';
type PageSwitchListener = (page: Page, reason: PageSwitchReason) => void;
type PageAttach = (page: Page) => (() => void) | undefined;

export class BrowserSession {
  readonly context: BrowserContext;
  readonly identity: Identity;
  readonly install: BrowserInstall;
  readonly version: BrowserVersion;
  readonly profileDir: string;
  readonly #fatal = new AbortController();
  readonly #switchListeners = new Set<PageSwitchListener>();
  readonly #attachers = new Set<PageAttach>();
  readonly #detachers = new Map<Page, Set<() => void>>();
  readonly #history: Page[] = [];
  #page: Page;
  #pageClosed = false;
  #openingBackgroundPage = false;
  #disposal: Promise<void> | undefined;

  constructor(parts: SessionParts) {
    this.context = parts.context;
    this.identity = parts.identity;
    this.install = parts.install;
    this.version = parts.version;
    this.profileDir = parts.profileDir;
    this.#page = parts.page;
    this.context.on('page', this.#onNewPage);
    this.context.on('close', this.#onUnexpectedClose);
    for (const page of this.context.pages()) this.#track(page);
  }

  get page(): Page {
    return this.#page;
  }

  get pageClosed(): boolean {
    return this.#pageClosed;
  }

  get fatalSignal(): AbortSignal {
    return this.#fatal.signal;
  }

  onPageSwitch(listener: PageSwitchListener): () => void {
    this.#switchListeners.add(listener);
    return () => this.#switchListeners.delete(listener);
  }

  forEachPage(attach: PageAttach): () => void {
    this.#attachers.add(attach);
    for (const page of this.context.pages()) this.#attach(page, attach);
    return () => this.#attachers.delete(attach);
  }

  async newBackgroundPage(): Promise<Page> {
    this.#openingBackgroundPage = true;
    try {
      return await this.context.newPage();
    } finally {
      this.#openingBackgroundPage = false;
    }
  }

  fail(error: CursorCamError): void {
    if (!this.#fatal.signal.aborted) this.#fatal.abort(error);
  }

  throwIfFailed(): void {
    if (this.#fatal.signal.aborted) throw this.#fatal.signal.reason as CursorCamError;
  }

  guard<T>(work: Promise<T>): Promise<T> {
    const signal = this.#fatal.signal;
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(signal.reason as CursorCamError);
      if (signal.aborted) {
        work.catch(() => undefined);
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
      work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  dispose(): Promise<void> {
    this.#disposal ??= this.#close();
    return this.#disposal;
  }

  async #close(): Promise<void> {
    this.context.off('page', this.#onNewPage);
    this.context.off('close', this.#onUnexpectedClose);
    for (const page of [...this.#detachers.keys()]) this.#untrack(page);
    this.#switchListeners.clear();
    this.#attachers.clear();
    await this.context.close().catch(() => undefined);
    await removeDir(this.profileDir);
  }

  #track(page: Page): void {
    if (this.#detachers.has(page)) return;
    this.#detachers.set(page, new Set());
    const onCrash = () =>
      this.fail(new CursorCamError('The page crashed.', { exitCode: ExitCode.Crashed }));
    const onClose = () => this.#onPageClose(page);
    page.on('crash', onCrash);
    page.on('close', onClose);
    this.#detachers.get(page)?.add(() => {
      page.off('crash', onCrash);
      page.off('close', onClose);
    });
    for (const attach of this.#attachers) this.#attach(page, attach);
  }

  #attach(page: Page, attach: PageAttach): void {
    const detach = attach(page);
    if (detach) this.#detachers.get(page)?.add(detach);
  }

  #untrack(page: Page): void {
    for (const detach of this.#detachers.get(page) ?? []) detach();
    this.#detachers.delete(page);
  }

  #switchTo(page: Page, reason: PageSwitchReason): void {
    this.#page = page;
    this.#pageClosed = false;
    for (const listener of this.#switchListeners) listener(page, reason);
  }

  readonly #onNewPage = (page: Page): void => {
    this.#track(page);
    if (this.#openingBackgroundPage) return;
    void page.opener().then((opener) => {
      if (page.isClosed() || (opener !== null && opener !== this.#page)) return;
      this.#history.push(this.#page);
      this.#switchTo(page, 'opened');
    });
  };

  #onPageClose(page: Page): void {
    this.#untrack(page);
    const index = this.#history.lastIndexOf(page);
    if (index !== -1) this.#history.splice(index, 1);
    if (page !== this.#page) return;
    const previous = this.#history.findLast((candidate) => !candidate.isClosed());
    if (previous) {
      this.#history.splice(this.#history.lastIndexOf(previous), 1);
      this.#switchTo(previous, 'closed');
      return;
    }
    this.#pageClosed = true;
  }

  readonly #onUnexpectedClose = (): void => {
    this.fail(
      new CursorCamError('The browser closed unexpectedly.', { exitCode: ExitCode.Crashed }),
    );
  };
}
