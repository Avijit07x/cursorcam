import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BrowserInstall } from './finder.js';

export interface BrowserExecutable {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
}

const BROWSER_BIN_ENV = 'CURSORCAM_BROWSER_BIN';
const LAUNCHER_MODE = 0o755;
const LAUNCHER_SCRIPT = `#!/bin/sh\nulimit -c 0\nexec "$${BROWSER_BIN_ENV}" "$@"\n`;

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
