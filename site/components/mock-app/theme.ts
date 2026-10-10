import type { Target, Variants } from 'motion/react';
import { CSS_EASE } from './timing';

const TONE_SECONDS = 0.5;
const BLUR_SECONDS = 0.4;
const BLUR_PX = 5;
const WHITE = '#ffffff';
const INK = 'var(--color-ink)';
const INK_LINE = '0 0 0 1px rgb(30 27 75 / 0.08)';
const WHITE_LINE = '0 0 0 1px rgb(255 255 255 / 0.08)';
const TONE_FADE = { duration: TONE_SECONDS, ease: CSS_EASE };

const tone = (light: Target, dark: Target): Variants => ({
  light: { ...light, transition: TONE_FADE },
  dark: { ...dark, transition: TONE_FADE },
});

export const toneOf = (dark: boolean) => (dark ? 'dark' : 'light');

export const THEME = {
  view: tone({ backgroundColor: '#fcfcff' }, { backgroundColor: INK }),
  topBar: tone(
    { backgroundColor: WHITE, borderBottomColor: 'rgb(30 27 75 / 0.08)' },
    { backgroundColor: 'rgb(255 255 255 / 0.05)', borderBottomColor: 'rgb(255 255 255 / 0.08)' },
  ),
  text: tone({ color: INK }, { color: WHITE }),
  email: tone({ color: 'var(--color-muted)' }, { color: 'var(--color-brand-soft)' }),
  row: tone(
    { backgroundColor: WHITE, boxShadow: INK_LINE },
    { backgroundColor: 'rgb(255 255 255 / 0.07)', boxShadow: WHITE_LINE },
  ),
  rowBar: tone(
    { backgroundColor: 'rgb(30 27 75 / 0.1)' },
    { backgroundColor: 'rgb(255 255 255 / 0.18)' },
  ),
  newRow: tone(
    { backgroundColor: 'var(--color-brand-tint)', boxShadow: '0 0 0 1px rgb(79 70 229 / 0.3)' },
    { backgroundColor: 'rgb(79 70 229 / 0.45)', boxShadow: WHITE_LINE },
  ),
} as const;

export const BLUR = {
  on: `blur(${BLUR_PX}px)`,
  off: 'blur(0px)',
  transition: { duration: BLUR_SECONDS, ease: CSS_EASE },
} as const;
