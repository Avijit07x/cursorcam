'use client';

import { motion } from 'motion/react';
import { part } from '@/components/mock-app/stage';
import { CSS_EASE } from '@/components/mock-app/timing';
import { ADDRESS_PILL } from '@/components/ui/browser-window';
import { DEMO_URL, START_URL } from '../sticker-data';

const COLOR_SECONDS = 0.3;

export function AddressPill({ set }: { readonly set: boolean }) {
  return (
    <motion.span
      {...part('address')}
      className={set ? `${ADDRESS_PILL} font-semibold` : ADDRESS_PILL}
      initial={false}
      animate={{ color: set ? 'var(--color-brand)' : 'var(--color-muted)' }}
      transition={{ duration: COLOR_SECONDS, ease: CSS_EASE }}
    >
      {set ? DEMO_URL : START_URL}
    </motion.span>
  );
}
