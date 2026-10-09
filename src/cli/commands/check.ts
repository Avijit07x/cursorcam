import type { Command } from 'commander';
import { ExitCode } from '../../shared/exit-codes.js';
import { startDetached } from '../detach.js';
import { checkFramesDir, recordRun, reportSuccess, type RunOptions } from '../run-flow.js';
import { runAction } from '../run-action.js';
import { parsePositiveInt } from './inspect.js';
import { addRunOptions } from './record.js';

export function registerCheck(program: Command): void {
  addRunOptions(
    program
      .command('check')
      .description('Dry-run the steps and save one frame per step')
      .argument('<steps>', 'steps file (JSON)'),
  )
    .option('--until <step>', 'stop after this step number', parsePositiveInt)
    .action((steps: string, options: RunOptions) =>
      runAction(async (lifecycle) => {
        if (options.detach) return startDetached(steps, options, 'check');
        const run = await recordRun(steps, options, 'check', lifecycle);
        const frames = checkFramesDir(run.dirs.outDir);
        const result = await reportSuccess(run.dirs.outDir, run.status, {
          warnings: run.recording.warnings,
        });
        const lines = options.json
          ? [JSON.stringify({ ...result, frames }, null, 2)]
          : [
              `${options.until ? `Steps 1 to ${options.until}` : `All ${run.plan.steps.length} steps`} passed. Frames: ${frames}`,
              ...run.recording.warnings.map((warning) => `Warning: ${warning}`),
            ];
        process.stdout.write(`${lines.join('\n')}\n`);
        return ExitCode.Ok;
      }),
    );
}
