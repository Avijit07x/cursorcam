'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { IN_VIEW, POP, REVEAL } from '@/lib/motion';

const SCENES = {
  lights: {
    number: 'bg-brand text-white',
    cue: 'text-brand',
    tint: 'from-brand-soft/80 to-brand-tint',
  },
  camera: { number: 'bg-rose text-white', cue: 'text-rose', tint: 'from-rose/25 to-rose/5' },
  action: { number: 'bg-mint text-ink', cue: 'text-ink', tint: 'from-mint/45 to-mint/10' },
} as const;

const NUMBER_SPIN = 40;

interface SetupStepProps {
  readonly number: number;
  readonly scene: keyof typeof SCENES;
  readonly cue: string;
  readonly title: string;
  readonly art: ReactNode;
  readonly tilt: number;
  readonly turn: number;
  readonly children: ReactNode;
}

// A tilted step card with its number sticker, a sticker cue word, the step, what to do,
// and its drawing on a tinted tile. The drawing acts when the card is hovered.
export function SetupStep({
  number,
  scene,
  cue,
  title,
  art,
  tilt,
  turn,
  children,
}: SetupStepProps) {
  const look = SCENES[scene];
  return (
    <motion.li
      {...REVEAL}
      className="group relative px-5 pt-10 pb-5.5 not-last:after:absolute not-last:after:top-[calc(100%+4px)] not-last:after:left-10.25 not-last:after:h-4.5 not-last:after:w-0.75 not-last:after:rounded-full not-last:after:bg-brand-soft not-last:after:content-[''] sm:px-7 sm:pb-6.5"
    >
      <span
        aria-hidden="true"
        className="sticker-shadow absolute inset-0 rounded-[28px] bg-white"
        style={{ rotate: `${tilt}deg` }}
      />
      <motion.span
        aria-hidden="true"
        className={`sticker-shadow absolute -top-5.5 left-4.5 z-10 grid size-12.5 place-items-center rounded-full border-[3.5px] border-white text-[22px] font-bold ${look.number}`}
        initial={{ scale: 0, rotate: turn - NUMBER_SPIN }}
        whileInView={{ scale: 1, rotate: turn }}
        viewport={IN_VIEW}
        transition={POP}
      >
        {number}
      </motion.span>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 sm:gap-x-6">
        <div>
          <p
            className={`sticker-text text-[clamp(1.875rem,1.5rem+1vw,2.375rem)] leading-none font-bold tracking-tight ${look.cue}`}
          >
            {cue}
          </p>
          <h3 className="mt-2 mb-3.5 text-[17px] font-semibold text-body">{title}</h3>
        </div>
        <div
          className={`grid size-18 place-items-center rounded-[20px] bg-radial-[at_50%_120%] sm:row-span-2 sm:size-30 sm:rounded-[24px] ${look.tint}`}
        >
          <span className="size-13 sm:size-22">{art}</span>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col items-start gap-2.5 sm:col-span-1">
          {children}
        </div>
      </div>
    </motion.li>
  );
}
