'use client';

import { motion } from 'motion/react';

const OUTLINE = {
  stroke: '#fff',
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
} as const;
const INK = '#1E1B4B';
const BLUSH = '#FB7185';

export function HeartArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 20.5C5.5 16.2 2.5 12.9 2.5 9.4 2.5 6.6 4.6 4.5 7.3 4.5c1.9 0 3.6 1 4.7 2.6 1.1-1.6 2.8-2.6 4.7-2.6 2.7 0 4.8 2.1 4.8 4.9 0 3.5-3 6.8-9.5 11.1Z"
        fill="#FB7185"
        {...OUTLINE}
      />
      <ellipse
        cx="7.4"
        cy="9"
        rx="1.1"
        ry="1.8"
        fill="#fff"
        opacity="0.55"
        transform="rotate(-30 7.4 9)"
      />
    </svg>
  );
}

export function StarArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 2.6l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 16.9l-5.6 2.9 1.1-6.2L3 9.2l6.2-.9Z"
        fill="#FCD34D"
        {...OUTLINE}
      />
      <ellipse cx="10.3" cy="11.4" rx="0.75" ry="1.05" fill={INK} />
      <ellipse cx="13.7" cy="11.4" rx="0.75" ry="1.05" fill={INK} />
      <ellipse cx="9" cy="13.2" rx="1" ry="0.6" fill={BLUSH} opacity="0.6" />
      <ellipse cx="15" cy="13.2" rx="1" ry="0.6" fill={BLUSH} opacity="0.6" />
      <path
        d="M11.2 13.1q.8.7 1.6 0"
        fill="none"
        stroke={INK}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#4F46E5" {...OUTLINE} />
      <path
        d="M10 8.3v7.4l5.8-3.7Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path
        d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z"
        fill="#A78BFA"
        {...OUTLINE}
      />
    </svg>
  );
}

export function BuddyCursorArt() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path d="M6 3.5v15.2l4.2-3.6 2.7 6 2.3-1.1-2.7-5.9h5.6Z" fill="#4F46E5" {...OUTLINE} />
      <ellipse cx="8.2" cy="10.6" rx="0.8" ry="1.1" fill="#fff" />
      <ellipse cx="10.9" cy="11.8" rx="0.8" ry="1.1" fill="#fff" />
      <ellipse cx="7.6" cy="13.5" rx="0.8" ry="0.5" fill={BLUSH} opacity="0.8" />
    </svg>
  );
}

export function RecArt() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold tracking-wide text-ink ring-2 ring-white">
      <span className="relative flex size-2.5">
        <motion.span
          className="absolute inset-0 rounded-full bg-rec"
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <span className="relative size-2.5 rounded-full bg-rec" />
      </span>
      REC
    </span>
  );
}
