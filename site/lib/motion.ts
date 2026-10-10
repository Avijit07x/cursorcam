import type { Transition } from 'motion/react';

export const POP: Transition = { type: 'spring', stiffness: 260, damping: 12 };
export const BOUNCE: Transition = { type: 'spring', stiffness: 480, damping: 14 };
export const SOFT: Transition = { type: 'spring', stiffness: 140, damping: 16 };
export const DETENT: Transition = { type: 'spring', stiffness: 420, damping: 32 };

export const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
} as const;

export const IN_VIEW = { once: true, margin: '0px 0px -64px 0px' } as const;

export const REVEAL = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: IN_VIEW,
  transition: SOFT,
} as const;
