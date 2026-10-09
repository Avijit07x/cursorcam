#!/usr/bin/env node
import { createRequire } from 'node:module';
import { Command, type CommanderError } from 'commander';
import { ExitCode } from '../shared/exit-codes.js';
import { registerAnswer } from './commands/answer.js';
import { registerCheck } from './commands/check.js';
import { registerDoctor } from './commands/doctor.js';
import { registerInspect } from './commands/inspect.js';
import { registerLogin } from './commands/login.js';
import { registerRecord } from './commands/record.js';
import { registerRender } from './commands/render.js';
import { registerRun } from './commands/run.js';
import { registerStills } from './commands/stills.js';
import { registerWait } from './commands/wait.js';

const { version } = createRequire(import.meta.url)('../../package.json') as { version: string };

function exitOnParseError(error: CommanderError): never {
  process.exit(error.exitCode === 0 ? ExitCode.Ok : ExitCode.BadInput);
}

const program = new Command()
  .name('cursorcam')
  .description('Record polished click demo videos of web apps.')
  .version(version)
  .showHelpAfterError()
  .exitOverride(exitOnParseError);

registerDoctor(program);
registerInspect(program);
registerCheck(program);
registerRecord(program);
registerRender(program);
registerRun(program);
registerStills(program);
registerWait(program);
registerLogin(program);
registerAnswer(program);

await program.parseAsync(process.argv);
