import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { sleep } from '../shared/time.js';
import { isProcessAlive } from '../system/process.js';
import { OUTPUT_ROOT } from './dirs.js';
import { readResult, readStatus, type SavedResult, type SavedStatus } from './status.js';

export type RunCheck =
  | { readonly state: 'done'; readonly result: SavedResult }
  | { readonly state: 'failed'; readonly result: SavedResult }
  | { readonly state: 'waiting'; readonly ask: string }
  | { readonly state: 'running'; readonly status: SavedStatus | undefined }
  | { readonly state: 'stopped'; readonly status: SavedStatus };

export interface WaitOptions {
  readonly timeoutMs: number;
  readonly intervalMs?: number;
  readonly isAlive?: (pid: number) => boolean;
}

const DEFAULT_INTERVAL_MS = 500;

export async function checkRun(
  outDir: string,
  isAlive: (pid: number) => boolean = isProcessAlive,
): Promise<RunCheck> {
  const status = await readStatus(outDir);
  if (status?.state === 'done' || status?.state === 'failed') {
    const result = await readResult(outDir);
    if (result) return { state: result.ok ? 'done' : 'failed', result };
  }
  if (status?.pid !== undefined && !isAlive(status.pid)) {
    return { state: 'stopped', status };
  }
  if (status?.state === 'waiting' && status.ask !== undefined) {
    return { state: 'waiting', ask: status.ask };
  }
  return { state: 'running', status };
}

export async function waitForRun(outDir: string, options: WaitOptions): Promise<RunCheck> {
  const interval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const end = performance.now() + options.timeoutMs;
  for (;;) {
    const check = await checkRun(outDir, options.isAlive);
    const left = end - performance.now();
    if (check.state !== 'running' || left <= 0) return check;
    await sleep(Math.min(interval, left));
  }
}

export async function latestRun(outRoot: string = OUTPUT_ROOT): Promise<string> {
  const root = resolve(outRoot);
  const names = await readdir(root).catch(() => []);
  const dirs = await Promise.all(
    names.map(async (name) => {
      const info = await stat(join(root, name)).catch(() => undefined);
      return info?.isDirectory() ? { dir: join(root, name), time: info.mtimeMs } : undefined;
    }),
  );
  const newest = dirs.filter((entry) => entry !== undefined).toSorted((a, b) => b.time - a.time)[0];
  if (!newest) {
    throw new CursorCamError(`There are no runs in ${root}.`, {
      exitCode: ExitCode.BadInput,
      hint: 'Pass the run folder, like: cursorcam wait cursorcam-output/<run>',
    });
  }
  return newest.dir;
}
