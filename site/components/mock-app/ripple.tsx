'use client';

import { motion, useTransform } from 'motion/react';
import { part, type PointValues } from './stage';
import { percent } from './units';

export function Ripple({ point }: { readonly point: PointValues }) {
  const left = useTransform(point.x, percent);
  const top = useTransform(point.y, percent);
  return (
    <motion.span
      {...part('ripple')}
      className="pointer-events-none absolute -mt-[4.5cqh] -ml-[4.5cqh] size-[9cqh] rounded-full border-2 border-brand opacity-0"
      style={{ left, top }}
    />
  );
}
