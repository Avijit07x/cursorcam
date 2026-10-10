'use client';

import { motion, useAnimate, useInView } from 'motion/react';
import type { Ref } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useBursts } from '@/components/brand/burst';
import { IN_VIEW } from '@/lib/motion';

const INK = '#1E1B4B';
const BRAND = '#4F46E5';
const BLUSH = '#FB7185';
const WHITE = '#fff';
const EDGE = { stroke: WHITE, strokeWidth: 6, strokeLinejoin: 'round' } as const;
const LINE = { fill: 'none', stroke: INK, strokeWidth: 1.6 } as const;
const STRIP = { x: 7, width: 50, height: 8, rx: 2 } as const;
const BODY = 'M7 31H57V52a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5Z';
const ARM_Y = 16;
const STICK_Y = 25;
const ARM_STRIPES = 'M14 16h5l-4 8h-5ZM24 16h5l-4 8h-5ZM34 16h5l-4 8h-5ZM44 16h5l-4 8h-5Z';
const STICK_STRIPES = 'M10 25h5l4 8h-5ZM20 25h5l4 8h-5ZM30 25h5l4 8h-5ZM40 25h5l4 8h-5Z';

const OPEN = -24;
const HINGE = { rotate: OPEN, transformBox: 'fill-box', transformOrigin: '0% 100%' } as const;
const LIFT = { duration: 0.22, ease: 'easeOut' } as const;
const SLAM = { duration: 0.12, ease: 'easeIn' } as const;
const SQUISH = { scale: [1, 0.9, 1.06, 1] };
const SQUISH_TIMING = { duration: 0.35 };
const FIRST_TAKE_DELAY = 0.45;

function Strip({ y, stripes }: { readonly y: number; readonly stripes: string }) {
  return (
    <>
      <rect {...STRIP} y={y} fill={WHITE} />
      <path d={stripes} fill={INK} />
      <rect {...STRIP} y={y} {...LINE} />
    </>
  );
}

function BoardArt({ armRef }: { readonly armRef: Ref<SVGGElement> }) {
  return (
    <svg
      viewBox="2 10 60 52"
      aria-hidden="true"
      className="sticker-shadow size-full overflow-visible"
    >
      <path d={BODY} fill={WHITE} {...EDGE} />
      <rect {...STRIP} y={STICK_Y} fill={WHITE} {...EDGE} />
      <motion.g ref={armRef} style={HINGE}>
        <rect {...STRIP} y={ARM_Y} fill={WHITE} {...EDGE} />
        <Strip y={ARM_Y} stripes={ARM_STRIPES} />
      </motion.g>
      <path d={BODY} fill={BRAND} />
      <Strip y={STICK_Y} stripes={STICK_STRIPES} />
      <ellipse cx="25" cy="42.5" rx="2.2" ry="3" fill={WHITE} />
      <ellipse cx="39" cy="42.5" rx="2.2" ry="3" fill={WHITE} />
      <ellipse cx="19.5" cy="48" rx="3" ry="1.8" fill={BLUSH} opacity="0.9" />
      <ellipse cx="44.5" cy="48" rx="3" ry="1.8" fill={BLUSH} opacity="0.9" />
      <path
        d="M29 47.5q3 2.8 6 0"
        fill="none"
        stroke={WHITE}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Clapperboard() {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const arm = useRef<SVGGElement>(null);
  const busy = useRef(false);
  const inView = useInView(scope, IN_VIEW);
  const { fire, layer } = useBursts();

  const clap = useCallback(
    async (lift: boolean, delay = 0) => {
      const target = arm.current;
      if (!target || busy.current) return;
      busy.current = true;
      if (lift) await animate(target, { rotate: OPEN }, LIFT);
      await animate(target, { rotate: 0 }, { ...SLAM, delay });
      fire();
      await animate(scope.current, SQUISH, SQUISH_TIMING);
      busy.current = false;
    },
    [animate, fire, scope],
  );

  useEffect(() => {
    if (inView) void clap(false, FIRST_TAKE_DELAY);
  }, [inView, clap]);

  return (
    <div className="relative shrink-0">
      <button
        ref={scope}
        type="button"
        aria-label="Clap the board"
        onClick={() => void clap(true)}
        className="block size-[clamp(58px,6.5vw,76px)] -rotate-6 cursor-pointer rounded-2xl focus-ring"
      >
        <BoardArt armRef={arm} />
      </button>
      {layer}
    </div>
  );
}
