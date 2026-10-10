import { MOCK_APP } from '@/lib/mock-app';

export type StickerKey = 'zoom' | 'cursor' | 'logins' | 'hide' | 'twofa' | 'dark' | 'url' | 'ff';

export interface Sticker {
  readonly key: StickerKey;
  readonly name: string;
  readonly about: string;
  readonly chips: readonly string[];
  readonly tilt: number;
}

export interface WindowTagInfo {
  readonly label: string;
  readonly chips: readonly string[];
}

export const START_URL = MOCK_APP.address;
export const DEMO_URL = 'app.example.com';
export const DEFAULT_LINE = 'Drag a sticker onto the app. Or just tap one.';
export const DEFAULT_TAG: WindowTagInfo = { label: 'Default', chips: ['1920×1080', '60 fps'] };

export const STICKERS: readonly Sticker[] = [
  {
    key: 'zoom',
    name: 'Zoom',
    about: 'the camera zooms in on each click, stays close, then zooms back out.',
    chips: ['up to 2×'],
    tilt: -6,
  },
  {
    key: 'cursor',
    name: 'Cursor',
    about: 'a smooth cursor glides to each spot and clicks with a ripple.',
    chips: ['smooth glide', 'click ripples'],
    tilt: 5,
  },
  {
    key: 'logins',
    name: 'Logins',
    about: 'Claude asks you for the login. Passwords show as dots, and nothing is saved.',
    chips: ['dots for passwords', 'never saved'],
    tilt: -3,
  },
  {
    key: 'hide',
    name: 'Hide',
    about: 'name anything private, like an email, and it is blurred in the video.',
    chips: ['blurred in the video'],
    tilt: 7,
  },
  {
    key: 'twofa',
    name: '2FA',
    about: 'the run waits, and Claude asks you for the code.',
    chips: ['waits up to 5 min'],
    tilt: -6,
  },
  {
    key: 'dark',
    name: 'Dark mode',
    about: 'say "in dark mode", and the app is recorded in dark colors.',
    chips: ['dark colors'],
    tilt: 5,
  },
  {
    key: 'url',
    name: 'Address bar',
    about: `show ${DEMO_URL} instead of localhost.`,
    chips: [DEMO_URL],
    tilt: -4,
  },
  {
    key: 'ff',
    name: 'Fast-forward',
    about: 'slow waits in your app speed up, so no one sits through a spinner.',
    chips: ['idle waits sped up'],
    tilt: 3,
  },
];

export const stickerLine = (sticker: Sticker) => `${sticker.name}: ${sticker.about}`;

export const stickerTag = (sticker: Sticker | undefined): WindowTagInfo =>
  sticker ? { label: sticker.name, chips: sticker.chips } : DEFAULT_TAG;
