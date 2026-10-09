import { mkdir, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeCheck } from '../../../src/cli/commands/wait.js';
import { writeJsonAtomic } from '../../../src/runs/files.js';
import { RESULT_FILE, STATUS_FILE } from '../../../src/runs/status.js';
import { checkRun, latestRun, waitForRun } from '../../../src/runs/wait.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const alive = () => true;
const dead = () => false;

describe('waiting for a run', () => {
  const dir = useTempDir();

  const writeStatus = (status: object) => writeJsonAtomic(join(dir.path(), STATUS_FILE), status);
  const writeResultFile = (result: object) =>
    writeJsonAtomic(join(dir.path(), RESULT_FILE), result);

  it('reports a run that has not written a status yet as running', async () => {
    expect(await checkRun(dir.path(), alive)).toEqual({ state: 'running', status: undefined });
  });

  it('reports progress, answers asked for, and the final result', async () => {
    await writeStatus({ state: 'recording', step: 2, steps: 5, action: 'click', pid: 7 });
    expect(await checkRun(dir.path(), alive)).toMatchObject({
      state: 'running',
      status: { step: 2, steps: 5 },
    });

    await writeStatus({ state: 'waiting', ask: '2FA code', answerSocket: '/tmp/s', pid: 7 });
    expect(await checkRun(dir.path(), alive)).toEqual({ state: 'waiting', ask: '2FA code' });

    await writeResultFile({ ok: true, exitCode: 0, video: '/v.mp4' });
    await writeStatus({ state: 'done', pid: 7 });
    expect(await checkRun(dir.path(), alive)).toMatchObject({
      state: 'done',
      result: { video: '/v.mp4' },
    });

    await writeResultFile({ ok: false, exitCode: ExitCode.StepFailed, error: 'nope' });
    await writeStatus({ state: 'failed', pid: 7 });
    expect(await checkRun(dir.path(), dead)).toMatchObject({
      state: 'failed',
      result: { exitCode: ExitCode.StepFailed },
    });
  });

  it('notices a run whose process is gone', async () => {
    await writeStatus({ state: 'waiting', ask: 'code', pid: 7 });
    expect(await checkRun(dir.path(), dead)).toMatchObject({ state: 'stopped' });
  });

  it('waits until the run leaves the running state, or the time is up', async () => {
    await writeStatus({ state: 'rendering', progress: 0.5, pid: 7 });
    const started = performance.now();
    const timedOut = await waitForRun(dir.path(), {
      timeoutMs: 120,
      intervalMs: 20,
      isAlive: alive,
    });
    expect(timedOut.state).toBe('running');
    expect(performance.now() - started).toBeGreaterThanOrEqual(100);

    setTimeout(() => void writeStatus({ state: 'waiting', ask: 'code', pid: 7 }), 60);
    const waiting = await waitForRun(dir.path(), {
      timeoutMs: 5_000,
      intervalMs: 20,
      isAlive: alive,
    });
    expect(waiting).toEqual({ state: 'waiting', ask: 'code' });
  });

  it('finds the newest run folder', async () => {
    const root = join(dir.path(), 'cursorcam-output');
    await expect(latestRun(root)).rejects.toMatchObject({ exitCode: ExitCode.BadInput });
    await mkdir(join(root, 'old'), { recursive: true });
    await mkdir(join(root, 'new'));
    await writeJsonAtomic(join(root, 'steps.json'), {});
    await utimes(join(root, 'old'), new Date(2026, 0, 1), new Date(2026, 0, 1));
    expect(await latestRun(root)).toBe(join(root, 'new'));
  });

  it('describes each state in plain words', () => {
    const run = '/runs/demo';
    expect(
      describeCheck(run, {
        state: 'done',
        result: {
          ok: true,
          exitCode: 0,
          video: '/runs/demo/video.mp4',
          poster: '/runs/demo/poster.jpg',
          sizeBytes: 3_600_000,
          durationSeconds: 13.9,
          warnings: ['A field shows other text.'],
        },
      }),
    ).toEqual([
      'Done. Video: /runs/demo/video.mp4 (3.6 MB, 13.9 s)',
      'Poster: /runs/demo/poster.jpg',
      'Warning: A field shows other text.',
      'Run folder: /runs/demo',
    ]);
    expect(
      describeCheck(run, {
        state: 'failed',
        result: {
          ok: false,
          exitCode: 4,
          error: 'Could not find text=Save.',
          hint: 'Run inspect.',
          failedStep: 3,
          frame: '/runs/demo/failure.jpg',
        },
      }),
    ).toEqual([
      'Failed at step 3 (exit 4): Could not find text=Save.',
      'Fix: Run inspect.',
      'Frame: /runs/demo/failure.jpg',
      'Run folder: /runs/demo',
    ]);
    expect(describeCheck(run, { state: 'waiting', ask: '2FA code' })[0]).toBe(
      'Waiting for an answer: 2FA code',
    );
    expect(
      describeCheck(run, { state: 'running', status: { state: 'rendering', progress: 0.42 } })[0],
    ).toBe('Still rendering: 42%.');
    expect(
      describeCheck(run, {
        state: 'running',
        status: { state: 'recording', step: 2, steps: 9, action: 'type' },
      })[0],
    ).toBe('Still recording: step 2 of 9 (type).');
    expect(describeCheck(run, { state: 'running', status: undefined })[0]).toBe('Still starting.');
    expect(
      describeCheck(
        run,
        { state: 'stopped', status: { state: 'recording' } },
        '/runs/demo/log.txt',
      ),
    ).toEqual([
      'The run stopped before it finished, while recording.',
      'Fix: Start the run again.',
      'Log: /runs/demo/log.txt',
      'Run folder: /runs/demo',
    ]);
  });
});
