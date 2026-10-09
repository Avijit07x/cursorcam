import { Option, type Command } from 'commander';
import { ExitCode } from '../../shared/exit-codes.js';
import { formatSeconds } from '../../shared/format.js';
import { startDetached } from '../detach.js';
import { recordRun, reportSuccess, type RunOptions } from '../run-flow.js';
import { runAction } from '../run-action.js';

export function addRunOptions(command: Command): Command {
  return command
    .option('--out <dir>', 'folder for run folders', undefined)
    .option('--profile <name>', 'use a login saved with cursorcam login')
    .option('--headed', 'show the browser window')
    .option('--detach', 'run in the background and print the run folder; follow it with wait')
    .addOption(new Option('--run-folder <dir>').hideHelp())
    .option('--json', 'print the result as JSON');
}

export function registerRecord(program: Command): void {
  addRunOptions(
    program
      .command('record')
      .description('Record the steps into a run folder, without rendering')
      .argument('<steps>', 'steps file (JSON)'),
  ).action((steps: string, options: RunOptions) =>
    runAction(async (lifecycle) => {
      if (options.detach) return startDetached(steps, options, 'record');
      const run = await recordRun(steps, options, 'record', lifecycle);
      const { recording, dirs } = run;
      const result = await reportSuccess(dirs.outDir, run.status, {
        durationSeconds: recording.durationMs / 1000,
        warnings: recording.warnings,
      });
      const lines = options.json
        ? [JSON.stringify({ ...result, run: dirs.outDir }, null, 2)]
        : [
            `Recorded ${run.plan.steps.length} steps in ${formatSeconds(recording.durationMs)}: ${dirs.outDir}`,
            ...recording.warnings.map((warning) => `Warning: ${warning}`),
            `Next: cursorcam render "${dirs.outDir}"`,
          ];
      process.stdout.write(`${lines.join('\n')}\n`);
      return ExitCode.Ok;
    }),
  );
}
