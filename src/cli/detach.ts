import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSteps } from '../config/load-steps.js';
import { findSavedLogin } from '../login/saved.js';
import type { RecordMode } from '../record/recorder.js';
import { createRunDirs, OUTPUT_ROOT } from '../runs/dirs.js';
import { writeJsonAtomic } from '../runs/files.js';
import { STATUS_FILE } from '../runs/status.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { resolvePaths } from '../system/paths.js';
import { limitSteps, runName, type RunOptions } from './run-flow.js';

export const LOG_FILE = 'log.txt';

const CLI_ENTRY = fileURLToPath(new URL('./index.js', import.meta.url));
const DETACH_FLAG = '--detach';
const RUN_FOLDER_FLAG = '--run-folder';

export async function startDetached(
  stepsPath: string,
  options: RunOptions,
  mode: RecordMode,
): Promise<ExitCode> {
  const plan = limitSteps(await loadSteps(stepsPath), options.until);
  const paths = resolvePaths();
  if (options.profile) await findSavedLogin(paths, options.profile);
  const dirs = await createRunDirs(
    runName(plan, stepsPath, mode),
    options.out ?? OUTPUT_ROOT,
    paths.cache,
    false,
  );
  const args = [
    ...process.argv.slice(2).filter((arg) => arg !== DETACH_FLAG),
    RUN_FOLDER_FLAG,
    dirs.outDir,
  ];
  const pid = await spawnDetached(args, join(dirs.outDir, LOG_FILE));
  await writeJsonAtomic(join(dirs.outDir, STATUS_FILE), {
    state: 'starting',
    pid,
    updatedAt: new Date().toISOString(),
  });
  const lines = options.json
    ? [JSON.stringify({ run: dirs.outDir, pid }, null, 2)]
    : [
        `Run folder: ${dirs.outDir}`,
        `Started in the background. Follow it with: cursorcam wait "${dirs.outDir}"`,
      ];
  process.stdout.write(`${lines.join('\n')}\n`);
  return ExitCode.Ok;
}

async function spawnDetached(args: readonly string[], logFile: string): Promise<number> {
  const log = await open(logFile, 'a');
  try {
    const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
      detached: true,
      stdio: ['ignore', log.fd, log.fd],
      windowsHide: true,
    });
    child.once('error', () => undefined);
    child.unref();
    if (child.pid === undefined) {
      throw new CursorCamError('Could not start the run in the background.', {
        exitCode: ExitCode.Internal,
      });
    }
    return child.pid;
  } finally {
    await log.close();
  }
}
