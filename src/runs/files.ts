import { randomBytes } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

const TEMP_SUFFIX_BYTES = 4;

export async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const staging = `${file}.${randomBytes(TEMP_SUFFIX_BYTES).toString('hex')}.tmp`;
  try {
    await writeFile(staging, `${JSON.stringify(data, null, 2)}\n`);
    await rename(staging, file);
  } catch (error) {
    await rm(staging, { force: true });
    throw error;
  }
}

export async function readJson(file: string, what: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    throw new CursorCamError(`Could not find ${what} at ${file}.`, { exitCode: ExitCode.BadInput });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CursorCamError(`${file} is damaged.`, { exitCode: ExitCode.BadInput });
  }
}

export async function readJsonLines<T>(file: string): Promise<T[]> {
  const text = await readFile(file, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as T);
}
