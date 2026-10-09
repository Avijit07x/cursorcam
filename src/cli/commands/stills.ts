import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from 'commander';
import { loadStyle, type Style } from '../../config/style.js';
import { renderStills } from '../../render/renderer.js';
import { findRun } from '../../runs/dirs.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { removeDir } from '../../system/cleanup.js';
import { resolvePaths } from '../../system/paths.js';
import { parseFormat, parsePreset } from '../render-flow.js';
import { runAction } from '../run-action.js';
import { parsePositiveInt } from './inspect.js';

interface StillsOptions {
  readonly count: number;
  readonly for?: string;
  readonly style?: string;
  readonly format?: Style['format'];
  readonly json?: boolean;
}

const STILLS_DIR = 'stills';
const SAVED_STYLE = 'style.json';
const DEFAULT_COUNT = 6;
const STILL_NAME = /^[a-z0-9-]+\.png$/;

export function registerStills(program: Command): void {
  program
    .command('stills')
    .description('Save key-moment stills and close-up crops of a run, for checking the video')
    .argument('<run>', 'run folder')
    .option('--count <n>', 'how many key moments', parsePositiveInt, DEFAULT_COUNT)
    .option('--for <preset>', 'preset the video was rendered for', parsePreset)
    .option('--style <file-or-json>', 'look of the video (default: the last rendered style)')
    .option('--format <format>', 'landscape, square or vertical', parseFormat)
    .option('--json', 'print the result as JSON')
    .action((runArg: string, options: StillsOptions) =>
      runAction(async (lifecycle) => {
        const { outDir, run } = await findRun(runArg);
        const loaded = await loadStyle(options.style ?? (await savedStyle(outDir)));
        const style = options.format ? { ...loaded, format: options.format } : loaded;
        const dir = join(outDir, STILLS_DIR);
        await removeDir(dir);
        await mkdir(dir, { recursive: true });
        const files: string[] = [];
        await renderStills(
          {
            outDir,
            run,
            style,
            presetName: options.for,
            paths: resolvePaths(),
            lifecycle,
            count: options.count,
          },
          async (name, data) => {
            if (!STILL_NAME.test(name)) {
              throw new CursorCamError(`Refused a still named "${name}".`, {
                exitCode: ExitCode.Internal,
              });
            }
            const file = join(dir, name);
            await writeFile(file, data);
            files.push(file);
          },
        );
        const output = options.json ? JSON.stringify({ stills: files }, null, 2) : files.join('\n');
        process.stdout.write(`${output}\n`);
        return ExitCode.Ok;
      }),
    );
}

async function savedStyle(outDir: string): Promise<string | undefined> {
  const file = join(outDir, SAVED_STYLE);
  return access(file).then(
    () => file,
    () => undefined,
  );
}
