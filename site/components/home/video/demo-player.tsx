'use client';

import { motion } from 'motion/react';
import { PlayArt } from '@/components/brand/sticker-art';
import { PauseIcon, PlayIcon } from '@/components/ui/icons';
import { RecDot } from '@/components/ui/rec-dot';
import { TextLink } from '@/components/ui/text-link';
import { ViewfinderCorners } from '@/components/ui/viewfinder-corners';
import { DEMO_VIDEO } from '@/lib/demo-video';
import { SECTION_BODY } from '@/lib/layout';
import { REVEAL } from '@/lib/motion';
import { useDemoVideo } from './use-demo-video';

export function DemoPlayer() {
  const { videoRef, timeRef, playing, toggle } = useDemoVideo(DEMO_VIDEO.fps);

  return (
    <motion.figure {...REVEAL} className={`${SECTION_BODY} mx-auto max-w-5xl`}>
      <div className="sticker-box overflow-hidden rounded-[clamp(22px,3vw,34px)] border-6 border-white bg-ink">
        <div className="relative">
          <video
            ref={videoRef}
            className="block aspect-video w-full"
            poster={DEMO_VIDEO.poster}
            aria-label={DEMO_VIDEO.label}
            preload="metadata"
            muted
            loop
            playsInline
          >
            {DEMO_VIDEO.sources.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
          </video>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[clamp(8px,1.4vw,16px)]"
          >
            <ViewfinderCorners className="size-[clamp(18px,3vw,30px)] text-white/90" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-[clamp(10px,1.4vw,16px)] py-2.5 text-[clamp(11px,1vw,13px)] font-semibold tracking-[0.06em] whitespace-nowrap text-brand-soft tabular-nums">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause the demo video' : 'Play the demo video'}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-ink focus-ring"
          >
            {playing ? <PauseIcon className="w-4.5" /> : <PlayIcon className="w-4.5" />}
          </button>
          <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-rec">
            <RecDot className="size-2" paused={!playing} />
            {playing ? 'REC' : 'PAUSE'}
          </span>
          <span ref={timeRef} aria-hidden="true" className="text-white">
            00:00:00:00
          </span>
          <span aria-hidden="true" className="ml-auto">
            1080p · {DEMO_VIDEO.fps} fps
          </span>
        </div>
      </div>
      <figcaption className="mt-6 flex items-center justify-center gap-2.5 text-center text-[15px] text-muted">
        <span className="sticker-shadow size-6.5 shrink-0">
          <PlayArt />
        </span>
        <span>
          Made with CursorCam from {DEMO_VIDEO.steps} steps.{' '}
          <TextLink href={DEMO_VIDEO.stepsUrl}>See the steps</TextLink>
        </span>
      </figcaption>
    </motion.figure>
  );
}
