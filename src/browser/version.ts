import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { runCommand } from '../system/command.js';
import type { BrowserInstall } from './finder.js';

export interface BrowserVersion {
  readonly full: string;
  readonly major: number;
}

export const MIN_BROWSER_MAJOR = 120;

const VERSION_PATTERN = /(\d+)\.\d+\.\d+\.\d+/;
const VERSION_DIR_PATTERN = /^\d+\.\d+\.\d+\.\d+$/;

export function parseVersion(text: string): BrowserVersion | undefined {
  const match = VERSION_PATTERN.exec(text);
  if (!match?.[1]) return undefined;
  return { full: match[0], major: Number(match[1]) };
}

function compareVersions(a: BrowserVersion, b: BrowserVersion): number {
  const left = a.full.split('.').map(Number);
  const right = b.full.split('.').map(Number);
  const index = left.findIndex((part, i) => part !== right[i]);
  return index === -1 ? 0 : (left[index] ?? 0) - (right[index] ?? 0);
}

async function versionFromInstallDir(executable: string): Promise<string> {
  const entries = await readdir(dirname(executable));
  const versions = entries
    .filter((name) => VERSION_DIR_PATTERN.test(name))
    .map((name) => parseVersion(name))
    .filter((version): version is BrowserVersion => version !== undefined)
    .sort(compareVersions);
  return versions.at(-1)?.full ?? '';
}

function versionFromCommand(executable: string): Promise<string> {
  return runCommand(executable, ['--version']);
}

function versionError(path: string, cause?: unknown): CursorCamError {
  return new CursorCamError(`Could not read the browser version of ${path}`, {
    exitCode: ExitCode.NoBrowser,
    cause,
  });
}

export async function readBrowserVersion(
  install: BrowserInstall,
  platform: NodeJS.Platform = process.platform,
): Promise<BrowserVersion> {
  const read = platform === 'win32' ? versionFromInstallDir : versionFromCommand;
  const text = await read(install.path).catch((error: unknown) => {
    throw versionError(install.path, error);
  });
  const version = parseVersion(text);
  if (!version) throw versionError(install.path);
  return version;
}

export function assertSupportedVersion(version: BrowserVersion): void {
  if (version.major < MIN_BROWSER_MAJOR) {
    throw new CursorCamError(
      `Browser version ${version.full} is too old. Version ${MIN_BROWSER_MAJOR} or newer is needed.`,
      { exitCode: ExitCode.NoBrowser, hint: 'Update your browser.' },
    );
  }
}
