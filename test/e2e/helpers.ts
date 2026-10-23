import { execFile, spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll } from 'vitest';
import { findBrowser } from '../../src/browser/finder.js';
import { runCommand } from '../../src/system/command.js';
import { resolvePaths, type AppPaths } from '../../src/system/paths.js';
import { useTempDir } from '../helpers/temp-dir.js';

export const CLI_PATH = join(import.meta.dirname, '..', '..', 'dist', 'cli', 'index.js');
export const CI_SLOWDOWN = process.env.CI ? 3 : 1;
export const FAIL_FAST_TIMEOUT_MS = process.env.CI ? 10_000 : 1_500;

const runFile = promisify(execFile);

export const hasDisplay =
  process.platform === 'darwin' ||
  (process.platform === 'linux' && Boolean(process.env.DISPLAY ?? process.env.WAYLAND_DISPLAY));

interface Finished {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function startCli(args: readonly string[], cwd: string, env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [CLI_PATH, ...args], { cwd, env });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
  const finished = new Promise<Finished>((resolve) => {
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
  return { child, finished, stderr: () => stderr };
}

export async function browserPid(parent: number): Promise<number> {
  const { stdout } = await runFile('pgrep', ['-P', String(parent)]);
  const pid = Number(stdout.trim().split('\n')[0]);
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('No browser process yet');
  return pid;
}

export function browserAvailable(): boolean {
  try {
    findBrowser();
    return true;
  } catch {
    return false;
  }
}

export function useTempCache(): { paths: () => AppPaths; env: () => NodeJS.ProcessEnv } {
  const cache = useTempDir('all');

  return {
    paths: () => resolvePaths({ CURSORCAM_CACHE_DIR: cache.path() }),
    env: () => ({ ...process.env, CURSORCAM_CACHE_DIR: cache.path() }),
  };
}

export function usePageServer(html: string): { url: () => string } {
  let server: Server | undefined;

  beforeAll(async () => {
    server = createServer((_, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(html);
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
  });

  return {
    url: () => {
      const address = server?.address() as AddressInfo | null;
      if (!address) throw new Error('usePageServer is only available inside a test');
      return `http://127.0.0.1:${address.port}/`;
    },
  };
}

const WINDOWS_PROCESS_LIST =
  'Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine } | Out-String -Width 32767';

export async function processCommandLines(): Promise<string> {
  switch (process.platform) {
    case 'win32':
      return runCommand('powershell', ['-NoProfile', '-Command', WINDOWS_PROCESS_LIST]);
    default:
      return runCommand('ps', ['-A', '-o', 'command=']);
  }
}
