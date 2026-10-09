import { describe, expect, it } from 'vitest';
import { IDENTITIES, launchArgsFor, userAgentFor } from '../../../src/browser/identity.js';

describe('userAgentFor', () => {
  it('builds a desktop Chrome agent for each platform without "Headless"', () => {
    const linux = userAgentFor(IDENTITIES.desktop, 'chrome', 154, 'linux');
    const mac = userAgentFor(IDENTITIES.desktop, 'chrome', 154, 'darwin');
    const windows = userAgentFor(IDENTITIES.desktop, 'chrome', 154, 'win32');

    expect(linux).toBe(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    );
    expect(mac).toContain('Macintosh; Intel Mac OS X 10_15_7');
    expect(windows).toContain('Windows NT 10.0; Win64; x64');
    expect([linux, mac, windows].join()).not.toContain('Headless');
  });

  it('marks Edge', () => {
    expect(userAgentFor(IDENTITIES.desktop, 'edge', 141, 'win32')).toMatch(/ Edg\/141\.0\.0\.0$/);
  });

  it('builds a phone agent', () => {
    expect(userAgentFor(IDENTITIES.phone, 'chrome', 154, 'linux')).toBe(
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
    );
  });
});

describe('launchArgsFor', () => {
  it('sets scale, window size and pointer settings for the desktop', () => {
    expect(launchArgsFor(IDENTITIES.desktop)).toEqual([
      '--force-device-scale-factor=2',
      '--window-size=1280,800',
      '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
    ]);
  });

  it('uses a coarse pointer without hover for the phone', () => {
    const args = launchArgsFor(IDENTITIES.phone);

    expect(args).toContain('--force-device-scale-factor=3');
    expect(args).toContain('--window-size=390,844');
    expect(args.at(-1)).toContain('primaryHoverType=1');
    expect(args.at(-1)).toContain('primaryPointerType=2');
  });
});
