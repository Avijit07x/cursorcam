import type { Page } from 'playwright-core';
import { describe, expect, it, vi } from 'vitest';
import { watchLiveness } from '../../../src/record/liveness.js';
import type { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

const fakePage = (closed = false) => ({ isClosed: () => closed }) as unknown as Page;

describe('watchLiveness', () => {
  it('reports a page that stops answering during a quiet stretch', async () => {
    const onHung = vi.fn<(error: CursorCamError) => void>();
    const stop = watchLiveness({
      page: () => fakePage(),
      lastFrameAt: () => 0,
      now: () => 10_000,
      onHung,
      ping: () => new Promise(() => undefined),
      checkEveryMs: 10,
      pingTimeoutMs: 20,
    });
    await vi.waitFor(() => expect(onHung).toHaveBeenCalled());
    stop();

    expect(onHung.mock.calls[0]?.[0].exitCode).toBe(ExitCode.Crashed);
  });

  it('stays quiet while frames arrive, pings answer, or the page is closed', async () => {
    const onHung = vi.fn();
    const ping = vi.fn(() => Promise.resolve(true));
    const busy = watchLiveness({
      page: () => fakePage(),
      lastFrameAt: () => 9_000,
      now: () => 10_000,
      onHung,
      ping,
      checkEveryMs: 5,
    });
    const answering = watchLiveness({
      page: () => fakePage(),
      lastFrameAt: () => 0,
      now: () => 10_000,
      onHung,
      ping,
      checkEveryMs: 5,
    });
    const closed = watchLiveness({
      page: () => fakePage(true),
      lastFrameAt: () => 0,
      now: () => 10_000,
      onHung,
      ping: () => new Promise(() => undefined),
      checkEveryMs: 5,
      pingTimeoutMs: 10,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    busy();
    answering();
    closed();

    expect(ping).toHaveBeenCalled();
    expect(onHung).not.toHaveBeenCalled();
  });
});
