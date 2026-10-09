'use client';

import { motion } from 'motion/react';
import { useId } from 'react';

const CORNERS = [
  'M10 23v-5a8 8 0 0 1 8-8h5',
  'M41 10h5a8 8 0 0 1 8 8v5',
  'M54 41v5a8 8 0 0 1-8 8h-5',
  'M23 54h-5a8 8 0 0 1-8-8v-5',
];
const CURSOR = 'M24 21v21l5.9-5 3.8 8.3 3.2-1.5-3.8-8.2h7.8Z';
const TIP = { x: 24, y: 21 };
const DOT = { x: 44.5, y: 21.5 };
const INK = '#1E1B4B';
const BLUE = '#4F46E5';
const RED = '#EF4444';
const WHITE = '#FFFFFF';
const TAP_SECONDS = 2.8;
const PULSE_SECONDS = 1.4;

interface CornersProps {
  readonly stroke: string;
  readonly width: number;
}

function Corners({ stroke, width }: CornersProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {CORNERS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

interface StickerMarkProps {
  readonly className?: string;
}

export function StickerMark({ className }: StickerMarkProps) {
  const shadowId = `sticker-shadow-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <filter
          id={shadowId}
          x="-20%"
          y="-20%"
          width="140%"
          height="145%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor={INK} floodOpacity="0.24" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`}>
        <g transform="translate(32 32) rotate(-7) scale(0.88) translate(-32 -32)">
          <Corners stroke={WHITE} width={12} />
          <path d={CURSOR} fill={WHITE} stroke={WHITE} strokeWidth={10.5} strokeLinejoin="round" />
          <circle cx={DOT.x} cy={DOT.y} r={7.5} fill={WHITE} />
          <Corners stroke={INK} width={5.4} />
          <motion.circle
            cx={TIP.x}
            cy={TIP.y}
            r={7}
            fill="none"
            stroke={BLUE}
            strokeWidth={2}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 0.2, 2.1], opacity: [0, 0.7, 0] }}
            transition={{
              duration: TAP_SECONDS,
              times: [0, 0.62, 0.95],
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.path
            d={CURSOR}
            fill={BLUE}
            stroke={BLUE}
            strokeWidth={4.2}
            strokeLinejoin="round"
            style={{ transformBox: 'fill-box', originX: 0, originY: 0 }}
            animate={{ scale: [1, 1, 0.84, 1.05, 1] }}
            transition={{
              duration: TAP_SECONDS,
              times: [0, 0.55, 0.62, 0.72, 0.8],
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.circle
            cx={DOT.x}
            cy={DOT.y}
            r={4}
            fill={RED}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
            animate={{ scale: [1, 0.72, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: PULSE_SECONDS, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
      </g>
    </svg>
  );
}
