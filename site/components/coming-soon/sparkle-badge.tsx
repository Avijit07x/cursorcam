'use client';

import { motion } from 'motion/react';
import { FADE_UP, FLOAT, SOFT } from '@/lib/motion';

const SPARKLE_PATH =
  'M12 1c.8 6.4 4.6 10.2 11 11-6.4.8-10.2 4.6-11 11-.8-6.4-4.6-10.2-11-11 6.4-.8 10.2-4.6 11-11Z';
const TWINKLE_SECONDS = 1.8;

function Sparkle({ delay }: { delay: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-3.5"
      animate={{ scale: [0.6, 1.1, 0.6], rotate: [0, 45, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ ...FLOAT, duration: TWINKLE_SECONDS, delay }}
    >
      <path d={SPARKLE_PATH} fill="currentColor" />
    </motion.svg>
  );
}

export function SparkleBadge({ delay }: { delay: number }) {
  return (
    <motion.p
      {...FADE_UP}
      transition={{ ...SOFT, delay }}
      className="inline-flex items-center gap-2 text-base font-semibold text-brand sm:text-lg"
    >
      <Sparkle delay={0} />
      Website coming soon
      <Sparkle delay={TWINKLE_SECONDS / 2} />
    </motion.p>
  );
}
