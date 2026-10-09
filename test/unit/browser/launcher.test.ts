import { execFile } from 'node:child_process';
import { stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { prepareExecutable } from '../../../src/browser/launcher.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const execFileAsync = promisify(execFile);
const EXECUTABLE_BITS = 0o111;

describe('prepareExecutable', () => {
  const temp = useTempDir();

  it('uses the browser directly on Windows', async () => {
    const result = await prepareExecutable(
      { kind: 'chrome', path: 'C:\\chrome.exe' },
      join(temp.path(), 'launcher.sh'),
      'win32',
    );

    expect(result.executablePath).toBe('C:\\chrome.exe');
  });

  it.skipIf(process.platform === 'win32')(
    'starts the browser through a launcher with core dumps off',
    async () => {
      const fakeBrowser = join(temp.path(), 'fake-browser');
      await writeFile(fakeBrowser, '#!/bin/sh\necho "core=$(ulimit -c) args=$*"\n', {
        mode: 0o755,
      });
      const launcherPath = join(temp.path(), 'bin', 'launcher.sh');

      const result = await prepareExecutable({ kind: 'custom', path: fakeBrowser }, launcherPath);
      const { stdout } = await execFileAsync(result.executablePath, ['--a', 'b c'], {
        env: result.env,
      });

      expect(result.executablePath).toBe(launcherPath);
      expect((await stat(launcherPath)).mode & EXECUTABLE_BITS).toBe(EXECUTABLE_BITS);
      expect(stdout.trim()).toBe('core=0 args=--a b c');
    },
  );

  it.skipIf(process.platform === 'win32')('rewrites a launcher that was changed', async () => {
    const launcherPath = join(temp.path(), 'launcher.sh');
    await writeFile(launcherPath, 'tampered');

    await prepareExecutable({ kind: 'chrome', path: '/opt/google/chrome/chrome' }, launcherPath);

    expect((await stat(launcherPath)).size).toBeGreaterThan('tampered'.length);
  });
});
