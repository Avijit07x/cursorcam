'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { POP } from '@/lib/motion';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  soft: 'bg-white text-ink ring-1 ring-ink/10 hover:bg-brand-tint',
} as const;

interface ButtonLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly variant?: keyof typeof VARIANTS;
}

export function ButtonLink({ href, children, variant = 'primary' }: ButtonLinkProps) {
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ y: -3, rotate: -1.5 }}
      whileTap={{ scale: 0.94 }}
      transition={POP}
    >
      <Link
        href={href}
        className={`sticker-shadow inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-soft ${VARIANTS[variant]}`}
      >
        {children}
      </Link>
    </motion.span>
  );
}
