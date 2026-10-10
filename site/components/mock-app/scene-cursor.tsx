'use client';

import { motion, useTransform } from 'motion/react';
import { BuddyCursorArt } from '@/components/brand/sticker-art';
import { part, type PointValues } from './stage';
import { containerHeight, containerWidth } from './units';

const TIP = { x: '-25%', y: '-14.583%' };

export function SceneCursor({ point }: { readonly point: PointValues }) {
  const x = useTransform(point.x, containerWidth);
  const y = useTransform(point.y, containerHeight);
  return (
    <motion.span
      className="pointer-events-none absolute top-0 left-0 z-5 size-[max(18px,8.4cqh)]"
      style={{ x, y }}
    >
      <motion.span className="block size-full" style={TIP}>
        <span className="block size-full motion-safe:animate-bob">
          <span {...part('cursor-art')} className="block size-full origin-[25%_15%]">
            <BuddyCursorArt />
          </span>
        </span>
      </motion.span>
    </motion.span>
  );
}
