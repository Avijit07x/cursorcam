'use client';

import { motion } from 'motion/react';
import { Backdrop } from '@/components/ui/backdrop';
import { SiteFooter } from '@/components/ui/site-footer';
import { FADE_UP, SOFT } from '@/lib/motion';
import { BouncyWordmark } from './bouncy-wordmark';
import { FloatingStickers } from './floating-stickers';
import { HeroSticker } from './hero-sticker';
import { MINI_DEMO_MAX_HEIGHT, MiniDemo } from './mini-demo';
import { SparkleBadge } from './sparkle-badge';

const BADGE_DELAY = 0.95;
const TAGLINE_DELAY = 1.05;

export function ComingSoon() {
  return (
    <div className="relative isolate flex h-dvh min-h-80 flex-col overflow-x-clip">
      <Backdrop />
      <FloatingStickers />
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pt-8 text-center sm:pt-10">
        <HeroSticker />
        <div className="mt-2">
          <BouncyWordmark />
        </div>
        <div className="mt-4">
          <SparkleBadge delay={BADGE_DELAY} />
        </div>
        <motion.h2
          {...FADE_UP}
          transition={{ ...SOFT, delay: TAGLINE_DELAY }}
          className="mt-4 text-[clamp(1.25rem,2.4vw,1.625rem)] leading-snug font-semibold tracking-tight text-ink"
        >
          Ask Claude for a demo video.
        </motion.h2>
        <div
          className="@container-size mt-6 mb-4 flex min-h-0 w-full flex-1 items-center justify-center short:hidden"
          style={{ maxHeight: MINI_DEMO_MAX_HEIGHT }}
        >
          <MiniDemo />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
