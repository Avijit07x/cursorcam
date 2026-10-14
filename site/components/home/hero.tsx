'use client';

import { motion } from 'motion/react';
import { BuddyCursorArt, PlayArt } from '@/components/brand/sticker-art';
import { ScrollButton } from '@/components/ui/scroll-button';
import { StickerTag } from '@/components/ui/sticker-tag';
import { CONTAINER } from '@/lib/layout';
import { BOUNCE, FADE_UP, POP, SOFT } from '@/lib/motion';
import { SECTION_IDS } from '@/lib/sections';
import { SITE } from '@/lib/site';

const WORDS = SITE.tagline.split(' ');
const BRAND_FROM = WORDS.length - 2;
const TAG_DELAY = 0.2;
const WORD_DELAY = 0.25;
const WORD_STAGGER = 0.07;
const SIDE_DELAY = 0.75;
const DROP = -40;
const TILT = 12;
const BUDDY_DELAY = 1.1;

function TitleBuddy() {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute top-[calc(100%-0.2em)] left-[calc(100%-0.1em)] size-[0.56em]"
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...POP, delay: BUDDY_DELAY }}
    >
      <span className="absolute top-[15%] left-1/4 size-[0.3em] -translate-1/2 rounded-full border-[0.05em] border-rose opacity-0 motion-safe:animate-tap-ring" />
      <span className="sticker-shadow block size-full origin-top-left motion-safe:animate-tap">
        <BuddyCursorArt />
      </span>
    </motion.span>
  );
}

export function Hero({ version }: { readonly version: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className={`${CONTAINER} grid items-start gap-x-14 gap-y-6 lg:items-end pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:pt-20`}
    >
      <div>
        <motion.p
          {...FADE_UP}
          transition={{ ...SOFT, delay: TAG_DELAY }}
          className="mb-4.5 flex items-center gap-3.5 font-semibold text-brand"
        >
          <a
            href={SITE.changelog}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Version ${version}, see the changelog`}
            className="rounded-[14px] focus-ring"
          >
            <StickerTag>v{version}</StickerTag>
          </a>
          Free and open source
        </motion.p>
        <h1
          id="hero-title"
          className="sticker-text text-[clamp(2.6rem,1rem+4.2vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.015em] text-balance text-ink"
        >
          {WORDS.map((word, index) => (
            <span key={word}>
              <motion.span
                className={
                  index >= BRAND_FROM ? 'relative inline-block text-brand' : 'inline-block'
                }
                initial={{ y: DROP, opacity: 0, rotate: index % 2 === 0 ? -TILT : TILT }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ ...BOUNCE, delay: WORD_DELAY + index * WORD_STAGGER }}
              >
                {word}
                {index === WORDS.length - 1 ? <TitleBuddy /> : null}
              </motion.span>{' '}
            </span>
          ))}
        </h1>
      </div>
      <motion.div {...FADE_UP} transition={{ ...SOFT, delay: SIDE_DELAY }}>
        <p className="mb-6 max-w-[32em] text-[clamp(1.0625rem,1rem+0.35vw,1.25rem)] text-body">
          {SITE.lede}
        </p>
        <div className="flex flex-wrap gap-3">
          <ScrollButton to={SECTION_IDS.setup}>Get started</ScrollButton>
          <ScrollButton to={SECTION_IDS.video} variant="soft">
            <span className="size-5.5">
              <PlayArt />
            </span>
            Watch the demo
          </ScrollButton>
        </div>
      </motion.div>
    </section>
  );
}
