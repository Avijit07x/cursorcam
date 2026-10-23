import { access, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Command } from 'commander';
import { captureFlow } from '../../capture/capture.js';
import { buildSteps } from '../../capture/steps.js';
import { parseWebUrl } from '../../config/urls.js';
import { SECRET_ENV_PREFIX } from '../../config/values.js';
import { LOGIN_TIMEOUT_MS } from '../../login/capture.js';
import { findSavedLogin } from '../../login/saved.js';
import { OUTPUT_ROOT } from '../../runs/dirs.js';
import { writeJsonAtomic } from '../../runs/files.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { resolvePaths } from '../../system/paths.js';
import { runAction } from '../run-action.js';

interface CaptureOptions {
  readonly profile?: string;
}

const DEFAULT_STEPS_FILE = join(OUTPUT_ROOT, 'capture.json');
const MS_PER_MINUTE = 60_000;
const MINUTES = LOGIN_TIMEOUT_MS / MS_PER_MINUTE;

export function registerCapture(program: Command): void {
  program
    .command('capture')
    .description('Open a browser window, click through a flow by hand, and save it as a steps file')
    .argument('<url>', 'page to start on')
    .argument('[steps]', 'steps file to write', DEFAULT_STEPS_FILE)
    .option('--profile <name>', 'start with a login saved with cursorcam login')
    .action((url: string, steps: string, options: CaptureOptions) =>
      runAction(async (lifecycle) => {
        parseWebUrl(url);
        const file = resolve(steps);
        if (await exists(file)) {
          throw new CursorCamError(`${file} already exists.`, {
            exitCode: ExitCode.BadInput,
            hint: `Name a new file, like: cursorcam capture ${url} flows/sign-up.json`,
          });
        }
        const paths = resolvePaths();
        const flow = await captureFlow({
          url,
          paths,
          lifecycle,
          loginState: options.profile ? await findSavedLogin(paths, options.profile) : undefined,
          onOpen: () =>
            process.stderr.write(
              `A browser window is open. Click through your flow, then close the window to save the steps. It waits up to ${MINUTES} minutes.\n`,
            ),
        });
        const captured = buildSteps(url, flow.events);
        if (captured.file.steps.length === 0) {
          throw new CursorCamError('Nothing was saved: no clicks or typing were captured.', {
            exitCode: ExitCode.BadInput,
            hint: 'Run cursorcam capture again, click through the flow, then close the window.',
          });
        }
        await mkdir(dirname(file), { recursive: true });
        await writeJsonAtomic(file, captured.file);
        if (flow.timedOut) process.stderr.write(`Closed the window after ${MINUTES} minutes.\n`);
        const secrets = captured.secrets.map((name) => `${SECRET_ENV_PREFIX}${name}=… `).join('');
        const profile = options.profile ? ` --profile ${options.profile}` : '';
        process.stdout.write(
          `Saved ${captured.file.steps.length} steps in ${file}\nTry them with: ${secrets}cursorcam check "${steps}"${profile}\n`,
        );
        return ExitCode.Ok;
      }),
    );
}

async function exists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}
