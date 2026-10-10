'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { BLUR } from './theme';

interface BlurProps {
  readonly on: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Blur({ on, className = '', children }: BlurProps) {
  return (
    <motion.span
      className={`block ${className}`}
      initial={false}
      animate={{ filter: on ? BLUR.on : BLUR.off }}
      transition={BLUR.transition}
    >
      {children}
    </motion.span>
  );
}
