import { describe, expect, it } from 'vitest';
import { limitSteps, reportFailure, runName } from '../../../src/cli/run-flow.js';
import { parseSteps } from '../../../src/config/load-steps.js';
import { posterFileName, videoFileName } from '../../../src/render/renderer.js';
import { readResult, readStatus, StatusFile } from '../../../src/runs/status.js';
import { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { Lifecycle } from '../../../src/system/lifecycle.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const plan = parseSteps(
  {
    url: 'http://localhost:3000',
    steps: [{ pause: 100 }, { click: 'text=Save' }, { ask: 'code', into: 'label=Code' }],
  },
  '/project/cursorcam-output/save flow.json',
);

describe('run options', () => {
  it('checks only the steps up to --until', () => {
    expect(limitSteps(plan, undefined)).toBe(plan);
    expect(limitSteps(plan, 2).steps).toEqual([{ pause: 100 }, { click: 'text=Save' }]);
    expect(() => limitSteps(plan, 4)).toThrow(
      expect.objectContaining({
        exitCode: ExitCode.BadInput,
        message: '--until 4 is past the last step. The file has 3 steps.',
      }),
    );
  });

  it('names runs after the steps file, and marks check runs', () => {
    expect(runName(plan, plan.path, 'record')).toBe('save flow');
    expect(runName(plan, plan.path, 'check')).toBe('check-save flow');
    expect(
      runName({ ...plan, header: { ...plan.header, name: 'demo' } }, plan.path, 'record'),
    ).toBe('demo');
  });

  it('names each video and its poster after the preset and format', () => {
    expect(videoFileName('default', 'landscape')).toBe('video.mp4');
    expect(posterFileName('default', 'landscape')).toBe('poster.jpg');
    expect(videoFileName('discord', 'square')).toBe('video-discord-square.mp4');
    expect(posterFileName('discord', 'square')).toBe('poster-discord-square.jpg');
    expect(posterFileName('default', 'vertical')).toBe('poster-vertical.jpg');
  });
});

describe('reportFailure', () => {
  const out = useTempDir();
  const failure = new CursorCamError('Step 2 failed', { exitCode: ExitCode.StepFailed });

  it('saves the failure for wait to read', async () => {
    await reportFailure(out.path(), new StatusFile(out.path()), failure, new Lifecycle());

    expect(await readResult(out.path())).toMatchObject({
      ok: false,
      exitCode: ExitCode.StepFailed,
      error: 'Step 2 failed',
    });
    expect(await readStatus(out.path())).toMatchObject({ state: 'failed' });
  });

  it('saves nothing once the run is shutting down, so wait reports it as stopped', async () => {
    const lifecycle = new Lifecycle();
    await lifecycle.dispose();

    await reportFailure(out.path(), new StatusFile(out.path()), failure, lifecycle);

    expect(await readResult(out.path())).toBeUndefined();
    expect(await readStatus(out.path())).toBeUndefined();
  });
});
