import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import type { Command } from 'commander';
import { z } from 'zod';
import { sendAnswer } from '../../record/ask.js';
import { findRunFolder } from '../../runs/dirs.js';
import { readJson } from '../../runs/files.js';
import { STATUS_FILE } from '../../runs/status.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { runAction } from '../run-action.js';

const WaitingStatus = z.object({
  state: z.literal('waiting'),
  ask: z.string(),
  answerSocket: z.string(),
});

export function registerAnswer(program: Command): void {
  program
    .command('answer')
    .description('Pass the reply (read from stdin) to a run waiting at an ask step')
    .argument('<run>', 'run folder')
    .action((run: string) =>
      runAction(async () => {
        const outDir = await findRunFolder(run);
        const status = WaitingStatus.safeParse(
          await readJson(join(outDir, STATUS_FILE), 'the run status'),
        );
        if (!status.success) {
          throw new CursorCamError('This run is not waiting for an answer.', {
            exitCode: ExitCode.BadInput,
          });
        }
        const answer = (await text(process.stdin)).replace(/\r?\n$/, '');
        if (answer === '') {
          throw new CursorCamError('The answer is empty.', {
            exitCode: ExitCode.BadInput,
            hint: 'Pipe the reply into the command, for example: printf %s "123456" | cursorcam answer <run>',
          });
        }
        await sendAnswer(status.data.answerSocket, answer).catch((error: unknown) => {
          throw new CursorCamError('Could not reach the waiting run.', {
            exitCode: ExitCode.Internal,
            cause: error,
          });
        });
        process.stdout.write(`Sent the answer for "${status.data.ask}".\n`);
        return ExitCode.Ok;
      }),
    );
}
