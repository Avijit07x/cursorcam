'use client';

import { type ReactNode, useRef } from 'react';
import { type ButtonLookProps, bladeClass } from './button-styles';

// The button and a blade behind it share a hinge near the left end, like scissors.
// Hover opens them a little, and a press shuts them. A click or a tap snips twice: the blade shuts, opens and
// shuts again, and the button squishes on each snip. Rotate and scale animate on their
// own CSS properties, so the snip plays over the hover state and returns to it.
const HINGE = 'origin-[22px_50%]';
const SNIP_MS = 420;
const CALM = '(prefers-reduced-motion: reduce)';
const BLADE_SNIP: Keyframe[] = [
  { offset: 0.2, rotate: '-3deg' },
  { offset: 0.4, rotate: '0deg' },
  { offset: 0.6, rotate: '-3deg' },
  { offset: 0.8, rotate: '0deg' },
];
const FACE_SNIP: Keyframe[] = [
  { offset: 0.4, scale: '1.04 0.94' },
  { offset: 0.6, scale: '1' },
  { offset: 0.8, scale: '1.04 0.94' },
];

interface ButtonMotionProps {
  readonly variant?: ButtonLookProps['variant'];
  readonly children: ReactNode;
}

export function ButtonMotion({ variant, children }: ButtonMotionProps) {
  const blade = useRef<HTMLSpanElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const snip = () => {
    if (matchMedia(CALM).matches) return;
    blade.current?.animate(BLADE_SNIP, SNIP_MS);
    face.current?.animate(FACE_SNIP, SNIP_MS);
  };
  return (
    // The click comes from the button or link inside, so keyboard presses snip too.
    <span
      className="group relative inline-flex transition-[scale] duration-150 active:scale-95"
      onClick={snip}
    >
      <span
        ref={blade}
        aria-hidden="true"
        className={`sticker-shadow absolute inset-0 rounded-full ${HINGE} transition-[rotate,translate] duration-400 ease-pop group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:-rotate-3 group-active:translate-0 group-active:rotate-0 ${bladeClass(variant)}`}
      />
      <span
        ref={face}
        className={`relative inline-flex ${HINGE} transition-[rotate] duration-400 ease-pop group-hover:rotate-[1.2deg] group-active:rotate-0`}
      >
        {children}
      </span>
    </span>
  );
}
