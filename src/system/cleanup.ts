import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { isProcessAlive } from './process.js';

const PROFILE_PREFIX = 'cursorcam';
const PROFILE_PATTERN = /^cursorcam-(\d+)-[0-9a-f]+$/;
const RANDOM_SUFFIX_BYTES = 4;
const REMOVE_RETRIES = 8;
const REMOVE_RETRY_DELAY_MS = 100;

export async function createTempProfile(profilesDir: string): Promise<string> {
  await mkdir(profilesDir, { recursive: true });
  const suffix = randomBytes(RANDOM_SUFFIX_BYTES).toString('hex');
  const dir = join(profilesDir, `${PROFILE_PREFIX}-${process.pid}-${suffix}`);
  await mkdir(dir);
  return dir;
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, {
    recursive: true,
    force: true,
    maxRetries: REMOVE_RETRIES,
    retryDelay: REMOVE_RETRY_DELAY_MS,
  });
}

export async function sweepStaleProfiles(
  profilesDir: string,
  isAlive: (pid: number) => boolean = isProcessAlive,
): Promise<number> {
  const entries = await readdir(profilesDir).catch(() => []);
  const stale = entries.filter((name) => {
    const pid = PROFILE_PATTERN.exec(name)?.[1];
    return pid !== undefined && !isAlive(Number(pid));
  });
  await Promise.all(stale.map((name) => removeDir(join(profilesDir, name))));
  return stale.length;
}
