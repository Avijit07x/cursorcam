'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

export function MotionProvider({ children }: { readonly children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
