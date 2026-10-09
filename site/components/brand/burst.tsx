'use client';

import { motion } from 'motion/react';

export type ParticleShape = 'heart' | 'star' | 'dot';

export interface Particle {
  readonly x: number;
  readonly y: number;
  readonly rotate: number;
  readonly scale: number;
  readonly shape: ParticleShape;
  readonly color: string;
}

const HEART =
  'M12 20.5C5.5 16.2 2.5 12.9 2.5 9.4 2.5 6.6 4.6 4.5 7.3 4.5c1.9 0 3.6 1 4.7 2.6 1.1-1.6 2.8-2.6 4.7-2.6 2.7 0 4.8 2.1 4.8 4.9 0 3.5-3 6.8-9.5 11.1Z';
const STAR = 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z';
const FADE_SECONDS = 1.05;

function Shape({ shape, color }: { readonly shape: ParticleShape; readonly color: string }) {
  if (shape === 'dot')
    return <span className="block size-2.5 rounded-full" style={{ background: color }} />;
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d={shape === 'heart' ? HEART : STAR}
        fill={color}
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

interface BurstProps {
  readonly particles: readonly Particle[];
  readonly onDone: () => void;
}

export function Burst({ particles, onDone }: BurstProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: FADE_SECONDS, times: [0, 0.65, 1] }}
      onAnimationComplete={onDone}
    >
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ x: particle.x, y: particle.y, scale: particle.scale, rotate: particle.rotate }}
          transition={{ type: 'spring', stiffness: 170, damping: 13 }}
        >
          <Shape shape={particle.shape} color={particle.color} />
        </motion.span>
      ))}
    </motion.div>
  );
}
