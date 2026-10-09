import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertSupportedVersion,
  MIN_BROWSER_MAJOR,
  parseVersion,
  readBrowserVersion,
} from '../../../src/browser/version.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('parseVersion', () => {
  it.each([
    ['Google Chrome 154.0.8037.97 ', { full: '154.0.8037.97', major: 154 }],
    ['Microsoft Edge 141.0.3537.85', { full: '141.0.3537.85', major: 141 }],
    ['Chromium 138.0.7204.100 snap', { full: '138.0.7204.100', major: 138 }],
  ])('reads %s', (text, expected) => {
    expect(parseVersion(text)).toEqual(expected);
  });

  it('returns undefined for text without a version', () => {
    expect(parseVersion('no version here')).toBeUndefined();
  });
});

describe('assertSupportedVersion', () => {
  it('accepts the minimum version', () => {
    expect(() =>
      assertSupportedVersion({ full: `${MIN_BROWSER_MAJOR}.0.0.0`, major: MIN_BROWSER_MAJOR }),
    ).not.toThrow();
  });

  it('rejects older versions', () => {
    expect(() => assertSupportedVersion({ full: '119.0.0.0', major: 119 })).toThrow(/too old/);
  });
});

describe('readBrowserVersion', () => {
  const temp = useTempDir();

  it('reads the newest version folder next to a Windows executable', async () => {
    const appDir = temp.path();
    await Promise.all(
      ['139.0.1.2', '141.0.3537.85', 'Locales'].map((name) => mkdir(join(appDir, name))),
    );

    const version = await readBrowserVersion(
      { kind: 'chrome', path: join(appDir, 'chrome.exe') },
      'win32',
    );

    expect(version).toEqual({ full: '141.0.3537.85', major: 141 });
  });

  it.skipIf(process.platform === 'win32')('runs --version elsewhere', async () => {
    const fake = join(temp.path(), 'fake-browser');
    await writeFile(fake, '#!/bin/sh\necho "Fake Browser 150.1.2.3"\n', { mode: 0o755 });

    const version = await readBrowserVersion({ kind: 'custom', path: fake }, 'linux');

    expect(version).toEqual({ full: '150.1.2.3', major: 150 });
  });

  it('fails clearly when the browser cannot be run', async () => {
    await expect(
      readBrowserVersion({ kind: 'custom', path: join(temp.path(), 'missing') }, 'linux'),
    ).rejects.toThrow(/Could not read the browser version/);
  });
});
