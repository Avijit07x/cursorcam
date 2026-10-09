import type { Command } from 'commander';
import { ExitCode } from '../../shared/exit-codes.js';
import { startDetached } from '../detach.js';
import { describeVideo, renderRun, type RenderOptions } from '../render-flow.js';
import { recordRun, reportFailure, reportSuccess, type RunOptions } from '../run-flow.js';
import { runAction } from '../run-action.js';
import { addRunOptions } from './record.js';
import { addRenderOptions } from './render.js';

type RunCommandOptions = RunOptions & RenderOptions;

export function registerRun(program: Command): void {
  addRenderOptions(
    addRunOptions(
      program
        .command('run')
        .description('Record the steps and render the MP4')
        .argument('<steps>', 'steps file (JSON)'),
    ),
  ).action((steps: string, options: RunCommandOptions) =>
    runAction(async (lifecycle) => {
      if (options.detach) return startDetached(steps, options, 'record');
      const recorded = await recordRun(steps, options, 'record', lifecycle);
      const { dirs, status, paths } = recorded;
      try {
        const outcome = await renderRun(dirs.outDir, recorded.run, options, {
          paths,
          lifecycle,
          status,
          session: recorded.recording.session,
        });
        const warnings = [...recorded.recording.warnings, ...outcome.warnings];
        const result = await reportSuccess(dirs.outDir, status, {
          video: outcome.file,
          poster: outcome.poster,
          sizeBytes: outcome.facts.bytes,
          durationSeconds: outcome.facts.seconds,
          warnings,
        });
        const lines = options.json
          ? [JSON.stringify({ ...result, run: dirs.outDir }, null, 2)]
          : [
              describeVideo(outcome),
              ...warnings.map((warning) => `Warning: ${warning}`),
              `Run folder: ${dirs.outDir}`,
            ];
        process.stdout.write(`${lines.join('\n')}\n`);
        return ExitCode.Ok;
      } catch (error) {
        await reportFailure(dirs.outDir, status, error);
        throw error;
      }
    }),
  );
}
