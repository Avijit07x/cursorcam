import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

export type BrowserKind = 'chrome' | 'edge' | 'chromium' | 'brave' | 'custom';

export interface BrowserInstall {
  readonly kind: BrowserKind;
  readonly path: string;
}

export interface FinderEnvironment {
  readonly platform: NodeJS.Platform;
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly exists: (path: string) => boolean;
}

export const BROWSER_OVERRIDE_ENV = 'CURSORCAM_BROWSER';

export const BROWSER_LABELS: Readonly<Record<BrowserKind, string>> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  chromium: 'Chromium',
  brave: 'Brave',
  custom: 'Custom browser',
};

const LINUX_CANDIDATES: readonly BrowserInstall[] = [
  { kind: 'chrome', path: '/opt/google/chrome/chrome' },
  { kind: 'chrome', path: '/usr/bin/google-chrome-stable' },
  { kind: 'chrome', path: '/usr/bin/google-chrome' },
  { kind: 'edge', path: '/opt/microsoft/msedge/msedge' },
  { kind: 'edge', path: '/usr/bin/microsoft-edge' },
  { kind: 'chromium', path: '/usr/bin/chromium' },
  { kind: 'chromium', path: '/usr/bin/chromium-browser' },
  { kind: 'brave', path: '/opt/brave.com/brave/brave' },
  { kind: 'brave', path: '/usr/bin/brave-browser' },
];

const MAC_APPS: readonly (readonly [BrowserKind, string])[] = [
  ['chrome', 'Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['edge', 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
  ['chromium', 'Chromium.app/Contents/MacOS/Chromium'],
  ['brave', 'Brave Browser.app/Contents/MacOS/Brave Browser'],
];

const WINDOWS_APPS: readonly (readonly [BrowserKind, string])[] = [
  ['chrome', 'Google\\Chrome\\Application\\chrome.exe'],
  ['edge', 'Microsoft\\Edge\\Application\\msedge.exe'],
  ['chromium', 'Chromium\\Application\\chrome.exe'],
  ['brave', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'],
];

const WINDOWS_ROOT_VARS = ['LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)'] as const;

function macCandidates(home: string): BrowserInstall[] {
  const roots = ['/Applications', posix.join(home, 'Applications')];
  return MAC_APPS.flatMap(([kind, app]) =>
    roots.map((root) => ({ kind, path: posix.join(root, app) })),
  );
}

function windowsCandidates(env: NodeJS.ProcessEnv): BrowserInstall[] {
  const roots = WINDOWS_ROOT_VARS.map((name) => env[name]).filter(
    (root): root is string => root !== undefined,
  );
  return WINDOWS_APPS.flatMap(([kind, app]) =>
    roots.map((root) => ({ kind, path: win32.join(root, app) })),
  );
}

function candidatesFor({ platform, env, home }: FinderEnvironment): BrowserInstall[] {
  switch (platform) {
    case 'darwin':
      return macCandidates(home);
    case 'win32':
      return windowsCandidates(env);
    default:
      return [...LINUX_CANDIDATES];
  }
}

const defaultEnvironment = (): FinderEnvironment => ({
  platform: process.platform,
  env: process.env,
  home: homedir(),
  exists: existsSync,
});

export function findBrowser(environment: FinderEnvironment = defaultEnvironment()): BrowserInstall {
  const override = environment.env[BROWSER_OVERRIDE_ENV];
  if (override) {
    if (!environment.exists(override)) {
      throw new CursorCamError(`${BROWSER_OVERRIDE_ENV} points to a missing file: ${override}`, {
        exitCode: ExitCode.NoBrowser,
        hint: `Fix or unset ${BROWSER_OVERRIDE_ENV}.`,
      });
    }
    return { kind: 'custom', path: override };
  }

  const found = candidatesFor(environment).find((candidate) => environment.exists(candidate.path));
  if (!found) {
    throw new CursorCamError('No Chrome, Edge, Chromium or Brave browser was found.', {
      exitCode: ExitCode.NoBrowser,
      hint: `Install Google Chrome, or set ${BROWSER_OVERRIDE_ENV} to a Chromium-based browser.`,
    });
  }
  return found;
}
