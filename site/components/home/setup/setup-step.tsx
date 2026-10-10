'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { IN_VIEW, POP, REVEAL } from '@/lib/motion';

const NUMBER_COLORS = {
  brand: 'bg-brand text-white',
  rose: 'bg-rose text-white',
  mint: 'bg-mint text-ink',
} as const;

const NUMBER_SPIN = 40;

interface SetupStepProps {
  readonly number: number;
  readonly title: string;
  readonly color: keyof typeof NUMBER_COLORS;
  readonly tilt: number;
  readonly turn: number;
  readonly children: ReactNode;
}

export function SetupStep({ number, title, color, tilt, turn, children }: SetupStepProps) {
  return (
    <motion.li
      {...REVEAL}
      className="relative px-5 pt-10 pb-5.5 not-last:after:absolute not-last:after:top-[calc(100%+4px)] not-last:after:left-10.25 not-last:after:h-4.5 not-last:after:w-0.75 not-last:after:rounded-full not-last:after:bg-brand-soft not-last:after:content-[''] sm:px-7 sm:pb-6.5"
    >
      <span
        aria-hidden="true"
        className="sticker-shadow absolute inset-0 rounded-[28px] bg-white"
        style={{ rotate: `${tilt}deg` }}
      />
      <motion.span
        aria-hidden="true"
        className={`sticker-shadow absolute -top-5.5 left-4.5 z-10 grid size-12.5 place-items-center rounded-full border-[3.5px] border-white text-[22px] font-bold ${NUMBER_COLORS[color]}`}
        initial={{ scale: 0, rotate: turn - NUMBER_SPIN }}
        whileInView={{ scale: 1, rotate: turn }}
        viewport={IN_VIEW}
        transition={POP}
      >
        {number}
      </motion.span>
      <div className="relative">
        <h3 className="mb-3.5 text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-snug font-semibold text-ink">
          {title}
        </h3>
        {children}
      </div>
    </motion.li>
  );
}
