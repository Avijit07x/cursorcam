'use client';

import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Burst, type Particle, type ParticleShape } from '@/components/brand/burst';
import { StickerMark } from '@/components/brand/sticker-mark';
import { FLOAT, POP } from '@/lib/motion';

const PARTICLE_COUNT = 12;
const SHAPES: readonly ParticleShape[] = ['heart', 'star', 'dot'];
const COLORS = ['#4F46E5', '#FB7185', '#FCD34D', '#A78BFA', '#38BDF8', '#F472B6'];
const MIN_DISTANCE = 80;
const EXTRA_DISTANCE = 70;
const MAX_TURN = 120;
const FLOAT_SECONDS = 3.6;

interface BurstState {
  readonly id: number;
  readonly particles: readonly Particle[];
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const distance = MIN_DISTANCE + Math.random() * EXTRA_DISTANCE;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 2 * MAX_TURN,
      scale: 0.7 + Math.random() * 0.6,
      shape: SHAPES[index % SHAPES.length] ?? 'dot',
      color: COLORS[index % COLORS.length] ?? '#4F46E5',
    };
  });
}

export function HeroSticker() {
  const [bursts, setBursts] = useState<BurstState[]>([]);
  const nextId = useRef(0);

  const boop = () => {
    const id = nextId.current;
    nextId.current += 1;
    setBursts((list) => [...list, { id, particles: makeParticles() }]);
  };

  const remove = (id: number) => setBursts((list) => list.filter((burst) => burst.id !== id));

  return (
    <div className="relative">
      <motion.button
        type="button"
        aria-label="Boop the CursorCam logo"
        onClick={boop}
        className="relative block size-[clamp(3.5rem,13dvh,7rem)] cursor-pointer rounded-4xl outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...POP, delay: 0.1 }}
        whileHover={{ scale: 1.07, rotate: [0, -9, 7, -4, 0], transition: { duration: 0.6 } }}
        whileTap={{ scale: 0.86 }}
      >
        <motion.div
          className="size-full"
          animate={{ y: [0, -10, 0] }}
          transition={{ ...FLOAT, duration: FLOAT_SECONDS }}
        >
          <StickerMark className="size-full" />
        </motion.div>
      </motion.button>
      {bursts.map((burst) => (
        <Burst key={burst.id} particles={burst.particles} onDone={() => remove(burst.id)} />
      ))}
    </div>
  );
}
