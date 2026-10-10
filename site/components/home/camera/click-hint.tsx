'use client';

import { AnimatePresence, motion } from 'motion/react';
import { POP } from '@/lib/motion';

const ARROW = 'M4 21C11 8 22 5 35 15';
const ARROW_HEAD = 'M27 15.6 35 15l-3.3-7.3';
const HIDDEN = { opacity: 0, scale: 0.4, rotate: 10 };
const SHOWN = { opacity: 1, scale: 1, rotate: -5 };

function Arrow() {
  return (
    <svg viewBox="0 0 40 26" aria-hidden="true" className="sticker-shadow w-10 shrink-0">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={ARROW} stroke="#fff" strokeWidth={7.5} />
        <path d={ARROW_HEAD} stroke="#fff" strokeWidth={7.5} />
        <path d={ARROW} stroke="var(--color-rose)" strokeWidth={3.5} />
        <path d={ARROW_HEAD} stroke="var(--color-rose)" strokeWidth={3.5} />
      </g>
    </svg>
  );
}

export function ClickHint({ visible }: { readonly visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.span
          key="hint"
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-full mr-1 hidden origin-right sm:flex"
          initial={HIDDEN}
          animate={SHOWN}
          exit={HIDDEN}
          transition={POP}
        >
          <span className="flex items-center gap-1 motion-safe:animate-nudge">
            <span className="sticker-text text-[clamp(17px,1.7vw,21px)] font-bold whitespace-nowrap text-brand">
              Click me!
            </span>
            <Arrow />
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
