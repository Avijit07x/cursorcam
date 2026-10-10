'use client';

import { AnimatePresence, type Transition, motion, useAnimate } from 'motion/react';
import { useEffect } from 'react';
import { HeartArt } from '@/components/brand/sticker-art';
import { CommandPill } from '@/components/ui/command-pill';
import { useScrollIntoView } from '@/hooks/use-scroll-into-view';
import { SOFT } from '@/lib/motion';
import { type CameraSettings, buildRequest, settingChips } from './settings';

const TRAY: Transition = { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] };
const SCROLL_DELAY_MS = 450;
const TUCKED = { y: '-110%' };
const BUMP = { scale: [1, 1.04, 1] };
const BUMP_TIMING: Transition = { duration: 0.7, ease: 'easeOut' };

interface SnapCardProps {
  readonly open: boolean;
  readonly snaps: number;
  readonly settings: CameraSettings;
  readonly onClose: () => void;
}

export function SnapCard({ open, snaps, settings, onClose }: SnapCardProps) {
  const [card, animate] = useAnimate<HTMLDivElement>();
  const scrollIntoView = useScrollIntoView();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => scrollIntoView(card.current, 'nearest'), SCROLL_DELAY_MS);
    if (snaps > 1 && card.current) animate(card.current, BUMP, BUMP_TIMING);
    return () => clearTimeout(timer);
  }, [open, snaps, card, animate, scrollIntoView]);

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="tray"
          className="relative z-10 -mt-2.5 overflow-hidden px-3"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={TRAY}
        >
          <motion.div
            ref={card}
            role="group"
            aria-labelledby="snap-title"
            className="sticker-box relative mx-auto mb-9 grid max-w-160 origin-top -rotate-[1.5deg] gap-3 rounded-b-[28px] bg-white px-[clamp(16px,3vw,26px)] pt-7.5 pb-5"
            initial={TUCKED}
            animate={{ y: 0 }}
            exit={TUCKED}
            transition={SOFT}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Put the card away"
              className="sticker-shadow absolute top-4.5 right-3.5 grid size-9 cursor-pointer place-items-center rounded-full bg-white text-ink focus-ring hover:bg-brand-tint"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4.5">
                <path
                  d="M7 7l10 10M17 7 7 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <p
              id="snap-title"
              className="flex items-center gap-2 pr-9 text-lg font-semibold text-ink"
            >
              <span className="size-6.5 shrink-0">
                <HeartArt />
              </span>
              Snap! Paste this in Claude Code.
            </p>
            <CommandPill text={buildRequest(settings)} label="Copy the request" />
            <ul aria-label="Camera settings" className="flex flex-wrap gap-2">
              {settingChips(settings).map((chip) => (
                <li
                  key={chip}
                  className="rounded-full bg-brand-tint px-3 py-0.5 text-sm font-semibold text-brand-strong"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
