import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ExitCode } from '../shared/exit-codes.js';

const CLI_ENTRY = fileURLToPath(new URL('../cli/index.js', import.meta.url));

export interface CliCall {
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly input?: string;
  readonly cwd?: string;
  readonly signal: AbortSignal;
}

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type RunCli = (call: CliCall) => Promise<CliResult>;

// Claude Desktop runs extensions on its own Electron build; this makes it act as plain Node.
export function childEnv(
  extra: Readonly<Record<string, string>>,
  base: NodeJS.ProcessEnv = process.env,
  electron: string | undefined = process.versions.electron,
): NodeJS.ProcessEnv {
  return { ...base, ...(electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}), ...extra };
}

export const runCli: RunCli = ({ args, env = {}, input, cwd, signal }) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
      env: childEnv(env),
      cwd,
      signal,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
    child.stdin?.on('error', () => undefined).end(input);
    child.once('error', reject);
    child.once('close', (code) =>
      resolve({ exitCode: code ?? ExitCode.Interrupted, stdout, stderr }),
    );
  });
