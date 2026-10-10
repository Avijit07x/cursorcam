'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { REVEAL } from '@/lib/motion';
import { SparkleLabel } from './sparkle-label';

const ALIGN = {
  center: 'mx-auto text-center',
  start: 'text-left',
} as const;

interface SectionHeadingProps {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly children?: ReactNode;
  readonly align?: keyof typeof ALIGN;
}

export function SectionHeading({
  id,
  kicker,
  title,
  children,
  align = 'center',
}: SectionHeadingProps) {
  return (
    <motion.div {...REVEAL} className={`max-w-2xl ${ALIGN[align]}`}>
      <p className="text-base sm:text-lg">
        <SparkleLabel>{kicker}</SparkleLabel>
      </p>
      <h2
        id={id}
        className="sticker-text mt-3 text-[clamp(1.9rem,1.4rem+2.2vw,2.75rem)] leading-[1.08] font-bold tracking-tight text-balance text-ink"
      >
        {title}
      </h2>
      {children ? (
        <div className="mt-3 text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] text-body">{children}</div>
      ) : null}
    </motion.div>
  );
}
