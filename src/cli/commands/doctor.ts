import type { Command } from 'commander';
import { runDoctor } from '../../doctor/run.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { resolvePaths } from '../../system/paths.js';
import { formatChecks } from '../output.js';
import { runAction } from '../run-action.js';

interface DoctorOptions {
  readonly json?: boolean;
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Check that this machine can record videos')
    .option('--json', 'print the results as JSON')
    .action((options: DoctorOptions) =>
      runAction(async (lifecycle) => {
        const results = await runDoctor(resolvePaths(), lifecycle);
        const output = options.json ? JSON.stringify(results, null, 2) : formatChecks(results);
        process.stdout.write(`${output}\n`);
        return results.some((result) => result.status === 'fail')
          ? ExitCode.NoBrowser
          : ExitCode.Ok;
      }),
    );
}
