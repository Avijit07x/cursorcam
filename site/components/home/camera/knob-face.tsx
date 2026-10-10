'use client';

import { type MotionValue, motion } from 'motion/react';

interface KnobFaceProps {
  readonly rotate: MotionValue<number>;
  readonly size: number;
  readonly radius: number;
  readonly dots: number;
  readonly stroke: number;
  readonly pointer: string;
  readonly cap?: boolean;
}

export function KnobFace({
  rotate,
  size,
  radius,
  dots,
  stroke,
  pointer,
  cap = false,
}: KnobFaceProps) {
  const center = size / 2;
  return (
    <motion.div aria-hidden="true" className="absolute inset-0 rounded-full" style={{ rotate }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full">
        <circle
          cx={center}
          cy={center}
          r={radius}
          pathLength={dots}
          fill="none"
          stroke="#C7D2FE"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray="0 1"
        />
      </svg>
      <span
        className={`absolute top-[12%] left-1/2 h-[34%] -translate-x-1/2 rounded-full bg-ink ${pointer}`}
      />
      {cap ? (
        <span className="absolute inset-[32%] rounded-full bg-brand-tint ring-3 ring-brand-soft ring-inset" />
      ) : null}
    </motion.div>
  );
}
