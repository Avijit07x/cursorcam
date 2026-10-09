import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { IDENTITIES } from '../../src/browser/identity.js';
import { launchBrowser } from '../../src/browser/launch.js';
import type { BrowserSession } from '../../src/browser/session.js';
import { captureFirstFrame } from '../../src/record/screencast.js';
import { jpegSize } from '../../src/shared/jpeg.js';
import {
  BLOCKING_CORE_LIMIT_BYTES,
  coreLimitsOfProcessesWith,
} from '../../src/system/core-limit.js';
import type { NavigatorWithUserAgentData } from './browser-types.js';
import { browserAvailable, usePageServer, useTempCache } from './helpers.js';

const PAGE = '<style>a:hover{color:red}</style><a href="#">link</a>';

describe.skipIf(!browserAvailable())('launchBrowser', () => {
  const cache = useTempCache();
  const site = usePageServer(PAGE);
  let session: BrowserSession | undefined;

  afterEach(async () => {
    await session?.dispose();
    session = undefined;
  });

  it('records sharp desktop frames and looks like a desktop browser', async () => {
    session = await launchBrowser({ identity: IDENTITIES.desktop, paths: cache.paths() });
    await session.page.goto(site.url());

    const frame = await captureFirstFrame(session.page);
    const page = await session.page.evaluate(() => ({
      hover: matchMedia('(hover: hover)').matches,
      finePointer: matchMedia('(pointer: fine)').matches,
      headless: navigator.userAgent.includes('Headless'),
      brands: (navigator as NavigatorWithUserAgentData).userAgentData?.brands.length ?? 0,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${innerWidth}x${innerHeight}`,
    }));

    expect(jpegSize(frame.data)).toEqual({ width: 2560, height: 1600 });
    expect(page).toMatchObject({
      hover: true,
      finePointer: true,
      headless: false,
      screen: '1280x800',
      viewport: '1280x800',
    });
    expect(page.brands).toBeGreaterThan(0);
  });

  it('records sharp phone frames and looks like a phone', async () => {
    session = await launchBrowser({ identity: IDENTITIES.phone, paths: cache.paths() });
    await session.page.goto(site.url());

    const frame = await captureFirstFrame(session.page);
    const page = await session.page.evaluate(() => ({
      noHover: matchMedia('(hover: none)').matches,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      mobile: (navigator as NavigatorWithUserAgentData).userAgentData?.mobile ?? false,
      touchPoints: navigator.maxTouchPoints,
    }));

    expect(jpegSize(frame.data)).toEqual({ width: 1170, height: 2532 });
    expect(page).toMatchObject({ noHover: true, coarsePointer: true, mobile: true });
    expect(page.touchPoints).toBeGreaterThan(0);
  });

  it.skipIf(process.platform !== 'linux')(
    'turns core dumps off for every browser process',
    async () => {
      session = await launchBrowser({ identity: IDENTITIES.desktop, paths: cache.paths() });

      const limits = await coreLimitsOfProcessesWith(session.profileDir);

      expect(limits.length).toBeGreaterThan(0);
      expect(new Set(limits)).toEqual(new Set([BLOCKING_CORE_LIMIT_BYTES]));
    },
  );

  it('removes its temporary profile when disposed', async () => {
    session = await launchBrowser({ identity: IDENTITIES.desktop, paths: cache.paths() });
    const { profileDir } = session;

    await session.dispose();

    expect(existsSync(profileDir)).toBe(false);
  });
});
