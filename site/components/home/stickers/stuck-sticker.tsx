'use client';

import { motion, useAnimate, useIsPresent } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import { useBursts } from '@/components/brand/burst';
import type { Point } from '@/components/mock-app/stage';
import { POP } from '@/lib/motion';
import type { Sticker } from './sticker-data';
import { lookOf, STICKER_BASE, STICKER_EDGE, StickerFace } from './sticker-looks';

export interface Flight extends Point {
  readonly rotate: number;
  readonly scale: number;
}

const STUCK_TILT = 12;
const STUCK_SCALE = 0.8;
const PEEL_AWAY = {
  x: 12,
  y: -28,
  rotate: 36 - STUCK_TILT,
  scale: 0.7 / STUCK_SCALE,
  opacity: 0,
  transition: { duration: 0.32, ease: 'easeIn' },
} as const;

interface StuckStickerProps {
  readonly sticker: Sticker;
  readonly from: Flight;
  readonly onPlay: () => void;
}

export function StuckSticker({ sticker, from, onPlay }: StuckStickerProps) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const slotRef = useRef<HTMLDivElement>(null);
  const { fire, layer } = useBursts();
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    const button = scope.current;
    const slot = slotRef.current;
    if (!button || !slot) return;
    const rest = slot.getBoundingClientRect();
    const flight = animate(
      button,
      {
        x: [from.x - (rest.left + rest.width / 2), 0],
        y: [from.y - (rest.top + rest.height / 2), 0],
        rotate: [from.rotate, STUCK_TILT],
        scale: [from.scale, STUCK_SCALE],
      },
      POP,
    );
    let flying = true;
    flight.then(() => {
      if (flying) fire();
    });
    return () => {
      flying = false;
      flight.stop();
    };
  }, [animate, scope, from, fire]);

  return (
    <motion.div
      ref={slotRef}
      className="absolute -top-7.5 -right-5.5 z-4 flex max-[400px]:-right-2.5"
      exit={PEEL_AWAY}
    >
      <motion.button
        ref={scope}
        type="button"
        aria-label={`Play ${sticker.name} again`}
        disabled={!isPresent}
        onClick={onPlay}
        className={`${STICKER_BASE} ${lookOf(sticker).shape} ${lookOf(sticker).color} ${STICKER_EDGE} sticker-shadow focus-ring flex cursor-pointer disabled:pointer-events-none`}
        style={{ rotate: STUCK_TILT, scale: STUCK_SCALE }}
      >
        <StickerFace sticker={sticker} />
      </motion.button>
      {layer}
    </motion.div>
  );
}
