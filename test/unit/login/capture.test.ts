import { EventEmitter } from 'node:events';
import type { BrowserContext } from 'playwright-core';
import { describe, expect, it } from 'vitest';
import { windowClosed } from '../../../src/login/capture.js';

class FakePage extends EventEmitter {
  readonly #context: FakeContext;

  constructor(context: FakeContext) {
    super();
    this.#context = context;
  }

  close(): void {
    this.#context.open.delete(this);
    this.emit('close');
  }
}

class FakeContext extends EventEmitter {
  readonly open = new Set<FakePage>();

  pages(): FakePage[] {
    return [...this.open];
  }

  openPage(): FakePage {
    const page = new FakePage(this);
    this.open.add(page);
    this.emit('page', page);
    return page;
  }
}

const asContext = (context: FakeContext) => context as unknown as BrowserContext;
const settled = (promise: Promise<void>) => {
  let done = false;
  void promise.then(() => {
    done = true;
  });
  return () => done;
};

describe('the login window', () => {
  it('ends after the last page closes, taking a last snapshot first', async () => {
    const context = new FakeContext();
    const first = context.openPage();
    const snapshots: number[] = [];
    const closed = windowClosed(asContext(context), () => {
      snapshots.push(context.pages().length);
      return Promise.resolve();
    });
    const isDone = settled(closed);

    const popup = context.openPage();
    first.close();
    await Promise.resolve();
    expect(isDone()).toBe(false);

    popup.close();
    await closed;
    expect(snapshots).toEqual([0]);
    expect(context.listenerCount('close')).toBe(0);
    expect(context.listenerCount('page')).toBe(0);
    expect(popup.listenerCount('close')).toBe(0);
  });

  it('ends when the browser closes', async () => {
    const context = new FakeContext();
    context.openPage();
    const closed = windowClosed(asContext(context), () => Promise.resolve());
    context.emit('close');
    await expect(closed).resolves.toBeUndefined();
    expect(context.listenerCount('close')).toBe(0);
  });

  it('still ends when the last snapshot fails', async () => {
    const context = new FakeContext();
    const page = context.openPage();
    const closed = windowClosed(asContext(context), () => Promise.reject(new Error('gone')));
    page.close();
    await expect(closed).resolves.toBeUndefined();
  });
});
