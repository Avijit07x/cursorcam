import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const DEFAULT_TIMEOUT_MS = 10_000;

const execFileAsync = promisify(execFile);

export async function runCommand(
  file: string,
  args: readonly string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const { stdout } = await execFileAsync(file, args, { timeout: timeoutMs });
  return stdout;
}
