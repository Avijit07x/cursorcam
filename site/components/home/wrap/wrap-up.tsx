'use client';

import { motion } from 'motion/react';
import { BuddyCursorArt } from '@/components/brand/sticker-art';
import { IN_VIEW, POP, REVEAL } from '@/lib/motion';
import { Clapperboard } from './clapperboard';

interface Credit {
  readonly role: string;
  readonly name: string;
  readonly tilt: number;
  readonly lead?: boolean;
  readonly buddy?: boolean;
}

const CREDITS: readonly Credit[] = [
  { role: 'Starring', name: 'Your web app', tilt: -3 },
  { role: 'Directed by', name: 'Claude', tilt: 2, lead: true },
  { role: 'Camera', name: 'CursorCam', tilt: -2 },
  { role: 'Stunt cursor', name: 'Buddy', tilt: 3, buddy: true },
];

const CREDITS_DELAY = 0.5;
const CREDIT_STAGGER = 0.08;
const HIDDEN = { opacity: 0, scale: 0.6 };
const PLAIN = 'bg-white text-ink';
const LEAD = 'bg-brand text-white';

function CreditSticker({ credit, index }: { readonly credit: Credit; readonly index: number }) {
  return (
    <motion.div
      className={`sticker-shadow grid justify-items-center gap-0.5 rounded-2xl px-4 py-2.5 ${credit.lead ? LEAD : PLAIN}`}
      style={{ rotate: credit.tilt }}
      initial={HIDDEN}
      whileInView={{
        opacity: 1,
        scale: 1,
        transition: { ...POP, delay: CREDITS_DELAY + index * CREDIT_STAGGER },
      }}
      viewport={IN_VIEW}
      whileHover={{ y: -3 }}
      transition={POP}
    >
      <dt
        className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${credit.lead ? 'text-brand-soft' : 'text-muted'}`}
      >
        {credit.role}
      </dt>
      <dd className="flex items-center gap-1.5 text-[15px] font-semibold sm:text-base">
        {credit.buddy ? (
          <span aria-hidden="true" className="size-4.5 motion-safe:animate-bob">
            <BuddyCursorArt />
          </span>
        ) : null}
        {credit.name}
      </dd>
    </motion.div>
  );
}

export function WrapUp() {
  return (
    <div className="grid justify-items-center text-center">
      <motion.div {...REVEAL} className="grid justify-items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <Clapperboard />
          <h2 className="sticker-text text-[clamp(1.75rem,1.3rem+1.8vw,2.5rem)] leading-none font-bold tracking-tight text-ink">
            That’s a <span className="text-brand">wrap!</span>
          </h2>
        </div>
        <p className="mt-4 text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] text-body">
          Thanks for watching. Your app is up next.
        </p>
      </motion.div>
      <dl className="mt-8 flex max-w-xl flex-wrap justify-center gap-3 sm:gap-4">
        {CREDITS.map((credit, index) => (
          <CreditSticker key={credit.role} credit={credit} index={index} />
        ))}
      </dl>
    </div>
  );
}
