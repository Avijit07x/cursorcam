'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { Ref } from 'react';
import type { PointValues } from '@/components/mock-app/stage';
import { CSS_EASE } from '@/components/mock-app/timing';
import { WINDOW_FRAME } from '@/components/ui/browser-window';
import { POP } from '@/lib/motion';
import type { ActKey } from './app/acts';
import { AppScene } from './app/app-scene';
import type { DragZone } from './sheet-sticker';
import { StickHint } from './stick-hint';
import type { Sticker, WindowTagInfo } from './sticker-data';
import { StuckSticker, type Flight } from './stuck-sticker';
import { WindowTag } from './window-tag';

export interface Run {
  readonly id: number;
  readonly act: ActKey | null;
}

export interface Stuck {
  readonly id: number;
  readonly sticker: Sticker;
  readonly from: Flight;
}

const REST_TILT = -1;
const FRAME_POSE: Record<DragZone, { scale: number; rotate: number }> = {
  idle: { scale: 1, rotate: REST_TILT },
  near: { scale: 1.015, rotate: REST_TILT },
  over: { scale: 1.04, rotate: 0 },
};
const FRAME_TRANSITION = { ...POP, rotate: { duration: 0.3, ease: CSS_EASE } };

interface AppWindowProps {
  readonly run: Run;
  readonly cursor: PointValues;
  readonly zone: DragZone;
  readonly stuck: Stuck | null;
  readonly tag: WindowTagInfo;
  readonly frameRef: Ref<HTMLDivElement>;
  readonly onPlay: (sticker: Sticker) => void;
}

export function AppWindow({ run, cursor, zone, stuck, tag, frameRef, onPlay }: AppWindowProps) {
  return (
    <figure
      aria-label="A tiny issue tracker app. The stickers act out on it."
      className="m-0 flex flex-col items-center"
    >
      <motion.div
        ref={frameRef}
        className={`${WINDOW_FRAME} relative w-full`}
        initial={false}
        animate={FRAME_POSE[zone]}
        transition={FRAME_TRANSITION}
      >
        <div aria-hidden="true">
          <AppScene key={run.id} act={run.act} cursor={cursor} />
        </div>
        {stuck ? null : <StickHint catching={zone !== 'idle'} />}
        <AnimatePresence>
          {stuck ? (
            <StuckSticker
              key={stuck.id}
              sticker={stuck.sticker}
              from={stuck.from}
              onPlay={() => onPlay(stuck.sticker)}
            />
          ) : null}
        </AnimatePresence>
        <WindowTag tag={tag} />
      </motion.div>
    </figure>
  );
}
