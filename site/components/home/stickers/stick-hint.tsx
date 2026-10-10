'use client';

import { motion } from 'motion/react';
import { POP } from '@/lib/motion';

const HINT_TILT = 10;
const CATCH_SCALE = 1.2;

export function StickHint({ catching }: { readonly catching: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className={`sticker-shadow absolute -top-6 -right-3 z-3 grid size-16 place-items-center rounded-full border-[2.5px] border-dashed border-brand bg-page text-center text-[11px] leading-[1.05] font-semibold text-brand max-[400px]:-right-1 ${catching ? '' : 'motion-safe:animate-breathe'}`}
      style={{ rotate: HINT_TILT }}
      initial={false}
      animate={{ scale: catching ? CATCH_SCALE : 1 }}
      transition={POP}
    >
      stick
      <br />
      here
    </motion.span>
  );
}
