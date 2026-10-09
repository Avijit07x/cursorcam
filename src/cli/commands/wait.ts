import { access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from 'commander';
import { findRunFolder } from '../../runs/dirs.js';
import type { SavedStatus } from '../../runs/status.js';
import { latestRun, waitForRun, type RunCheck } from '../../runs/wait.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { formatBytes, formatSeconds } from '../../shared/format.js';
import { LOG_FILE } from '../detach.js';
import { runAction } from '../run-action.js';
import { parsePositiveInt } from './inspect.js';

interface WaitCommandOptions {
  readonly timeout: number;
  readonly json?: boolean;
}

const DEFAULT_TIMEOUT_SECONDS = 90;
const MS_PER_SECOND = 1000;
const PERCENT = 100;
const EXIT_CODES: ReadonlySet<number> = new Set(Object.values(ExitCode));

export function registerWait(program: Command): void {
  program
    .command('wait')
    .description('Wait until a run finishes, fails or needs an answer')
    .argument('[run]', 'run folder (default: the newest run)')
    .option(
      '--timeout <seconds>',
      'stop waiting after this many seconds',
      parsePositiveInt,
      DEFAULT_TIMEOUT_SECONDS,
    )
    .option('--json', 'print the result as JSON')
    .action((run: string | undefined, options: WaitCommandOptions) =>
      runAction(async () => {
        const outDir = run ? await existingRun(run) : await latestRun();
        const check = await waitForRun(outDir, { timeoutMs: options.timeout * MS_PER_SECOND });
        const log = await logFileIn(outDir);
        const output = options.json
          ? JSON.stringify({ run: outDir, ...check, ...(log ? { log } : {}) }, null, 2)
          : describeCheck(outDir, check, log).join('\n');
        process.stdout.write(`${output}\n`);
        return exitCodeFor(check);
      }),
    );
}

async function existingRun(arg: string): Promise<string> {
  const outDir = await findRunFolder(arg);
  const isDir = await stat(outDir).then(
    (info) => info.isDirectory(),
    () => false,
  );
  if (!isDir) {
    throw new CursorCamError(`There is no run folder at ${outDir}.`, {
      exitCode: ExitCode.BadInput,
    });
  }
  return outDir;
}

async function logFileIn(outDir: string): Promise<string | undefined> {
  const file = join(outDir, LOG_FILE);
  return access(file).then(
    () => file,
    () => undefined,
  );
}

export function describeCheck(outDir: string, check: RunCheck, log?: string): string[] {
  const folder = `Run folder: ${outDir}`;
  switch (check.state) {
    case 'done': {
      const { video, poster, sizeBytes, durationSeconds, warnings = [] } = check.result;
      const facts =
        sizeBytes !== undefined && durationSeconds !== undefined
          ? ` (${formatBytes(sizeBytes)}, ${formatSeconds(durationSeconds * MS_PER_SECOND)})`
          : '';
      return [
        video ? `Done. Video: ${video}${facts}` : 'Done.',
        ...(poster ? [`Poster: ${poster}`] : []),
        ...warnings.map((warning) => `Warning: ${warning}`),
        folder,
      ];
    }
    case 'failed': {
      const { error, hint, frame, failedStep, exitCode } = check.result;
      const where = failedStep === undefined ? '' : ` at step ${failedStep}`;
      return [
        `Failed${where} (exit ${exitCode}): ${error ?? 'unknown error'}`,
        ...(hint ? [`Fix: ${hint}`] : []),
        ...(frame ? [`Frame: ${frame}`] : []),
        folder,
      ];
    }
    case 'waiting':
      return [
        `Waiting for an answer: ${check.ask}`,
        `Send it with: printf '%s' '<answer>' | cursorcam answer "${outDir}"`,
        folder,
      ];
    case 'stopped':
      return [
        `The run stopped before it finished, while ${check.status.state}.`,
        'Fix: Start the run again.',
        ...(log ? [`Log: ${log}`] : []),
        folder,
      ];
    case 'running':
      return [`Still ${describeProgress(check.status)}`, `Wait again: cursorcam wait "${outDir}"`];
  }
}

function describeProgress(status: SavedStatus | undefined): string {
  if (!status || status.state === 'starting') return 'starting.';
  if (status.state === 'rendering') {
    return `rendering: ${Math.round((status.progress ?? 0) * PERCENT)}%.`;
  }
  if (status.step !== undefined && status.steps !== undefined) {
    const action = status.action ? ` (${status.action})` : '';
    return `${status.state}: step ${status.step} of ${status.steps}${action}.`;
  }
  return `${status.state}.`;
}

function exitCodeFor(check: RunCheck): ExitCode {
  switch (check.state) {
    case 'failed':
      return EXIT_CODES.has(check.result.exitCode)
        ? (check.result.exitCode as ExitCode)
        : ExitCode.Internal;
    case 'stopped':
      return ExitCode.Interrupted;
    case 'done':
    case 'waiting':
    case 'running':
      return ExitCode.Ok;
  }
}
