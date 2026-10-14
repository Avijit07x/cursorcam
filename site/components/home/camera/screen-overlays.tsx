'use client';

import { AnimatePresence, motion } from 'motion/react';
import { POP } from '@/lib/motion';

const HIDDEN = { opacity: 0, scale: 0.4 };
const SHOWN = { opacity: 1, scale: 1 };

interface ScreenToastProps {
  readonly text: string;
  readonly position: string;
}

export function ScreenToast({ text, position }: ScreenToastProps) {
  return (
    <AnimatePresence>
      {text ? (
        <motion.span
          key="toast"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 rounded-full bg-white px-3 py-1 text-[clamp(11px,1.1vw,13px)] font-semibold whitespace-nowrap text-ink shadow-[0_4px_12px_-4px_rgb(30_27_75/0.18)] ${position}`}
          style={{ x: '-50%' }}
          initial={HIDDEN}
          animate={SHOWN}
          exit={HIDDEN}
          transition={POP}
        >
          {text}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
