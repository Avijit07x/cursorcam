import { randomBytes } from 'node:crypto';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { removeDir } from '../system/cleanup.js';
import { FRAMES_DIR } from '../record/frames.js';
import { readJson, writeJsonAtomic } from './files.js';

export const OUTPUT_ROOT = 'cursorcam-output';
export const RUN_FILE = 'run.json';
export const EVENTS_FILE = 'events.jsonl';
export const META_FILE = 'meta.json';
const RANDOM_SUFFIX_BYTES = 2;
const MAX_SLUG_LENGTH = 40;
const FALLBACK_SLUG = 'demo';
const RUN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface RunDirs {
  readonly id: string;
  readonly outDir: string;
  readonly cacheDir: string;
}

const RunFileSchema = z.object({
  id: z.string(),
  cacheDir: z.string(),
  url: z.string(),
  viewport: z.enum(['desktop', 'phone']),
  createdAt: z.string(),
});

export type RunFile = z.output<typeof RunFileSchema>;

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
  return slug || FALLBACK_SLUG;
}

export function makeRunId(
  name: string,
  now: Date = new Date(),
  random: string = randomBytes(RANDOM_SUFFIX_BYTES).toString('hex'),
): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${slugify(name)}-${date}-${time}-${random}`;
}

export function cacheRunsDir(cache: string): string {
  return join(cache, 'runs');
}

export async function createRunDirs(
  name: string,
  outRoot: string,
  cache: string,
  keepFrames: boolean,
): Promise<RunDirs> {
  const id = makeRunId(name);
  const outDir = resolve(outRoot, id);
  const cacheDir = join(cacheRunsDir(cache), id);
  await mkdir(outDir, { recursive: true });
  if (keepFrames) await mkdir(join(cacheDir, FRAMES_DIR), { recursive: true });
  return { id, outDir, cacheDir };
}

export async function openRunDirs(
  outDir: string,
  cache: string,
  keepFrames: boolean,
): Promise<RunDirs> {
  const id = basename(outDir);
  const cacheDir = join(cacheRunsDir(cache), id);
  if (keepFrames) await mkdir(join(cacheDir, FRAMES_DIR), { recursive: true });
  return { id, outDir: resolve(outDir), cacheDir };
}

export async function writeRunFile(outDir: string, run: RunFile): Promise<void> {
  await writeJsonAtomic(join(outDir, RUN_FILE), run);
}

export async function findRunFolder(arg: string, outRoot: string = OUTPUT_ROOT): Promise<string> {
  const direct = resolve(arg);
  const exists = await stat(direct).then(
    (info) => info.isDirectory(),
    () => false,
  );
  return exists || isAbsolute(arg) ? direct : resolve(outRoot, arg);
}

export async function findRun(
  arg: string,
  outRoot: string = OUTPUT_ROOT,
): Promise<{ outDir: string; run: RunFile }> {
  const outDir = await findRunFolder(arg, outRoot);
  const parsed = RunFileSchema.safeParse(await readJson(join(outDir, RUN_FILE), 'a recorded run'));
  if (!parsed.success) {
    throw new CursorCamError(`${join(outDir, RUN_FILE)} is damaged.`, {
      exitCode: ExitCode.BadInput,
    });
  }
  return { outDir, run: parsed.data };
}

export async function sweepOldRuns(cache: string, now: number = Date.now()): Promise<number> {
  const root = cacheRunsDir(cache);
  const names = await readdir(root).catch(() => []);
  let removed = 0;
  for (const name of names) {
    const dir = join(root, name);
    const info = await stat(dir).catch(() => undefined);
    if (info && now - info.mtimeMs > RUN_MAX_AGE_MS) {
      await removeDir(dir);
      removed += 1;
    }
  }
  return removed;
}
