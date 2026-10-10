'use client';

import { animate, useMotionValue } from 'motion/react';
import { useEffect } from 'react';
import { DETENT } from '@/lib/motion';
import { clamp, polar } from './geometry';
import { KnobFace } from './knob-face';
import { ZOOM, zoomScale, zoomText } from './settings';
import { KNOB, PRINT } from './styles';
import { stepByKey, useTurn } from './use-turn';

const SWEEP = 135;
const RANGE = ZOOM.max - ZOOM.min;
const CENTER = 56;
const ARC_RADIUS = 37;
const MARK_RADIUS = 50;
const KNOB_SIZE = 56;
const PAGE_STEP = 3;
const ARC_DOTS = `${'0 22.5 '.repeat(12)}0 90`;

const zoomAngle = (zoom: number) => -SWEEP + ((zoom - ZOOM.min) / RANGE) * 2 * SWEEP;
const zoomFromAngle = (angle: number) =>
  Math.round(ZOOM.min + ((angle + SWEEP) / (2 * SWEEP)) * RANGE);
const nextMark = (zoom: number) => ZOOM.marks.find((mark) => mark > zoom) ?? ZOOM.min;

interface ZoomKnobProps {
  readonly zoom: number;
  readonly onChange: (zoom: number) => void;
}

export function ZoomKnob({ zoom, onChange }: ZoomKnobProps) {
  const rotate = useMotionValue(zoomAngle(zoom));
  const change = (value: number) => onChange(clamp(value, ZOOM.min, ZOOM.max));
  const { handlers, isTurning } = useTurn({
    rotate,
    sweep: SWEEP,
    onTurn: (angle) => change(zoomFromAngle(angle)),
    onTap: () => change(nextMark(zoom)),
    onRelease: () => {
      animate(rotate, zoomAngle(zoomFromAngle(rotate.get())), DETENT);
    },
  });

  useEffect(() => {
    if (!isTurning()) animate(rotate, zoomAngle(zoom), DETENT);
  }, [zoom, rotate, isTurning]);

  return (
    <div className="grid min-w-0 justify-items-center gap-1.5 [grid-area:zoom]">
      <div className="relative h-26 w-28">
        <svg viewBox="0 0 112 104" aria-hidden="true" className="absolute inset-0 size-full">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={ARC_RADIUS}
            pathLength={360}
            fill="none"
            stroke="#C7D2FE"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={ARC_DOTS}
            transform={`rotate(${SWEEP} ${CENTER} ${CENTER})`}
          />
          {ZOOM.marks.map((mark) => {
            const dot = polar(zoomAngle(mark), ARC_RADIUS);
            return (
              <circle key={mark} cx={CENTER + dot.x} cy={CENTER + dot.y} r={3.5} fill="#fff" />
            );
          })}
        </svg>
        {ZOOM.marks.map((mark) => {
          const spot = polar(zoomAngle(mark), MARK_RADIUS);
          return (
            <button
              key={mark}
              type="button"
              tabIndex={-1}
              onClick={() => change(mark)}
              className="absolute -translate-1/2 cursor-pointer rounded-full px-1 py-0.5 text-[11px] leading-tight font-semibold whitespace-nowrap text-white transition-colors hover:bg-brand"
              style={{ top: CENTER + spot.y, left: `calc(50% + ${spot.x}px)` }}
            >
              {zoomScale(mark)}×
            </button>
          );
        })}
        <div
          role="slider"
          tabIndex={0}
          aria-labelledby="zoom-label"
          aria-valuemin={zoomScale(ZOOM.min)}
          aria-valuemax={zoomScale(ZOOM.max)}
          aria-valuenow={zoomScale(zoom)}
          aria-valuetext={`Up to ${zoomText(zoom)} closer`}
          className={`${KNOB} size-14`}
          style={{ top: CENTER }}
          {...handlers}
          onKeyDown={(event) =>
            stepByKey(
              event,
              {
                ArrowRight: zoom + 1,
                ArrowUp: zoom + 1,
                ArrowLeft: zoom - 1,
                ArrowDown: zoom - 1,
                PageUp: zoom + PAGE_STEP,
                PageDown: zoom - PAGE_STEP,
                Home: ZOOM.min,
                End: ZOOM.max,
              },
              change,
            )
          }
        >
          <KnobFace
            rotate={rotate}
            size={KNOB_SIZE}
            radius={24}
            dots={18}
            stroke={4.5}
            pointer="w-1.5"
          />
        </div>
      </div>
      <span id="zoom-label" className={PRINT}>
        Zoom
      </span>
      <span className="font-semibold text-white tabular-nums">Up to {zoomText(zoom)}</span>
    </div>
  );
}
