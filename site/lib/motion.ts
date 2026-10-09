import type { Transition } from 'motion/react';

export const POP: Transition = { type: 'spring', stiffness: 260, damping: 12 };
export const BOUNCE: Transition = { type: 'spring', stiffness: 480, damping: 14 };
export const SOFT: Transition = { type: 'spring', stiffness: 140, damping: 16 };
export const FLOAT: Transition = { repeat: Infinity, ease: 'easeInOut' };

export const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
} as const;
