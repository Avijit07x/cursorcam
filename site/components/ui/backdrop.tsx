'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { POP } from '@/lib/motion';

const TICK_MS = 1000;
const CORNER_STAGGER = 0.08;
const BLINK_SECONDS = 1.2;
const CORNER_PATH = 'M5 42V22A17 17 0 0 1 22 5h20';

const CORNERS = [
  { position: 'top-0 left-0', rotate: 0 },
  { position: 'top-0 right-0', rotate: 90 },
  { position: 'right-0 bottom-0', rotate: 180 },
  { position: 'bottom-0 left-0', rotate: 270 },
] as const;

const LABEL =
  'absolute items-center gap-2 text-xs font-semibold tracking-wider tabular-nums sm:text-sm';

function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

function timecode(total: number) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

export function Backdrop() {
  const seconds = useElapsedSeconds();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-3 z-20 sm:inset-5">
      {CORNERS.map((corner, index) => (
        <motion.svg
          key={corner.position}
          viewBox="0 0 64 64"
          className={`absolute size-10 text-brand-soft sm:size-16 ${corner.position}`}
          initial={{ opacity: 0, scale: 0.6, rotate: corner.rotate }}
          animate={{ opacity: 1, scale: 1, rotate: corner.rotate }}
          transition={{ ...POP, delay: index * CORNER_STAGGER }}
        >
          <path
            d={CORNER_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </motion.svg>
      ))}
      <span className={`${LABEL} top-3.5 left-4 flex text-rec sm:top-6 sm:left-8`}>
        <motion.span
          className="size-2 rounded-full bg-rec sm:size-2.5"
          animate={{ opacity: [1, 1, 0.15, 0.15] }}
          transition={{ duration: BLINK_SECONDS, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
        />
        REC
      </span>
      <span className={`${LABEL} top-3.5 right-4 flex text-muted sm:top-6 sm:right-8`}>
        {timecode(seconds)}
      </span>
      <span className={`${LABEL} bottom-6 left-8 hidden text-muted sm:flex`}>1080p · 60 fps</span>
      <span className={`${LABEL} right-8 bottom-6 hidden sm:flex`}>
        <span className="relative h-3.5 w-7 rounded-[5px] border-2 border-brand-soft p-0.5 after:absolute after:top-1/2 after:-right-1.5 after:h-1.5 after:w-1 after:-translate-y-1/2 after:rounded-r-sm after:bg-brand-soft">
          <span className="block h-full w-4/5 rounded-xs bg-mint" />
        </span>
      </span>
    </div>
  );
}
