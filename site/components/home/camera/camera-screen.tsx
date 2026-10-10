'use client';

import { motion } from 'motion/react';
import { type Ref, useRef } from 'react';
import { PauseIcon, PlayIcon } from '@/components/ui/icons';
import { RecDot } from '@/components/ui/rec-dot';
import { ViewfinderCorners } from '@/components/ui/viewfinder-corners';
import { useAutoplay } from '@/hooks/use-autoplay';
import { SOFT } from '@/lib/motion';
import { Reel } from './reel/reel';
import { ScreenToast } from './screen-overlays';
import { type CameraSettings, SHAPES, presetAt, screenNote, zoomText } from './settings';
import { PRESS_SHADOW, PRINT } from './styles';
import { useReelClock } from './use-reel-clock';

const GRILL_BARS = 4;
const REEL_LABEL =
  'A mock demo video. The cursor opens New issue, types a title and creates the issue, and the camera zooms in on each step.';

interface CameraScreenProps {
  readonly settings: CameraSettings;
  readonly previewing: boolean;
  readonly flashRef: Ref<HTMLDivElement>;
}

export function CameraScreen({ settings, previewing, flashRef }: CameraScreenProps) {
  const preset = presetAt(settings.preset);
  const screenRef = useRef<HTMLDivElement>(null);
  const { active: playing, toggle } = useAutoplay(screenRef);
  const { timeRef, restart } = useReelClock(playing, preset.fps);
  const layout = settings.shape === 'tall' ? 'phone' : 'desktop';

  return (
    <div className="grid min-w-0 content-center gap-3.5">
      <div className="rounded-[clamp(22px,3vw,34px)] bg-ink px-[clamp(7px,1vw,12px)] pt-[clamp(7px,1vw,12px)]">
        <div className="relative grid aspect-video place-items-center">
          <motion.div
            ref={screenRef}
            className="relative h-full overflow-hidden rounded-[clamp(14px,2vw,24px)] bg-brand-strong"
            initial={false}
            animate={{ width: SHAPES[settings.shape].width }}
            transition={SOFT}
          >
            <div role="img" aria-label={REEL_LABEL} className="absolute inset-0">
              <Reel
                key={layout}
                layout={layout}
                zoom={settings.zoom}
                previewing={previewing}
                running={playing}
                onLoop={restart}
              />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-2">
              <ViewfinderCorners className="size-[clamp(18px,3vw,30px)] text-white/90" />
            </div>
            <div
              ref={flashRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-white opacity-0"
            />
          </motion.div>
          <ScreenToast
            position="top-[7%]"
            text={previewing ? `Zoom up to ${zoomText(settings.zoom)}` : ''}
          />
          <ScreenToast position="bottom-[7%]" text={screenNote(settings)} />
        </div>
        <div
          aria-hidden="true"
          className="flex min-h-[clamp(30px,3.2vw,40px)] items-center gap-2 overflow-hidden px-1.5 text-[clamp(11px,1vw,13px)] font-semibold tracking-[0.06em] whitespace-nowrap text-brand-soft tabular-nums sm:gap-3"
        >
          <span className="inline-flex items-center gap-1.5 text-rec">
            <RecDot className="size-2" paused={!playing} />
            {playing ? 'REC' : 'PAUSE'}
          </span>
          <span ref={timeRef} className="text-white">
            00:00:00:00
          </span>
          <span className="ml-auto">
            {preset.res} · {preset.fps} fps
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause the mock demo' : 'Play the mock demo'}
          className={`grid size-11.5 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-ink focus-ring ${PRESS_SHADOW}`}
        >
          {playing ? <PauseIcon className="w-5" /> : <PlayIcon className="w-5" />}
        </button>
        <span aria-hidden="true" className={PRINT}>
          Play
        </span>
        <span aria-hidden="true" className={`${PRINT} hidden flex-1 text-center sm:block`}>
          Auto-zoom · smooth cursor · click ripples
        </span>
        <span aria-hidden="true" className="ml-auto flex gap-1.25">
          {Array.from({ length: GRILL_BARS }, (_, index) => (
            <i key={index} className="h-5.5 w-1.25 rounded-[3px] bg-shade" />
          ))}
        </span>
      </div>
    </div>
  );
}
