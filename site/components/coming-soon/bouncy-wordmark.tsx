'use client';

import { motion } from 'motion/react';
import { WORDMARK_BLUE_FROM, WORDMARK_LETTERS } from '@/components/brand/wordmark';
import { BOUNCE } from '@/lib/motion';

const ENTER_DELAY = 0.35;
const ENTER_STAGGER = 0.06;
const WAVE_DELAY = 1.8;
const WAVE_STAGGER = 0.07;
const TILT = 12;

export function BouncyWordmark() {
  return (
    <h1
      aria-label="CursorCam"
      className="sticker-text flex text-[clamp(2.75rem,6vw,4.5rem)] leading-none font-bold tracking-[-0.01em] select-none"
    >
      {WORDMARK_LETTERS.map((letter, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <motion.span
            key={index}
            aria-hidden="true"
            className={
              index >= WORDMARK_BLUE_FROM ? 'inline-block text-brand' : 'inline-block text-ink'
            }
            initial={{ y: -70, opacity: 0, rotate: side * TILT }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ ...BOUNCE, delay: ENTER_DELAY + index * ENTER_STAGGER }}
            whileHover={{ y: -14, rotate: side * 8, scale: 1.12 }}
          >
            <span
              className="inline-block motion-safe:animate-wave"
              style={{ animationDelay: `${WAVE_DELAY + index * WAVE_STAGGER}s` }}
            >
              {letter}
            </span>
          </motion.span>
        );
      })}
    </h1>
  );
}
