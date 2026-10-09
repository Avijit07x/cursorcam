import type { Command } from 'commander';
import { findRun } from '../../runs/dirs.js';
import { StatusFile } from '../../runs/status.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { resolvePaths } from '../../system/paths.js';
import {
  describeVideo,
  parseFormat,
  parseMaxSize,
  parsePreset,
  renderRun,
  type RenderOptions,
} from '../render-flow.js';
import { reportFailure, reportSuccess } from '../run-flow.js';
import { runAction } from '../run-action.js';

interface RenderCommandOptions extends RenderOptions {
  readonly json?: boolean;
}

export function addRenderOptions(command: Command): Command {
  return command
    .option('--for <preset>', 'where the video will be posted', parsePreset)
    .option('--max-size <size>', 'keep the file under this size, like 10MB', parseMaxSize)
    .option('--style <file-or-json>', 'look of the video, as a JSON file or inline JSON')
    .option('--format <format>', 'landscape, square or vertical', parseFormat)
    .option('--clean', 'delete the raw frames after rendering');
}

export function registerRender(program: Command): void {
  addRenderOptions(
    program
      .command('render')
      .description('Render a recorded run into an MP4')
      .argument('<run>', 'run folder'),
  )
    .option('--json', 'print the result as JSON')
    .action((runArg: string, options: RenderCommandOptions) =>
      runAction(async (lifecycle) => {
        const { outDir, run } = await findRun(runArg);
        const status = new StatusFile(outDir);
        try {
          const outcome = await renderRun(outDir, run, options, {
            paths: resolvePaths(),
            lifecycle,
            status,
          });
          const result = await reportSuccess(outDir, status, {
            video: outcome.file,
            poster: outcome.poster,
            sizeBytes: outcome.facts.bytes,
            durationSeconds: outcome.facts.seconds,
            warnings: outcome.warnings,
          });
          const lines = options.json
            ? [JSON.stringify(result, null, 2)]
            : [describeVideo(outcome), ...outcome.warnings.map((warning) => `Warning: ${warning}`)];
          process.stdout.write(`${lines.join('\n')}\n`);
          return ExitCode.Ok;
        } catch (error) {
          await reportFailure(outDir, status, error);
          throw error;
        }
      }),
    );
}
