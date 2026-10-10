'use client';

import { motion } from 'motion/react';
import { useBursts } from '@/components/brand/burst';
import { StickerMark } from '@/components/brand/sticker-mark';
import { POP } from '@/lib/motion';

export function HeroSticker() {
  const { fire, layer } = useBursts();

  return (
    <div className="relative">
      <motion.button
        type="button"
        aria-label="Boop the CursorCam logo"
        onClick={fire}
        className="relative block size-[clamp(3.5rem,13dvh,7rem)] cursor-pointer rounded-4xl focus-ring"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...POP, delay: 0.1 }}
        whileHover={{ scale: 1.07, rotate: [0, -9, 7, -4, 0], transition: { duration: 0.6 } }}
        whileTap={{ scale: 0.86 }}
      >
        <div className="size-full motion-safe:animate-float">
          <StickerMark className="size-full" />
        </div>
      </motion.button>
      {layer}
    </div>
  );
}
