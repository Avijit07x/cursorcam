import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  FRAMES_DIR,
  FRAMES_INDEX_FILE,
  FrameStore,
  frameFileName,
} from '../../../src/record/frames.js';
import type { ScreencastFrame } from '../../../src/record/screencast.js';
import type { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';
import { mkdir } from 'node:fs/promises';

const frame = (text: string, timestamp = 1): ScreencastFrame => ({
  data: Buffer.from(text),
  timestamp,
  scrollX: 0,
  scrollY: 10,
});

describe('FrameStore', () => {
  const dir = useTempDir();
  let now = 0;
  const clock = { now: () => now };

  it('saves changed frames with their times and skips repeats', async () => {
    await mkdir(join(dir.path(), FRAMES_DIR));
    const store = new FrameStore({ clock, dir: dir.path(), onError: vi.fn() });
    now = 100;
    store.add(frame('a', 1.5), 0);
    now = 120;
    store.add(frame('a', 1.52), 0);
    now = 140;
    store.add(frame('b', 1.54), 1);

    const records = await store.close();
    expect(records).toEqual([
      { index: 1, at: 100, ts: 1500, scrollX: 0, scrollY: 10, tab: 0 },
      { index: 2, at: 140, ts: 1540, scrollX: 0, scrollY: 10, tab: 1 },
    ]);
    expect(store.lastFrameAt).toBe(140);
    expect(await readdir(join(dir.path(), FRAMES_DIR))).toEqual([
      frameFileName(1),
      frameFileName(2),
    ]);
    expect(
      (await readFile(join(dir.path(), FRAMES_INDEX_FILE), 'utf8')).trim().split('\n'),
    ).toHaveLength(2);
  });

  it('keeps only the latest frame in memory when it has no folder', async () => {
    const store = new FrameStore({ clock, onError: vi.fn() });
    store.add(frame('x'), 0);

    expect(store.latest?.toString()).toBe('x');
    expect(await store.close()).toEqual([]);
  });

  it('hands the next new frame to waiters, or the latest one after the wait', async () => {
    const store = new FrameStore({ clock, onError: vi.fn() });
    store.add(frame('first'), 0);
    const next = store.nextFrame(1_000);
    store.add(frame('second'), 0);

    expect((await next)?.toString()).toBe('second');
    expect((await store.nextFrame(10))?.toString()).toBe('second');
  });

  it('stops with exit 8 when the disk runs low', async () => {
    await mkdir(join(dir.path(), FRAMES_DIR));
    const onError = vi.fn<(error: CursorCamError) => void>();
    const store = new FrameStore({
      clock,
      dir: dir.path(),
      onError,
      freeBytes: () => Promise.resolve(1024),
    });
    for (let index = 0; index < 120; index += 1) store.add(frame(`f${index}`), 0);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

    expect(onError.mock.calls[0]?.[0].exitCode).toBe(ExitCode.DiskFull);
    store.add(frame('late'), 0);
    await store.close();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports write failures once', async () => {
    const onError = vi.fn<(error: CursorCamError) => void>();
    const store = new FrameStore({ clock, dir: join(dir.path(), 'missing'), onError });
    store.add(frame('a'), 0);
    store.add(frame('b'), 0);
    await store.close();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0].exitCode).toBe(ExitCode.Internal);
  });
});
