'use client';

import { motion } from 'motion/react';
import type { ComponentType } from 'react';
import {
  BuddyCursorArt,
  HeartArt,
  PlayArt,
  RecArt,
  SparkleArt,
  StarArt,
} from '@/components/brand/sticker-art';
import { FLOAT, POP } from '@/lib/motion';

interface StickerSpot {
  readonly name: string;
  readonly Art: ComponentType;
  readonly place: string;
  readonly size: string;
  readonly tilt: number;
  readonly lift: number;
  readonly seconds: number;
}

const STICKERS: readonly StickerSpot[] = [
  {
    name: 'heart',
    Art: HeartArt,
    place: 'top-[9%] left-[6%] sm:top-[16%] sm:left-[9%]',
    size: 'size-12 sm:size-16',
    tilt: -14,
    lift: 12,
    seconds: 5.2,
  },
  {
    name: 'rec',
    Art: RecArt,
    place: 'top-[7%] right-[5%] sm:top-[15%] sm:right-[10%]',
    size: '',
    tilt: 8,
    lift: 10,
    seconds: 4.6,
  },
  {
    name: 'sparkle',
    Art: SparkleArt,
    place: 'hidden sm:block sm:top-[40%] sm:left-[16%]',
    size: 'size-11',
    tilt: 10,
    lift: 14,
    seconds: 6.1,
  },
  {
    name: 'star',
    Art: StarArt,
    place: 'hidden sm:block sm:top-[42%] sm:right-[13%]',
    size: 'size-16',
    tilt: -8,
    lift: 11,
    seconds: 5.6,
  },
  {
    name: 'play',
    Art: PlayArt,
    place: 'hidden sm:block sm:top-[66%] sm:left-[8%]',
    size: 'size-14',
    tilt: 12,
    lift: 9,
    seconds: 4.9,
  },
  {
    name: 'cursor',
    Art: BuddyCursorArt,
    place: 'hidden sm:block sm:top-[68%] sm:right-[8%]',
    size: 'size-16',
    tilt: -6,
    lift: 13,
    seconds: 5.8,
  },
];

const ENTER_DELAY = 1.1;
const ENTER_STAGGER = 0.12;

export function FloatingStickers() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {STICKERS.map(({ name, Art, place, size, tilt, lift, seconds }, index) => (
        <motion.div
          key={name}
          className={`sticker-shadow pointer-events-auto absolute cursor-grab touch-none active:cursor-grabbing ${place}`}
          initial={{ scale: 0, rotate: tilt - 40 }}
          animate={{ scale: 1, rotate: tilt }}
          transition={{ ...POP, delay: ENTER_DELAY + index * ENTER_STAGGER }}
          drag
          dragSnapToOrigin
          dragElastic={0.6}
          whileHover={{ scale: 1.15 }}
          whileDrag={{ scale: 1.2, rotate: 0 }}
        >
          <motion.div
            className={size}
            animate={{ y: [0, -lift, 0], rotate: [0, 6, 0] }}
            transition={{ ...FLOAT, duration: seconds }}
          >
            <Art />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
