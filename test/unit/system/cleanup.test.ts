import { mkdir, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTempProfile, sweepStaleProfiles } from '../../../src/system/cleanup.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const DEAD_PID = 999_999;
const LIVE_PID = 4242;

describe('createTempProfile', () => {
  const temp = useTempDir();

  it('creates a folder named after this process', async () => {
    const dir = await createTempProfile(join(temp.path(), 'profiles'));

    expect(basename(dir)).toMatch(new RegExp(`^cursorcam-${process.pid}-[0-9a-f]{8}$`));
    expect(await readdir(dir)).toEqual([]);
  });

  it('never reuses a name', async () => {
    const profiles = join(temp.path(), 'profiles');
    const [first, second] = await Promise.all([
      createTempProfile(profiles),
      createTempProfile(profiles),
    ]);

    expect(first).not.toBe(second);
  });
});

describe('sweepStaleProfiles', () => {
  const temp = useTempDir();

  it('removes only profiles whose process is gone', async () => {
    const profiles = temp.path();
    const names = [`cursorcam-${DEAD_PID}-abc123`, `cursorcam-${LIVE_PID}-def456`, 'other-folder'];
    await Promise.all(names.map((name) => mkdir(join(profiles, name))));

    const removed = await sweepStaleProfiles(profiles, (pid) => pid === LIVE_PID);

    expect(removed).toBe(1);
    expect((await readdir(profiles)).sort()).toEqual([
      `cursorcam-${LIVE_PID}-def456`,
      'other-folder',
    ]);
  });

  it('does nothing when the folder does not exist', async () => {
    expect(await sweepStaleProfiles(join(temp.path(), 'missing'))).toBe(0);
  });
});
