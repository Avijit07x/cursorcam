'use client';

import { motion, useAnimate, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { Point } from '@/components/mock-app/stage';
import { POP } from '@/lib/motion';
import type { Sticker } from './sticker-data';
import { lookOf, STICKER_BASE, STICKER_EDGE, StickerFace } from './sticker-looks';
import type { Flight } from './stuck-sticker';

export type DragZone = 'idle' | 'near' | 'over';

const HOVER_SCALE = 1.08;
const LIFT_SCALE = 1.14;
const LEAN_PER_PX = 0.06;
const MAX_LEAN = 18;
const RETURN_FROM = { scale: 0.6, opacity: 0.4 };
const PEELED =
  'cursor-pointer border-[2.5px] border-dashed border-brand-soft bg-transparent text-transparent *:opacity-0';
const LIFTED =
  'z-30 cursor-grabbing [filter:drop-shadow(0_1.5px_0_rgb(30_27_75/0.06))_drop-shadow(0_22px_26px_rgb(30_27_75/0.26))]';

export const stickerButtonId = (sticker: Sticker) => `sticker-${sticker.key}`;

const clampLean = (lean: number) => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, lean));

function surface(sticker: Sticker, peeled: boolean, lifted: boolean) {
  if (peeled) return PEELED;
  const lift = lifted ? LIFTED : 'sticker-shadow cursor-grab';
  return `${STICKER_EDGE} ${lookOf(sticker).color} ${lift}`;
}

function centerOf(element: Element): Point {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

interface SheetStickerProps {
  readonly sticker: Sticker;
  readonly peeled: boolean;
  readonly isOverWindow: (point: Point) => boolean;
  readonly onDragZone: (zone: DragZone) => void;
  readonly onStick: (sticker: Sticker, from: Flight, tapped: boolean) => void;
}

export function SheetSticker({
  sticker,
  peeled,
  isOverWindow,
  onDragZone,
  onStick,
}: SheetStickerProps) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useTransform(x, (dx) => sticker.tilt + clampLean(dx * LEAN_PER_PX));
  const [lifted, setLifted] = useState(false);
  const dragged = useRef(false);
  const wasPeeled = useRef(peeled);

  useEffect(() => {
    if (wasPeeled.current && !peeled && scope.current) {
      animate(
        scope.current,
        { scale: [RETURN_FROM.scale, 1], opacity: [RETURN_FROM.opacity, 1] },
        POP,
      );
    }
    wasPeeled.current = peeled;
  }, [peeled, animate, scope]);

  const zoneAt = (point: Point) => (isOverWindow(point) ? 'over' : 'near');

  const startDrag = () => {
    dragged.current = true;
    setLifted(true);
    onDragZone('near');
  };

  const endDrag = (_: unknown, info: PanInfo) => {
    setLifted(false);
    onDragZone('idle');
    if (!scope.current || !isOverWindow(info.point)) {
      animate(x, 0, POP);
      animate(y, 0, POP);
      return;
    }
    const from = { ...centerOf(scope.current), rotate: rotate.get(), scale: LIFT_SCALE };
    x.jump(0);
    y.jump(0);
    scale.jump(1);
    onStick(sticker, from, false);
  };

  const tap = (event: MouseEvent<HTMLButtonElement>) => {
    const fromDrag = dragged.current && event.detail > 0;
    dragged.current = false;
    if (fromDrag) return;
    onStick(sticker, { ...centerOf(event.currentTarget), rotate: sticker.tilt, scale: 1 }, true);
  };

  return (
    <motion.button
      ref={scope}
      id={stickerButtonId(sticker)}
      type="button"
      aria-label={
        peeled
          ? `${sticker.name} is on the app. Press to play it again`
          : `Stick ${sticker.name} on the app`
      }
      className={`${STICKER_BASE} ${lookOf(sticker).shape} ${surface(sticker, peeled, lifted)} focus-ring inline-flex touch-none`}
      style={{ x, y, rotate, scale }}
      drag={!peeled}
      dragMomentum={false}
      whileHover={{ scale: HOVER_SCALE }}
      whileDrag={{ scale: LIFT_SCALE, transition: { duration: 0 } }}
      transition={POP}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onDragStart={startDrag}
      onDrag={(_, info) => onDragZone(zoneAt(info.point))}
      onDragEnd={endDrag}
      onClick={tap}
    >
      <StickerFace sticker={sticker} />
    </motion.button>
  );
}
