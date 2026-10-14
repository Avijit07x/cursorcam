import type { Command } from 'commander';
import { runCli } from '../../mcp/cli-call.js';
import { INSTRUCTIONS } from '../../mcp/instructions.js';
import { serveMcp } from '../../mcp/protocol.js';
import { createTools } from '../../mcp/tools.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { runAction } from '../run-action.js';

export function registerMcp(program: Command, version: string): void {
  program
    .command('mcp')
    .description('Run as an MCP server over stdio, so any AI agent can make videos')
    .action(() =>
      runAction(async (lifecycle) => {
        await serveMcp(
          createTools(runCli),
          { name: 'cursorcam', version, instructions: INSTRUCTIONS },
          { input: process.stdin, output: process.stdout },
          lifecycle,
        );
        return ExitCode.Ok;
      }),
    );
}
