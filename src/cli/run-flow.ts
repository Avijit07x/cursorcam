import { access, copyFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { loadSteps, type StepsPlan } from '../config/load-steps.js';
import { findSavedLogin } from '../login/saved.js';
import {
  CHECK_DIR,
  FAILURE_FRAME,
  recordSteps,
  type Recording,
  type RecordMode,
} from '../record/recorder.js';
import { describeStep, StepFailure } from '../record/run-steps.js';
import {
  createRunDirs,
  openRunDirs,
  OUTPUT_ROOT,
  sweepOldRuns,
  writeRunFile,
  type RunDirs,
  type RunFile,
} from '../runs/dirs.js';
import { StatusFile, writeResult, type RunResult } from '../runs/status.js';
import { exitCodeOf, messageOf, CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { redact, redactUrl } from '../shared/redact.js';
import type { Lifecycle } from '../system/lifecycle.js';
import { resolvePaths, type AppPaths } from '../system/paths.js';

export interface RunOptions {
  readonly out?: string;
  readonly profile?: string;
  readonly headed?: boolean;
  readonly json?: boolean;
  readonly until?: number;
  readonly detach?: boolean;
  readonly runFolder?: string;
}

export interface RecordedRun {
  readonly plan: StepsPlan;
  readonly dirs: RunDirs;
  readonly run: RunFile;
  readonly status: StatusFile;
  readonly paths: AppPaths;
  readonly recording: Recording;
}

const STEPS_COPY = 'steps.json';
const CHECK_NAME_PREFIX = 'check-';

export async function recordRun(
  stepsPath: string,
  options: RunOptions,
  mode: RecordMode,
  lifecycle: Lifecycle,
): Promise<RecordedRun> {
  const plan = limitSteps(await loadSteps(stepsPath), options.until);
  const paths = resolvePaths();
  if (mode === 'record') await sweepOldRuns(paths.cache);
  const loginState = options.profile ? await findSavedLogin(paths, options.profile) : undefined;
  const dirs = options.runFolder
    ? await openRunDirs(options.runFolder, paths.cache, mode === 'record')
    : await createRunDirs(
        runName(plan, stepsPath, mode),
        options.out ?? OUTPUT_ROOT,
        paths.cache,
        mode === 'record',
      );
  process.stderr.write(`Run folder: ${dirs.outDir}\n`);
  await copyFile(plan.path, join(dirs.outDir, STEPS_COPY));
  const run: RunFile = {
    id: dirs.id,
    cacheDir: dirs.cacheDir,
    url: redactUrl(plan.header.url),
    viewport: plan.header.viewport,
    createdAt: new Date().toISOString(),
  };
  if (mode === 'record') await writeRunFile(dirs.outDir, run);
  const status = new StatusFile(dirs.outDir);
  try {
    const recording = await recordSteps({
      plan,
      paths,
      dirs,
      mode,
      lifecycle,
      status,
      headed: options.headed ?? false,
      loginState,
      onStepDone: (index, frame) =>
        printStep(plan, index, '✓', frame && relativeTo(dirs.outDir, frame)),
    });
    return { plan, dirs, run, status, paths, recording };
  } catch (error) {
    if (error instanceof StepFailure) printStep(plan, error.stepIndex, '✗');
    await reportFailure(dirs.outDir, status, error);
    throw error;
  }
}

export async function reportFailure(
  outDir: string,
  status: StatusFile,
  error: unknown,
): Promise<void> {
  const frame = join(outDir, FAILURE_FRAME);
  const hasFrame = await access(frame).then(
    () => true,
    () => false,
  );
  const message = redact(messageOf(error));
  await writeResult(outDir, {
    ok: false,
    exitCode: exitCodeOf(error),
    error: message,
    ...(error instanceof CursorCamError && error.hint ? { hint: error.hint } : {}),
    ...(error instanceof StepFailure ? { failedStep: error.stepIndex + 1 } : {}),
    ...(hasFrame ? { frame } : {}),
  });
  await status.update({ state: 'failed', message });
  if (hasFrame) process.stderr.write(`Frame: ${frame}\n`);
}

export async function reportSuccess(
  outDir: string,
  status: StatusFile,
  result: Omit<RunResult, 'ok' | 'exitCode'>,
): Promise<RunResult> {
  const full: RunResult = { ok: true, exitCode: ExitCode.Ok, ...result };
  await writeResult(outDir, full);
  await status.update({ state: 'done' });
  return full;
}

export function checkFramesDir(outDir: string): string {
  return join(outDir, CHECK_DIR);
}

export function runName(plan: StepsPlan, stepsPath: string, mode: RecordMode): string {
  const name = plan.header.name ?? basename(stepsPath, extname(stepsPath));
  return mode === 'check' ? `${CHECK_NAME_PREFIX}${name}` : name;
}

export function limitSteps(plan: StepsPlan, until: number | undefined): StepsPlan {
  if (until === undefined) return plan;
  if (until > plan.steps.length) {
    throw new CursorCamError(
      `--until ${until} is past the last step. The file has ${plan.steps.length} steps.`,
      { exitCode: ExitCode.BadInput },
    );
  }
  return { ...plan, steps: plan.steps.slice(0, until) };
}

function printStep(plan: StepsPlan, index: number, mark: string, frame?: string): void {
  const step = plan.steps[index];
  if (!step) return;
  const total = plan.steps.length;
  const line = `${mark} ${index + 1}/${total} ${describeStep(step)}${frame ? `  → ${frame}` : ''}`;
  process.stderr.write(`${redact(line)}\n`);
}

function relativeTo(dir: string, file: string): string {
  return file.startsWith(dir) ? file.slice(dir.length + 1) : file;
}
