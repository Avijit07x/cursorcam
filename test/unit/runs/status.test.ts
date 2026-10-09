import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJson, writeJsonAtomic } from '../../../src/runs/files.js';
import { readRecordingMeta, writeRecordingMeta } from '../../../src/runs/meta.js';
import {
  readResult,
  readStatus,
  RESULT_FILE,
  STATUS_FILE,
  StatusFile,
  writeResult,
} from '../../../src/runs/status.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('run files', () => {
  const dir = useTempDir();

  it('writes the latest status with a time stamp', async () => {
    const status = new StatusFile(dir.path());
    void status.update({ state: 'recording', step: 1, steps: 3 });
    await status.update({ state: 'recording', step: 2, steps: 3 });
    await status.flush();

    const saved = JSON.parse(await readFile(join(dir.path(), STATUS_FILE), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(saved).toMatchObject({ state: 'recording', step: 2, pid: process.pid });
    expect(typeof saved.updatedAt).toBe('string');
    expect(await readStatus(dir.path())).toMatchObject({ state: 'recording', step: 2 });
  });

  it('reads back status and result files, and ignores missing or broken ones', async () => {
    expect(await readStatus(dir.path())).toBeUndefined();
    expect(await readResult(dir.path())).toBeUndefined();
    await writeResult(dir.path(), { ok: false, exitCode: ExitCode.StepFailed, failedStep: 2 });
    expect(await readResult(dir.path())).toEqual({ ok: false, exitCode: 4, failedStep: 2 });
    await writeFile(join(dir.path(), STATUS_FILE), '{');
    expect(await readStatus(dir.path())).toBeUndefined();
    await writeFile(join(dir.path(), STATUS_FILE), '{"state":"dancing"}');
    expect(await readStatus(dir.path())).toBeUndefined();
  });

  it('writes results and reads JSON back, with clear errors', async () => {
    await writeResult(dir.path(), { ok: true, exitCode: ExitCode.Ok, video: 'v.mp4' });
    expect(await readJson(join(dir.path(), RESULT_FILE), 'the result')).toEqual({
      ok: true,
      exitCode: 0,
      video: 'v.mp4',
    });

    await writeFile(join(dir.path(), 'broken.json'), '{');
    await expect(readJson(join(dir.path(), 'broken.json'), 'x')).rejects.toThrow('is damaged');
    await expect(readJson(join(dir.path(), 'none.json'), 'the run')).rejects.toThrow(
      'Could not find the run',
    );
  });

  it('replaces files atomically', async () => {
    const file = join(dir.path(), 'a.json');
    await writeJsonAtomic(file, { a: 1 });
    await writeJsonAtomic(file, { a: 2 });

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ a: 2 });
    await expect(writeJsonAtomic(join(dir.path(), 'missing', 'a.json'), {})).rejects.toThrow();
  });

  it('round-trips the recording facts and rejects broken ones', async () => {
    const meta = {
      version: 1 as const,
      identity: 'desktop' as const,
      viewport: { width: 1280, height: 800 },
      scale: 2,
      frames: 10,
      durationMs: 5000,
      startedAt: 'now',
      browser: 'Chrome 154',
      url: 'http://x',
    };
    await writeRecordingMeta(dir.path(), meta);
    expect(await readRecordingMeta(dir.path())).toEqual(meta);

    await writeJsonAtomic(join(dir.path(), 'meta.json'), { version: 2 });
    await expect(readRecordingMeta(dir.path())).rejects.toThrow('is incomplete');
  });
});
