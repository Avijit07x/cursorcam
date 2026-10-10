'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { POP } from '@/lib/motion';

export function ButtonMotion({ children }: { readonly children: ReactNode }) {
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ y: -3, rotate: -1.5 }}
      whileTap={{ scale: 0.94 }}
      transition={POP}
    >
      {children}
    </motion.span>
  );
}
