'use client';

import { useEffect, useState } from 'react';
import { formatTimecode } from '@/lib/timecode';
import { RecDot } from './rec-dot';
import { ViewfinderCorners } from './viewfinder-corners';

const TICK_MS = 1000;

const LABEL =
  'absolute items-center gap-2 text-xs font-semibold tracking-wider tabular-nums sm:text-sm';

function RunningTime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return formatTimecode(seconds);
}

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-3 z-20 sm:inset-5">
      <ViewfinderCorners className="size-10 text-brand-soft sm:size-16" />
      <span className={`${LABEL} top-3.5 left-4 flex text-rec sm:top-6 sm:left-8`}>
        <RecDot className="size-2 sm:size-2.5" />
        REC
      </span>
      <span className={`${LABEL} top-3.5 right-4 flex text-muted sm:top-6 sm:right-8`}>
        <RunningTime />
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
