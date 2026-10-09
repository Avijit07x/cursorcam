import { mkdir, readdir, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cacheRunsDir,
  createRunDirs,
  findRun,
  findRunFolder,
  makeRunId,
  openRunDirs,
  slugify,
  sweepOldRuns,
  writeRunFile,
} from '../../../src/runs/dirs.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('run folders', () => {
  const dir = useTempDir();

  it('names runs by name, time and a random suffix', () => {
    expect(slugify('Sign up & Invite — Café!')).toBe('sign-up-invite-cafe');
    expect(slugify('***')).toBe('demo');
    expect(slugify('a'.repeat(80))).toHaveLength(40);
    expect(makeRunId('Demo', new Date(2026, 9, 9, 8, 5, 3), 'ab12')).toBe(
      'demo-20261009-080503-ab12',
    );
  });

  it('creates the project folder and the cache folder', async () => {
    const dirs = await createRunDirs(
      'demo',
      join(dir.path(), 'out'),
      join(dir.path(), 'cache'),
      true,
    );

    expect(dirs.outDir.startsWith(join(dir.path(), 'out', 'demo-'))).toBe(true);
    expect(dirs.cacheDir).toBe(join(cacheRunsDir(join(dir.path(), 'cache')), dirs.id));
  });

  it('opens a run folder made by another process', async () => {
    const cache = join(dir.path(), 'cache');
    const made = await createRunDirs('demo', join(dir.path(), 'out'), cache, false);
    const opened = await openRunDirs(made.outDir, cache, true);

    expect(opened).toEqual(made);
    await expect(readdir(join(opened.cacheDir, 'frames'))).resolves.toEqual([]);
  });

  it('finds a run by folder path or by name', async () => {
    const outRoot = join(dir.path(), 'out');
    const dirs = await createRunDirs('demo', outRoot, join(dir.path(), 'cache'), true);
    await writeRunFile(dirs.outDir, {
      id: dirs.id,
      cacheDir: dirs.cacheDir,
      url: 'http://x',
      viewport: 'desktop',
      createdAt: 'now',
    });

    await expect(findRun(dirs.outDir)).resolves.toMatchObject({ outDir: dirs.outDir });
    await expect(findRun(dirs.id, outRoot)).resolves.toMatchObject({ run: { id: dirs.id } });
    expect(await findRunFolder('nope', outRoot)).toBe(join(outRoot, 'nope'));
    await expect(findRun('nope', outRoot)).rejects.toMatchObject({ exitCode: ExitCode.BadInput });
  });

  it('deletes cached runs older than a week', async () => {
    const root = cacheRunsDir(dir.path());
    await mkdir(join(root, 'old'), { recursive: true });
    await mkdir(join(root, 'new'), { recursive: true });
    const old = (Date.now() - 8 * DAY_MS) / 1000;
    await utimes(join(root, 'old'), old, old);

    expect(await sweepOldRuns(dir.path())).toBe(1);
    expect(await sweepOldRuns(join(dir.path(), 'missing'))).toBe(0);
  });
});
