import { chromium, type BrowserContext } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { createTempProfile, removeDir, sweepStaleProfiles } from '../system/cleanup.js';
import type { AppPaths } from '../system/paths.js';
import { findBrowser } from './finder.js';
import { launchArgsFor, userAgentFor, type Identity } from './identity.js';
import { prepareExecutable } from './launcher.js';
import { BrowserSession } from './session.js';
import { assertSupportedVersion, readBrowserVersion } from './version.js';

const LAUNCH_TIMEOUT_MS = 30_000;

export interface BrowserSettings {
  readonly locale?: string;
  readonly timezoneId?: string;
  readonly colorScheme?: 'light' | 'dark';
  readonly reducedMotion?: 'reduce' | 'no-preference';
  readonly permissions?: string[];
  readonly httpCredentials?: { readonly username: string; readonly password: string };
  readonly ignoreHTTPSErrors?: boolean;
}

export interface LaunchOptions {
  readonly identity: Identity;
  readonly paths: AppPaths;
  readonly headed?: boolean;
  readonly settings?: BrowserSettings;
  readonly loginState?: string;
}

export async function launchBrowser({
  identity,
  paths,
  headed = false,
  settings = {},
  loginState,
}: LaunchOptions): Promise<BrowserSession> {
  const install = findBrowser();
  const version = await readBrowserVersion(install);
  assertSupportedVersion(version);
  const executable = await prepareExecutable(install, paths.launcher);
  await sweepStaleProfiles(paths.profiles);
  const profileDir = await createTempProfile(paths.profiles);

  let context: BrowserContext;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      ...settings,
      executablePath: executable.executablePath,
      env: executable.env,
      headless: !headed,
      args: launchArgsFor(identity),
      viewport: identity.viewport,
      screen: identity.viewport,
      deviceScaleFactor: identity.scale,
      isMobile: identity.mobile,
      hasTouch: identity.mobile,
      userAgent: userAgentFor(identity, install.kind, version.major),
      acceptDownloads: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      timeout: LAUNCH_TIMEOUT_MS,
    });
  } catch (error) {
    await removeDir(profileDir);
    throw new CursorCamError(`Could not start the browser at ${install.path}`, {
      exitCode: ExitCode.NoBrowser,
      hint: 'Close other copies of this browser that use the same profile, or try another browser.',
      cause: error,
    });
  }
  try {
    if (loginState) await context.setStorageState(loginState);
    const page = context.pages()[0] ?? (await context.newPage());
    return new BrowserSession({ context, page, identity, install, version, profileDir });
  } catch (error) {
    await context.close().catch(() => undefined);
    await removeDir(profileDir);
    throw new CursorCamError('Could not load the saved login.', {
      exitCode: ExitCode.BadInput,
      hint: 'Save it again with: cursorcam login <url> --profile <name>',
      cause: error,
    });
  }
}
