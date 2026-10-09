import { describe, expect, it } from 'vitest';
import { findBrowser, type FinderEnvironment } from '../../../src/browser/finder.js';
import { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

function environment(
  platform: NodeJS.Platform,
  installed: readonly string[],
  env: NodeJS.ProcessEnv = {},
): FinderEnvironment {
  const paths = new Set(installed);
  return { platform, env, home: '/home/me', exists: (path) => paths.has(path) };
}

describe('findBrowser', () => {
  it('prefers Chrome on Linux', () => {
    const found = findBrowser(
      environment('linux', ['/usr/bin/chromium', '/opt/google/chrome/chrome']),
    );

    expect(found).toEqual({ kind: 'chrome', path: '/opt/google/chrome/chrome' });
  });

  it('falls back to Brave when it is the only browser', () => {
    expect(findBrowser(environment('linux', ['/usr/bin/brave-browser'])).kind).toBe('brave');
  });

  it('finds apps installed in the home Applications folder on macOS', () => {
    const path = '/home/me/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

    expect(findBrowser(environment('darwin', [path]))).toEqual({ kind: 'edge', path });
  });

  it('looks under the Windows program folders', () => {
    const path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const found = findBrowser(environment('win32', [path], { PROGRAMFILES: 'C:\\Program Files' }));

    expect(found).toEqual({ kind: 'chrome', path });
  });

  it('uses the override when the file exists', () => {
    const found = findBrowser(
      environment('linux', ['/custom/chrome', '/opt/google/chrome/chrome'], {
        CURSORCAM_BROWSER: '/custom/chrome',
      }),
    );

    expect(found).toEqual({ kind: 'custom', path: '/custom/chrome' });
  });

  it('rejects an override that points to a missing file', () => {
    const run = () => findBrowser(environment('linux', [], { CURSORCAM_BROWSER: '/missing' }));

    expect(run).toThrow(CursorCamError);
    expect(run).toThrow(/missing file/);
  });

  it('fails with the no-browser exit code when nothing is installed', () => {
    try {
      findBrowser(environment('linux', []));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CursorCamError);
      expect((error as CursorCamError).exitCode).toBe(ExitCode.NoBrowser);
      expect((error as CursorCamError).hint).toMatch(/Install Google Chrome/);
    }
  });
});
