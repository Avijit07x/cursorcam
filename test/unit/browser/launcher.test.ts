import { execFile } from 'node:child_process';
import { stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { prepareExecutable } from '../../../src/browser/launcher.js';
import { BLOCKING_CORE_LIMIT_BYTES } from '../../../src/system/core-limit.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const execFileAsync = promisify(execFile);
const EXECUTABLE_BITS = 0o111;
const FAKE_BROWSER = [
  '#!/bin/sh',
  'if [ -r /proc/self/limits ]; then',
  '  core=$(awk \'/core file/ {print $5 ":" $6}\' /proc/self/limits)',
  'else',
  '  core=$(ulimit -c)',
  'fi',
  'echo "core=$core args=$*"',
  '',
].join('\n');
const EXPECTED_CORE =
  process.platform === 'linux' ? `${BLOCKING_CORE_LIMIT_BYTES}:${BLOCKING_CORE_LIMIT_BYTES}` : '0';

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
      await writeFile(fakeBrowser, FAKE_BROWSER, { mode: 0o755 });
      const launcherPath = join(temp.path(), 'bin', 'launcher.sh');

      const result = await prepareExecutable({ kind: 'custom', path: fakeBrowser }, launcherPath);
      const { stdout } = await execFileAsync(result.executablePath, ['--a', 'b c'], {
        env: result.env,
      });

      expect(result.executablePath).toBe(launcherPath);
      expect((await stat(launcherPath)).mode & EXECUTABLE_BITS).toBe(EXECUTABLE_BITS);
      expect(stdout.trim()).toBe(`core=${EXPECTED_CORE} args=--a b c`);
    },
  );

  it.skipIf(process.platform !== 'linux')(
    'still starts the browser when the core limit cannot be raised',
    async () => {
      const fakeBrowser = join(temp.path(), 'fake-browser');
      await writeFile(fakeBrowser, FAKE_BROWSER, { mode: 0o755 });
      const result = await prepareExecutable(
        { kind: 'custom', path: fakeBrowser },
        join(temp.path(), 'launcher.sh'),
      );

      const { stdout } = await execFileAsync(
        'prlimit',
        ['--core=0:0', '--', result.executablePath, '--a'],
        { env: result.env },
      );

      expect(stdout.trim()).toBe('core=0:0 args=--a');
    },
  );

  it.skipIf(process.platform === 'win32')('rewrites a launcher that was changed', async () => {
    const launcherPath = join(temp.path(), 'launcher.sh');
    await writeFile(launcherPath, 'tampered');

    await prepareExecutable({ kind: 'chrome', path: '/opt/google/chrome/chrome' }, launcherPath);

    expect((await stat(launcherPath)).size).toBeGreaterThan('tampered'.length);
  });
});
