'use client';

import { useCallback, useRef, useState } from 'react';
import type { Point } from '@/components/mock-app/stage';
import { usePointValues } from '@/components/mock-app/use-point-values';
import { useScrollIntoView } from '@/hooks/use-scroll-into-view';
import { SECTION_BODY } from '@/lib/layout';
import { AppWindow, type Run, type Stuck } from './app-window';
import { HOME, type ActKey } from './app/acts';
import { stickerButtonId, type DragZone } from './sheet-sticker';
import { DEFAULT_LINE, stickerLine, stickerTag, type Sticker } from './sticker-data';
import { StickerSheet } from './sticker-sheet';
import type { Flight } from './stuck-sticker';
import { WindowFoot } from './window-foot';

const DROP_MARGIN = 28;
const VISIBLE_SHARE = 0.6;

export function StickerBoard() {
  const cursor = usePointValues(HOME);
  const frameRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<DragZone>('idle');
  const stuckCount = useRef(0);
  const [run, setRun] = useState<Run>({ id: 0, act: null });
  const [stuck, setStuck] = useState<Stuck | null>(null);
  const [zone, setZone] = useState<DragZone>('idle');
  const scrollIntoView = useScrollIntoView();

  const play = useCallback((act: ActKey) => {
    setRun((current) => ({ id: current.id + 1, act }));
  }, []);

  const changeZone = useCallback((next: DragZone) => {
    if (zoneRef.current === next) return;
    zoneRef.current = next;
    setZone(next);
  }, []);

  const isOverWindow = useCallback((point: Point) => {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return false;
    const x = point.x - window.scrollX;
    const y = point.y - window.scrollY;
    return (
      x > box.left - DROP_MARGIN &&
      x < box.right + DROP_MARGIN &&
      y > box.top - DROP_MARGIN &&
      y < box.bottom + DROP_MARGIN
    );
  }, []);

  const bringIntoView = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    const shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
    if (shown < box.height * VISIBLE_SHARE) scrollIntoView(frame, 'center');
  }, [scrollIntoView]);

  const stick = useCallback(
    (sticker: Sticker, from: Flight, tapped: boolean) => {
      if (stuck?.sticker.key !== sticker.key) {
        stuckCount.current += 1;
        setStuck({ id: stuckCount.current, sticker, from });
      }
      play(sticker.key);
      if (tapped) bringIntoView();
    },
    [stuck, play, bringIntoView],
  );

  const peelOff = useCallback(() => {
    const peeled = stuck?.sticker;
    setStuck(null);
    play('home');
    if (peeled) document.getElementById(stickerButtonId(peeled))?.focus({ preventScroll: true });
  }, [stuck, play]);

  const replay = useCallback((sticker: Sticker) => play(sticker.key), [play]);

  return (
    <div
      className={`${SECTION_BODY} flex flex-col items-center gap-11 min-[940px]:flex-row min-[940px]:justify-center min-[940px]:gap-14`}
    >
      <StickerSheet
        stuckKey={stuck?.sticker.key}
        dragging={zone !== 'idle'}
        isOverWindow={isOverWindow}
        onDragZone={changeZone}
        onStick={stick}
      />
      <div className="relative z-10 order-1 w-full max-w-155 min-[940px]:order-none min-[940px]:min-w-0 min-[940px]:flex-1">
        <AppWindow
          run={run}
          cursor={cursor}
          zone={zone}
          stuck={stuck}
          tag={stickerTag(stuck?.sticker)}
          frameRef={frameRef}
          onPlay={replay}
        />
        <WindowFoot
          line={stuck ? stickerLine(stuck.sticker) : DEFAULT_LINE}
          canPeel={stuck !== null}
          onPeel={peelOff}
        />
      </div>
    </div>
  );
}
