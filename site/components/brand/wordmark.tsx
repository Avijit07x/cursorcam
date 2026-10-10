'use client';

import { motion } from 'motion/react';
import { BOUNCE } from '@/lib/motion';

export const WORDMARK_LETTERS = [...'cursorcam'];
export const WORDMARK_BLUE_FROM = 6;

const ENTER_DELAY = 0.35;
const ENTER_STAGGER = 0.06;
const DROP = -40;
const TILT = 12;

export function Wordmark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex text-[28px] leading-none font-bold tracking-[-0.01em] text-ink select-none"
    >
      {WORDMARK_LETTERS.map((letter, index) => (
        <motion.span
          key={index}
          className={index >= WORDMARK_BLUE_FROM ? 'inline-block text-brand' : 'inline-block'}
          initial={{ y: DROP, opacity: 0, rotate: index % 2 === 0 ? -TILT : TILT }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ ...BOUNCE, delay: ENTER_DELAY + index * ENTER_STAGGER }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}
