import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BLOCKING_CORE_LIMIT_BYTES } from '../system/core-limit.js';
import type { BrowserInstall } from './finder.js';

export interface BrowserExecutable {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
}

const BROWSER_BIN_ENV = 'CURSORCAM_BROWSER_BIN';
const LAUNCHER_MODE = 0o755;
const CORE_LIMIT = `${BLOCKING_CORE_LIMIT_BYTES}:${BLOCKING_CORE_LIMIT_BYTES}`;
const LAUNCHER_SCRIPT = [
  '#!/bin/sh',
  `if command -v prlimit >/dev/null 2>&1 && prlimit --core=${CORE_LIMIT} true >/dev/null 2>&1; then`,
  `  exec prlimit --core=${CORE_LIMIT} -- "$${BROWSER_BIN_ENV}" "$@"`,
  'fi',
  'ulimit -c 0',
  `exec "$${BROWSER_BIN_ENV}" "$@"`,
  '',
].join('\n');

async function writeLauncher(launcherPath: string): Promise<void> {
  const current = await readFile(launcherPath, 'utf8').catch(() => undefined);
  if (current === LAUNCHER_SCRIPT) return;
  await mkdir(dirname(launcherPath), { recursive: true });
  const staging = `${launcherPath}.${process.pid}.tmp`;
  await writeFile(staging, LAUNCHER_SCRIPT, { mode: LAUNCHER_MODE });
  await chmod(staging, LAUNCHER_MODE);
  await rename(staging, launcherPath);
}

export async function prepareExecutable(
  install: BrowserInstall,
  launcherPath: string,
  platform: NodeJS.Platform = process.platform,
): Promise<BrowserExecutable> {
  if (platform === 'win32') return { executablePath: install.path, env: process.env };
  await writeLauncher(launcherPath);
  return {
    executablePath: launcherPath,
    env: { ...process.env, [BROWSER_BIN_ENV]: install.path },
  };
}
