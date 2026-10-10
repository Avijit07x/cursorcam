'use client';

import { motion } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import { BuddyCursorArt, PulseDot } from '@/components/brand/sticker-art';
import { LOGO_CORNERS } from '@/components/brand/sticker-mark';
import { POP } from '@/lib/motion';
import { ClickHint } from './click-hint';
import { HOUSING, PRESS_SHADOW } from './styles';

interface CameraTopProps {
  readonly lensRef: Ref<SVGGElement>;
  readonly shutterRef: Ref<HTMLButtonElement>;
  readonly onShutter: () => void;
  readonly burst: ReactNode;
  readonly hint: boolean;
}

function Lens({ glassRef }: { readonly glassRef: Ref<SVGGElement> }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="w-[clamp(46px,6vw,72px)]">
      <circle cx="40" cy="40" r="38" fill="#fff" />
      <circle cx="40" cy="40" r="33" fill="#C7D2FE" />
      <circle cx="40" cy="40" r="26" fill="#1E1B4B" />
      <g ref={glassRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <g
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(40 40) scale(0.6) translate(-32 -32)"
        >
          {LOGO_CORNERS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <ellipse
        cx="29"
        cy="28"
        rx="5"
        ry="3"
        fill="#fff"
        opacity="0.5"
        transform="rotate(-40 29 28)"
      />
    </svg>
  );
}

export function CameraTop({ lensRef, shutterRef, onShutter, burst, hint }: CameraTopProps) {
  return (
    <div className="relative z-10 -mb-1.5 flex items-end justify-between gap-3 px-[clamp(12px,4vw,48px)]">
      <div
        className={`${HOUSING} flex items-center gap-2.5 rounded-t-[30px] border-b-0 py-1.5 pr-3 pl-1.5 sm:py-2 sm:pr-3.5 sm:pl-2`}
      >
        <Lens glassRef={lensRef} />
        <span
          aria-hidden="true"
          className="grid justify-items-center gap-1.5 text-[11px] leading-none font-semibold tracking-[0.12em] text-brand-soft"
        >
          <PulseDot className="size-4 ring-3 ring-white" />
          REC
        </span>
      </div>
      <span
        aria-hidden="true"
        className="ml-auto hidden h-4.5 w-11.5 rounded-t-[14px] border-5 border-b-0 border-white bg-rose sm:block"
      />
      <div
        className={`${HOUSING} relative rounded-t-[30px] border-b-0 px-2 pt-2 pb-3 sm:px-3 sm:pt-2.5 sm:pb-3.5`}
      >
        <motion.button
          ref={shutterRef}
          type="button"
          onClick={onShutter}
          whileHover={{ y: -2 }}
          transition={POP}
          className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white pr-3.5 pl-2.5 text-[15px] font-semibold whitespace-nowrap text-ink focus-ring sm:h-13 sm:pr-5.5 sm:pl-3.5 sm:text-[17px] ${PRESS_SHADOW}`}
        >
          <span className="size-5 sm:size-6">
            <BuddyCursorArt />
          </span>
          Ask Claude
        </motion.button>
        <ClickHint visible={hint} />
        {burst}
      </div>
    </div>
  );
}
