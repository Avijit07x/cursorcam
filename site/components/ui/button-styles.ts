import type { ReactNode } from 'react';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  soft: 'bg-white text-ink ring-1 ring-ink/10 hover:bg-brand-tint',
} as const;

const SIZES = {
  md: 'h-12 px-6 text-base',
  sm: 'h-10.5 px-5 text-[15px]',
} as const;

export interface ButtonLookProps {
  readonly children: ReactNode;
  readonly variant?: keyof typeof VARIANTS;
  readonly size?: keyof typeof SIZES;
}

export function buttonClass(
  variant: keyof typeof VARIANTS = 'primary',
  size: keyof typeof SIZES = 'md',
) {
  return `sticker-shadow inline-flex cursor-pointer items-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors focus-ring ${VARIANTS[variant]} ${SIZES[size]}`;
}
