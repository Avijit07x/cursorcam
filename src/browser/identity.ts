import type { Size } from '../shared/geometry.js';
import type { BrowserKind } from './finder.js';

export type IdentityName = 'desktop' | 'phone';

export interface Identity {
  readonly name: IdentityName;
  readonly viewport: Size;
  readonly scale: number;
  readonly mobile: boolean;
  readonly blinkSettings: string;
}

const DESKTOP_BLINK_SETTINGS =
  'primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4';
const PHONE_BLINK_SETTINGS =
  'primaryHoverType=1,availableHoverTypes=1,primaryPointerType=2,availablePointerTypes=2';

export const IDENTITIES: Readonly<Record<IdentityName, Identity>> = {
  desktop: {
    name: 'desktop',
    viewport: { width: 1280, height: 800 },
    scale: 2,
    mobile: false,
    blinkSettings: DESKTOP_BLINK_SETTINGS,
  },
  phone: {
    name: 'phone',
    viewport: { width: 390, height: 844 },
    scale: 3,
    mobile: true,
    blinkSettings: PHONE_BLINK_SETTINGS,
  },
};

export const LOGIN_IDENTITY: Identity = { ...IDENTITIES.desktop, scale: 1 };

const DESKTOP_PLATFORM_TOKENS: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'Windows NT 10.0; Win64; x64',
  darwin: 'Macintosh; Intel Mac OS X 10_15_7',
};
const LINUX_PLATFORM_TOKEN = 'X11; Linux x86_64';
const PHONE_PLATFORM_TOKEN = 'Linux; Android 10; K';
const ENGINE_TOKEN = 'AppleWebKit/537.36 (KHTML, like Gecko)';

export function userAgentFor(
  identity: Identity,
  kind: BrowserKind,
  major: number,
  platform: NodeJS.Platform = process.platform,
): string {
  const version = `${major}.0.0.0`;
  const platformToken = identity.mobile
    ? PHONE_PLATFORM_TOKEN
    : (DESKTOP_PLATFORM_TOKENS[platform] ?? LINUX_PLATFORM_TOKEN);
  const safari = identity.mobile ? 'Mobile Safari/537.36' : 'Safari/537.36';
  const edge = kind === 'edge' ? ` Edg/${version}` : '';
  return `Mozilla/5.0 (${platformToken}) ${ENGINE_TOKEN} Chrome/${version} ${safari}${edge}`;
}

export function launchArgsFor(identity: Identity): string[] {
  const { width, height } = identity.viewport;
  return [
    `--force-device-scale-factor=${identity.scale}`,
    `--window-size=${width},${height}`,
    `--blink-settings=${identity.blinkSettings}`,
  ];
}
