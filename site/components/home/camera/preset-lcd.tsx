'use client';

import { motion } from 'motion/react';
import { presetAt } from './settings';

const FLICKER_STEPS = 3;
const FLICKER = {
  duration: 0.26,
  ease: (progress: number) => Math.ceil(progress * FLICKER_STEPS) / FLICKER_STEPS,
};
const DIVIDER = 'mt-1.5 border-t-2 border-dashed border-ink/20 pt-1.5 text-[12.5px]';

export function PresetLcd({ preset }: { readonly preset: number }) {
  const { name, size, fps, limit, flag } = presetAt(preset);
  return (
    <motion.div
      key={name}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] self-center rounded-[18px] bg-mint px-4 pt-2.5 pb-3 text-ink shadow-[inset_0_0_0_3px_rgb(30_27_75/0.12),inset_0_5px_0_rgb(30_27_75/0.08)] [grid-area:lcd]"
      initial={{ opacity: 0.25 }}
      animate={{ opacity: 1 }}
      transition={FLICKER}
    >
      <span className="col-span-2 text-[21px] leading-tight font-bold">{name}</span>
      <span className="col-span-2 font-semibold tabular-nums">
        {size} · {fps} fps
      </span>
      <span className={DIVIDER}>{limit}</span>
      <span className={`${DIVIDER} pl-2.5 text-right font-medium`}>{flag}</span>
    </motion.div>
  );
}
