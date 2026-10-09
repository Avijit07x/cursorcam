import { randomBytes } from 'node:crypto';
import { access, chmod, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import type { AppPaths } from '../system/paths.js';

export const DEFAULT_LOGIN_NAME = 'default';

const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const FILE_SUFFIX = '.json';
const PRIVATE_DIR_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const TEMP_SUFFIX_BYTES = 4;

export function checkLoginName(name: string): string {
  if (!NAME_PATTERN.test(name)) {
    throw new CursorCamError(`"${name}" is not a valid login name.`, {
      exitCode: ExitCode.BadInput,
      hint: 'Use up to 40 letters, digits, - or _, like: acme-admin',
    });
  }
  return name;
}

export function savedLoginFile(paths: AppPaths, name: string): string {
  return join(paths.savedProfiles, `${checkLoginName(name)}${FILE_SUFFIX}`);
}

export async function listSavedLogins(paths: AppPaths): Promise<string[]> {
  const names = await readdir(paths.savedProfiles).catch(() => []);
  return names
    .filter((name) => name.endsWith(FILE_SUFFIX))
    .map((name) => name.slice(0, -FILE_SUFFIX.length))
    .filter((name) => NAME_PATTERN.test(name))
    .toSorted();
}

export async function hasSavedLogin(paths: AppPaths, name: string): Promise<boolean> {
  return access(savedLoginFile(paths, name)).then(
    () => true,
    () => false,
  );
}

export async function findSavedLogin(paths: AppPaths, name: string): Promise<string> {
  if (await hasSavedLogin(paths, name)) return savedLoginFile(paths, name);
  const saved = await listSavedLogins(paths);
  throw new CursorCamError(`There is no saved login named "${name}".`, {
    exitCode: ExitCode.BadInput,
    hint:
      saved.length > 0
        ? `Saved logins: ${saved.join(', ')}. Or save one with: cursorcam login <url> --profile ${name}`
        : `Save one first with: cursorcam login <url> --profile ${name}`,
  });
}

export async function saveLogin(paths: AppPaths, name: string, state: unknown): Promise<string> {
  const file = savedLoginFile(paths, name);
  await mkdir(paths.savedProfiles, { recursive: true, mode: PRIVATE_DIR_MODE });
  const staging = `${file}.${randomBytes(TEMP_SUFFIX_BYTES).toString('hex')}.tmp`;
  try {
    await writeFile(staging, JSON.stringify(state), { mode: PRIVATE_FILE_MODE });
    await chmod(staging, PRIVATE_FILE_MODE);
    await rename(staging, file);
  } catch (error) {
    await rm(staging, { force: true });
    throw error;
  }
  return file;
}

export async function forgetLogin(paths: AppPaths, name: string): Promise<boolean> {
  if (!(await hasSavedLogin(paths, name))) return false;
  await rm(savedLoginFile(paths, name), { force: true });
  return true;
}
