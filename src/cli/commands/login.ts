import type { Command } from 'commander';
import { parseWebUrl } from '../../config/urls.js';
import { captureLogin, LOGIN_TIMEOUT_MS } from '../../login/capture.js';
import {
  checkLoginName,
  DEFAULT_LOGIN_NAME,
  forgetLogin,
  hasSavedLogin,
  saveLogin,
  savedLoginFile,
} from '../../login/saved.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { resolvePaths } from '../../system/paths.js';
import { runAction } from '../run-action.js';

interface LoginOptions {
  readonly profile: string;
  readonly forget?: boolean;
}

const MS_PER_MINUTE = 60_000;

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Open a browser window to log in by hand, and save the login for recordings')
    .argument('[url]', 'page to start on, like the login page')
    .option('--profile <name>', 'name to save the login under', DEFAULT_LOGIN_NAME)
    .option('--forget', 'delete the saved login with this name')
    .action((url: string | undefined, options: LoginOptions) =>
      runAction(async (lifecycle) => {
        const paths = resolvePaths();
        const name = checkLoginName(options.profile);
        if (options.forget) {
          const removed = await forgetLogin(paths, name);
          if (!removed) {
            throw new CursorCamError(`There is no saved login named "${name}".`, {
              exitCode: ExitCode.BadInput,
            });
          }
          process.stdout.write(`Deleted the saved login "${name}".\n`);
          return ExitCode.Ok;
        }
        if (!url) {
          throw new CursorCamError('Pass the page to log in on.', {
            exitCode: ExitCode.BadInput,
            hint: `Like: cursorcam login https://example.com/login --profile ${name}`,
          });
        }
        parseWebUrl(url);
        const existing = (await hasSavedLogin(paths, name))
          ? savedLoginFile(paths, name)
          : undefined;
        const onOpen = () =>
          process.stderr.write(
            `A browser window is open. Log in there, then close the window to save the login. It waits up to ${LOGIN_TIMEOUT_MS / MS_PER_MINUTE} minutes.\n`,
          );
        const state = await captureLogin({ url, paths, lifecycle, startFrom: existing, onOpen });
        const file = await saveLogin(paths, name, state);
        process.stdout.write(
          `Saved the login as "${name}" in ${file}\nUse it with: --profile ${name}\n`,
        );
        return ExitCode.Ok;
      }),
    );
}
