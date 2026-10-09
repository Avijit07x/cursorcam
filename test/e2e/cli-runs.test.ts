import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { jpegSize } from '../../src/shared/jpeg.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { solidPng } from '../helpers/png.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { browserAvailable, CLI_PATH, FAIL_FAST_TIMEOUT_MS, useTempCache } from './helpers.js';
import { frameRgb, hasTool } from './media.js';

interface CliResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  input?: string,
): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [CLI_PATH, ...args],
      { cwd, env },
      (error, stdout, stderr) => {
        resolve({ code: error ? Number(error.code ?? 1) : 0, stdout, stderr });
      },
    );
    child.stdin?.end(input ?? '');
  });
}

describe.skipIf(!browserAvailable())('cursorcam check and record', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const work = useTempDir('each');

  const writeSteps = async (steps: object) => {
    const file = join(work.path(), 'demo steps.json');
    await writeFile(file, JSON.stringify(steps));
    return file;
  };
  const onlyRun = async () => {
    const [run] = await readdir(join(work.path(), 'cursorcam-output'));
    return join(work.path(), 'cursorcam-output', run ?? '');
  };

  it('check saves a frame per step and a result file', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ click: "role=button[name='Get started']" }, { type: 'Robin', into: 'label=Email' }],
    });
    const result = await runCli(['check', steps], work.path(), cache.env());

    expect(result.code).toBe(ExitCode.Ok);
    expect(result.stderr).toContain('✓ 2/2 type into label=Email');
    const run = await onlyRun();
    expect(await readdir(join(run, 'check'))).toEqual(['step-01.jpg', 'step-02.jpg']);
    expect(JSON.parse(await readFile(join(run, 'result.json'), 'utf8'))).toMatchObject({
      ok: true,
    });
  });

  it('check stops at the first failure with its exit code, frame and step number', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      timeout: FAIL_FAST_TIMEOUT_MS,
      steps: [{ click: "role=button[name='Get started']" }, { click: 'text=Nope' }, { pause: 10 }],
    });
    const result = await runCli(['check', steps, '--json'], work.path(), cache.env());

    expect(result.code).toBe(ExitCode.StepFailed);
    expect(result.stderr).toContain('✗ 2/3 click text=Nope');
    const run = await onlyRun();
    const saved = JSON.parse(await readFile(join(run, 'result.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(saved).toMatchObject({ ok: false, exitCode: ExitCode.StepFailed, failedStep: 2 });
    expect(await readdir(run)).toContain('failure.jpg');
  });

  it('record keeps the secret out of the output and points to the next command', async () => {
    const secret = 'pa55-w0rd-xyz';
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ type: '$secret:password', into: 'label=Password' }],
    });
    const result = await runCli(['record', steps], work.path(), {
      ...cache.env(),
      CURSORCAM_SECRET_PASSWORD: secret,
    });

    expect(result.code).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('Next: cursorcam render');
    const run = await onlyRun();
    for (const name of await readdir(run)) {
      expect(await readFile(join(run, name), 'utf8').catch(() => '')).not.toContain(secret);
    }
  });

  it('run records and renders, then render and stills reuse the recording', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ click: "role=button[name='Get started']" }, { type: 'Robin', into: 'label=Email' }],
    });
    const recorded = await runCli(['run', steps, '--json'], work.path(), cache.env());
    expect(recorded.code).toBe(ExitCode.Ok);
    const result = JSON.parse(recorded.stdout) as { run: string; video: string; sizeBytes: number };
    expect(result.video).toBe(join(result.run, 'video.mp4'));
    expect(result.sizeBytes).toBeGreaterThan(0);

    const square = await runCli(
      ['render', result.run, '--for', 'discord', '--format', 'square'],
      work.path(),
      cache.env(),
    );
    expect(square.code).toBe(ExitCode.Ok);
    expect(square.stdout).toMatch(
      /Video: .*video-discord-square\.mp4 \(\d+(\.\d)? (KB|MB), \d+\.\d s, 720×720 30 fps\)/,
    );

    const stills = await runCli(['stills', result.run, '--count', '2'], work.path(), cache.env());
    expect(stills.code).toBe(ExitCode.Ok);
    expect(await readdir(join(result.run, 'stills'))).toEqual([
      'crop-01-step-01.png',
      'crop-02-step-02.png',
      'still-01-step-01.png',
      'still-02-step-02.png',
    ]);
    expect(JSON.parse(await readFile(join(result.run, 'status.json'), 'utf8'))).toMatchObject({
      state: 'done',
    });

    const { cacheDir } = JSON.parse(await readFile(join(result.run, 'run.json'), 'utf8')) as {
      cacheDir: string;
    };
    const cleaned = await runCli(['render', result.run, '--clean'], work.path(), cache.env());
    expect(cleaned.code).toBe(ExitCode.Ok);
    await expect(readdir(cacheDir)).rejects.toThrow();
    const again = await runCli(['render', result.run], work.path(), cache.env());
    expect(again.code).toBe(ExitCode.BadInput);
  });

  it('answer passes a code to a run waiting at an ask step', async () => {
    const code = '739214';
    const steps = await writeSteps({
      url: site.url('/secrets.html'),
      steps: [
        { ask: 'Verification code', into: 'label=Verification code' },
        { click: 'text=Verify' },
      ],
    });
    const recording = runCli(['record', steps], work.path(), cache.env());
    let run = '';
    await expect
      .poll(
        async () => {
          const [name] = await readdir(join(work.path(), 'cursorcam-output')).catch(() => []);
          run = join(work.path(), 'cursorcam-output', name ?? '');
          const status = await readFile(join(run, 'status.json'), 'utf8').catch(() => '{}');
          return (JSON.parse(status) as { state?: string }).state;
        },
        { timeout: 20_000, interval: 200 },
      )
      .toBe('waiting');

    const answered = await runCli(['answer', run], work.path(), cache.env(), `${code}\n`);
    expect(answered.stdout).toBe('Sent the answer for "Verification code".\n');
    expect((await recording).code).toBe(ExitCode.Ok);
    const files = await readdir(run);
    for (const name of files) {
      expect(await readFile(join(run, name), 'utf8').catch(() => '')).not.toContain(code);
    }
    const notWaiting = await runCli(['answer', run], work.path(), cache.env(), 'x');
    expect(notWaiting.code).toBe(ExitCode.BadInput);
  });

  it('run --detach returns at once, and wait follows it to the video and poster', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ click: "role=button[name='Get started']" }, { type: 'Robin', into: 'label=Email' }],
    });
    const started = await runCli(['run', steps, '--detach', '--json'], work.path(), cache.env());
    expect(started.code).toBe(ExitCode.Ok);
    const { run } = JSON.parse(started.stdout) as { run: string; pid: number };

    const waited = await runCli(['wait', run, '--timeout', '50'], work.path(), cache.env());
    const runLog = await readFile(join(run, 'log.txt'), 'utf8').catch(() => '');
    expect(waited.code, `${waited.stdout}\n${runLog}`).toBe(ExitCode.Ok);
    expect(waited.stdout).toContain(`Done. Video: ${join(run, 'video.mp4')}`);
    expect(waited.stdout).toContain(`Poster: ${join(run, 'poster.jpg')}`);
    expect(jpegSize(await readFile(join(run, 'poster.jpg')))).toEqual({
      width: 1920,
      height: 1080,
    });
    const log = await readFile(join(run, 'log.txt'), 'utf8');
    expect(log).toContain('✓ 2/2 type into label=Email');
    expect(JSON.parse(await readFile(join(run, 'result.json'), 'utf8'))).toMatchObject({
      poster: join(run, 'poster.jpg'),
    });
  });

  it('a detached run waits for an answer, and keeps the code and secret out of every file', async () => {
    const code = '552211';
    const secret = 'tok-e2e-777';
    const steps = await writeSteps({
      url: site.url('/secrets.html'),
      steps: [
        { type: '$secret:token', into: 'label=API token' },
        { ask: 'Verification code', into: 'label=Verification code' },
        { click: 'text=Verify' },
      ],
    });
    const env = { ...cache.env(), CURSORCAM_SECRET_TOKEN: secret };
    const started = await runCli(['run', steps, '--detach', '--json'], work.path(), env);
    const { run } = JSON.parse(started.stdout) as { run: string };

    const asking = await runCli(['wait', run, '--timeout', '40'], work.path(), cache.env());
    expect(asking.stdout).toContain('Waiting for an answer: Verification code');
    expect(asking.stdout).toContain(`| cursorcam answer "${run}"`);
    const answered = await runCli(['answer', run], work.path(), cache.env(), code);
    expect(answered.code).toBe(ExitCode.Ok);
    const done = await runCli(['wait', run, '--timeout', '50'], work.path(), cache.env());
    expect(done.stdout).toContain('Done. Video:');
    for (const name of await readdir(run)) {
      const text = await readFile(join(run, name), 'utf8').catch(() => '');
      expect(text).not.toContain(code);
      expect(text).not.toContain(secret);
    }
  });

  it('wait notices a run whose process was stopped', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ pause: 20_000 }],
    });
    const started = await runCli(['record', steps, '--detach', '--json'], work.path(), cache.env());
    const { run, pid } = JSON.parse(started.stdout) as { run: string; pid: number };
    await expect
      .poll(
        async () =>
          (await runCli(['wait', run, '--timeout', '1'], work.path(), cache.env())).stdout,
        { timeout: 20_000, interval: 300 },
      )
      .toContain('Still recording');
    process.kill(pid, 'SIGTERM');

    await expect
      .poll(
        async () => (await runCli(['wait', run, '--timeout', '1'], work.path(), cache.env())).code,
        {
          timeout: 20_000,
          interval: 300,
        },
      )
      .toBe(ExitCode.Interrupted);
    const stopped = await runCli(['wait', run], work.path(), cache.env());
    expect(stopped.stdout).toContain('The run stopped before it finished, while recording.');
    expect(stopped.stdout).toContain(`Log: ${join(run, 'log.txt')}`);
  });

  it('check --until stops after that step', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [
        { click: "role=button[name='Get started']" },
        { type: 'Robin', into: 'label=Email' },
        { ask: 'Code', into: 'label=Email' },
      ],
    });
    const result = await runCli(['check', steps, '--until', '2'], work.path(), cache.env());

    expect(result.code).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('Steps 1 to 2 passed.');
    expect(await readdir(join(await onlyRun(), 'check'))).toEqual(['step-01.jpg', 'step-02.jpg']);
    const tooFar = await runCli(['check', steps, '--until', '4'], work.path(), cache.env());
    expect(tooFar.code).toBe(ExitCode.BadInput);
  });

  it('renders an image background found next to the style file', async () => {
    const brand = join(work.path(), 'brand');
    await mkdir(brand);
    await writeFile(join(brand, 'bg.png'), solidPng(64, 64, [255, 136, 0]));
    await writeFile(join(brand, 'style.json'), JSON.stringify({ background: { image: 'bg.png' } }));
    const steps = await writeSteps({ url: site.url('/basics.html'), steps: [{ pause: 300 }] });
    const result = await runCli(
      ['run', steps, '--for', 'discord', '--style', join(brand, 'style.json'), '--json'],
      work.path(),
      cache.env(),
    );

    expect(result.code).toBe(ExitCode.Ok);
    const { run, video } = JSON.parse(result.stdout) as { run: string; video: string };
    expect(JSON.parse(await readFile(join(run, 'style.json'), 'utf8'))).toMatchObject({
      background: { image: join(brand, 'bg.png') },
    });
    if (!(await hasTool('ffmpeg'))) return;
    const pixels = await frameRgb(video, 0.1);
    const corner = [...pixels.subarray(0, 3)];
    expect(Math.abs((corner[0] ?? 0) - 255)).toBeLessThanOrEqual(6);
    expect(Math.abs((corner[1] ?? 0) - 136)).toBeLessThanOrEqual(6);
    expect(corner[2] ?? 255).toBeLessThanOrEqual(6);
  });

  it('refuses bad render options with exit 2', async () => {
    const result = await runCli(['render', 'nowhere', '--for', 'tiktok'], work.path(), cache.env());

    expect(result.code).toBe(ExitCode.BadInput);
    expect(result.stderr).toContain('Use one of: default, youtube, x, linkedin, discord.');
  });

  it('rejects a missing secret before opening a browser', async () => {
    const steps = await writeSteps({
      url: site.url('/basics.html'),
      steps: [{ type: '$secret:password', into: 'label=Password' }],
    });
    const result = await runCli(['record', steps], work.path(), cache.env());

    expect(result.code).toBe(ExitCode.BadInput);
    expect(result.stderr).toContain('CURSORCAM_SECRET_PASSWORD is not set');
  });
});
