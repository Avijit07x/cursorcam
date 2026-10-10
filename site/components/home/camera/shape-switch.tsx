'use client';

import { motion } from 'motion/react';
import { POP } from '@/lib/motion';
import { SHAPE_KEYS, SHAPES, type ShapeKey } from './settings';
import { PRINT } from './styles';

interface ShapeSwitchProps {
  readonly shape: ShapeKey;
  readonly onChange: (shape: ShapeKey) => void;
}

export function ShapeSwitch({ shape, onChange }: ShapeSwitchProps) {
  const index = SHAPE_KEYS.indexOf(shape);
  return (
    <div className="grid w-full min-w-0 justify-items-center gap-1.5 [grid-area:shape]">
      <div
        role="radiogroup"
        aria-labelledby="shape-label"
        className="relative grid h-11.5 w-full max-w-43 grid-cols-3 rounded-2xl bg-shade p-1"
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-xl bg-white shadow-[0_3px_0_var(--color-shade)]"
          initial={false}
          animate={{ x: `${index * 100}%` }}
          transition={POP}
        />
        {SHAPE_KEYS.map((key) => (
          <label
            key={key}
            className="relative grid cursor-pointer place-items-center rounded-xl has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-soft"
          >
            <input
              type="radio"
              name="camera-shape"
              value={key}
              checked={key === shape}
              onChange={() => onChange(key)}
              className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
            />
            <span
              aria-hidden="true"
              className={`rounded-[3px] border-[2.5px] border-white transition-colors peer-checked:border-ink ${SHAPES[key].icon}`}
            />
            <span className="sr-only">{SHAPES[key].name}</span>
          </label>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="grid w-full max-w-43 grid-cols-3 text-center text-[11px] font-semibold text-white"
      >
        {SHAPE_KEYS.map((key) => (
          <span key={key}>{SHAPES[key].label}</span>
        ))}
      </div>
      <span id="shape-label" className={PRINT}>
        Shape
      </span>
      <p className="min-h-[2.7em] max-w-43 text-center text-xs leading-snug text-white">
        {SHAPES[shape].note}
      </p>
    </div>
  );
}
