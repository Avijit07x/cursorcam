import type { Command } from 'commander';
import { InvalidArgumentError } from 'commander';
import { formatInspect } from '../../inspect/format.js';
import { inspectPage } from '../../inspect/inspect.js';
import { parseWebUrl } from '../../config/urls.js';
import { findSavedLogin } from '../../login/saved.js';
import { createRunDirs, OUTPUT_ROOT } from '../../runs/dirs.js';
import { redact } from '../../shared/redact.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { resolvePaths } from '../../system/paths.js';
import { runAction } from '../run-action.js';

interface InspectCommandOptions {
  readonly phone?: boolean;
  readonly filter?: string;
  readonly limit: number;
  readonly out?: string;
  readonly profile?: string;
  readonly mask?: string[];
  readonly json?: boolean;
}

const DEFAULT_LIMIT = 60;

export function parsePositiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new InvalidArgumentError('Use a whole number above 0.');
  return parsed;
}

export function registerInspect(program: Command): void {
  program
    .command('inspect')
    .description('Save the first video frame of a page and list what can be clicked')
    .argument('<url>', 'page address')
    .option('--phone', 'use the phone viewport')
    .option('--filter <text>', 'only list targets that contain this text')
    .option('--limit <n>', 'list at most this many targets', parsePositiveInt, DEFAULT_LIMIT)
    .option('--out <dir>', 'folder for run folders')
    .option('--profile <name>', 'use a login saved with cursorcam login')
    .option('--mask <selectors...>', 'CSS selectors to blur')
    .option('--json', 'print the result as JSON')
    .action((url: string, options: InspectCommandOptions) =>
      runAction(async (lifecycle) => {
        const paths = resolvePaths();
        const host = parseWebUrl(url).hostname;
        const dirs = await createRunDirs(
          `inspect-${host}`,
          options.out ?? OUTPUT_ROOT,
          paths.cache,
          false,
        );
        const report = await inspectPage({
          url,
          viewport: options.phone ? 'phone' : 'desktop',
          outDir: dirs.outDir,
          paths,
          lifecycle,
          filter: options.filter,
          limit: options.limit,
          mask: options.mask ?? [],
          loginState: options.profile ? await findSavedLogin(paths, options.profile) : undefined,
        });
        const output = options.json ? JSON.stringify(report, null, 2) : formatInspect(report);
        process.stdout.write(`${redact(output)}\n`);
        return ExitCode.Ok;
      }),
    );
}
