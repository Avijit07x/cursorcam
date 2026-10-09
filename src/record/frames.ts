import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { freeBytes as systemFreeBytes } from '../system/disk.js';
import type { Clock } from './events.js';
import type { ScreencastFrame } from './screencast.js';

export interface FrameRecord {
  readonly index: number;
  readonly at: number;
  readonly ts: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly tab: number;
}

export const FRAMES_INDEX_FILE = 'frames.jsonl';
export const FRAMES_DIR = 'frames';
const FRAME_FILE_DIGITS = 6;
const LOW_DISK_BYTES = 512 * 1024 ** 2;
const DISK_CHECK_EVERY_FRAMES = 120;
const MS_PER_SECOND = 1000;

export function frameFileName(index: number): string {
  return `${String(index).padStart(FRAME_FILE_DIGITS, '0')}.jpg`;
}

export interface FrameStoreOptions {
  readonly clock: Clock;
  readonly onError: (error: CursorCamError) => void;
  readonly dir?: string;
  readonly freeBytes?: (dir: string) => Promise<number>;
}

export class FrameStore {
  readonly #options: FrameStoreOptions;
  readonly #records: FrameRecord[] = [];
  readonly #waiters = new Set<(frame: Buffer) => void>();
  #latest: Buffer | undefined;
  #lastFrameAt = 0;
  #writing: Promise<void> = Promise.resolve();
  #failed = false;

  constructor(options: FrameStoreOptions) {
    this.#options = options;
  }

  get latest(): Buffer | undefined {
    return this.#latest;
  }

  get count(): number {
    return this.#records.length;
  }

  get lastFrameAt(): number {
    return this.#lastFrameAt;
  }

  add(frame: ScreencastFrame, tab: number): void {
    const at = this.#options.clock.now();
    this.#lastFrameAt = at;
    if (this.#latest?.equals(frame.data)) return;
    this.#latest = frame.data;
    for (const waiter of this.#waiters) waiter(frame.data);
    this.#waiters.clear();

    const { dir } = this.#options;
    if (!dir || this.#failed) return;
    const index = this.#records.length + 1;
    this.#records.push({
      index,
      at,
      ts: frame.timestamp * MS_PER_SECOND,
      scrollX: frame.scrollX,
      scrollY: frame.scrollY,
      tab,
    });
    const file = join(dir, FRAMES_DIR, frameFileName(index));
    this.#writing = this.#writing
      .then(() => (this.#failed ? undefined : writeFile(file, frame.data)))
      .catch((error: unknown) => this.#fail(error));
    if (index % DISK_CHECK_EVERY_FRAMES === 0) void this.#checkDisk(dir);
  }

  nextFrame(timeoutMs: number): Promise<Buffer | undefined> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.#waiters.delete(onFrame);
        resolve(this.#latest);
      }, timeoutMs);
      const onFrame = (frame: Buffer) => {
        clearTimeout(timer);
        resolve(frame);
      };
      this.#waiters.add(onFrame);
    });
  }

  async close(): Promise<readonly FrameRecord[]> {
    await this.#writing;
    const { dir } = this.#options;
    if (dir && !this.#failed) {
      const lines = this.#records.map((record) => JSON.stringify(record)).join('\n');
      await writeFile(join(dir, FRAMES_INDEX_FILE), `${lines}\n`).catch((error: unknown) =>
        this.#fail(error),
      );
    }
    return this.#records;
  }

  async #checkDisk(dir: string): Promise<void> {
    const free = await (this.#options.freeBytes ?? systemFreeBytes)(dir).catch(() => Infinity);
    if (free < LOW_DISK_BYTES) this.#fail(Object.assign(new Error('low disk'), { code: 'ENOSPC' }));
  }

  #fail(error: unknown): void {
    if (this.#failed) return;
    this.#failed = true;
    const diskFull = (error as NodeJS.ErrnoException).code === 'ENOSPC';
    this.#options.onError(
      diskFull
        ? new CursorCamError('The disk is almost full, so recording stopped.', {
            exitCode: ExitCode.DiskFull,
            hint: 'Free some disk space, then record again.',
            cause: error,
          })
        : new CursorCamError('Could not save video frames.', {
            exitCode: ExitCode.Internal,
            cause: error,
          }),
    );
  }
}
