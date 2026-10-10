'use client';

import { motion } from 'motion/react';
import { POP } from '@/lib/motion';

const CORNER_PATH = 'M5 42V22A17 17 0 0 1 22 5h20';
const CORNER_STAGGER = 0.08;

const CORNERS = [
  { position: 'top-0 left-0', rotate: 0 },
  { position: 'top-0 right-0', rotate: 90 },
  { position: 'right-0 bottom-0', rotate: 180 },
  { position: 'bottom-0 left-0', rotate: 270 },
] as const;

export function ViewfinderCorners({ className }: { readonly className: string }) {
  return (
    <>
      {CORNERS.map((corner, index) => (
        <motion.svg
          key={corner.position}
          viewBox="0 0 64 64"
          aria-hidden="true"
          className={`absolute ${corner.position} ${className}`}
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
    </>
  );
}
