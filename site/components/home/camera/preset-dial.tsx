'use client';

import { animate, useMotionValue } from 'motion/react';
import { Fragment, useEffect } from 'react';
import { DETENT } from '@/lib/motion';
import { clamp, polar } from './geometry';
import { KnobFace } from './knob-face';
import { LAST_PRESET, PRESETS, presetAt } from './settings';
import { KNOB, PRINT } from './styles';
import { stepByKey, useTurn } from './use-turn';

const SWEEP = 90;
const NOTCH_STEP = (2 * SWEEP) / LAST_PRESET;
const CENTER_Y = 84;
const TICK_RADIUS = 49;
const LABEL_RADIUS = 58;
const DIAL_SIZE = 84;

const notchAngle = (index: number) => -SWEEP + index * NOTCH_STEP;
const notchAt = (angle: number) => Math.round((angle + SWEEP) / NOTCH_STEP);

interface PresetDialProps {
  readonly preset: number;
  readonly onChange: (preset: number) => void;
}

export function PresetDial({ preset, onChange }: PresetDialProps) {
  const rotate = useMotionValue(notchAngle(preset));
  const next = (preset + 1) % PRESETS.length;
  const { handlers, isTurning } = useTurn({
    rotate,
    sweep: SWEEP,
    onTurn(angle) {
      const nearest = notchAt(angle);
      if (nearest !== preset) onChange(nearest);
    },
    onTap: () => onChange(next),
    onRelease: () => {
      animate(rotate, notchAngle(notchAt(rotate.get())), DETENT);
    },
  });

  useEffect(() => {
    if (!isTurning()) animate(rotate, notchAngle(preset), DETENT);
  }, [preset, rotate, isTurning]);

  const current = presetAt(preset);

  return (
    <div className="grid min-w-0 justify-items-center gap-1.5 [grid-area:dial]">
      <div className="relative h-33 w-58">
        {PRESETS.map((item, index) => {
          const angle = notchAngle(index);
          const tick = polar(angle, TICK_RADIUS);
          const label = polar(angle, LABEL_RADIUS);
          return (
            <Fragment key={item.name}>
              <span
                aria-hidden="true"
                className="absolute -mt-[4.5px] -ml-0.5 h-[9px] w-1 rounded-sm bg-brand-soft"
                style={{
                  top: CENTER_Y + tick.y,
                  left: `calc(50% + ${tick.x}px)`,
                  rotate: `${angle}deg`,
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-pressed={index === preset}
                onClick={() => onChange(index)}
                className="absolute cursor-pointer rounded-full px-1.5 py-0.75 text-xs leading-tight font-semibold whitespace-nowrap text-white transition-colors hover:bg-brand aria-pressed:bg-white aria-pressed:text-ink"
                style={{
                  top: CENTER_Y + label.y,
                  left: `calc(50% + ${label.x}px)`,
                  translate: `calc(-50% + ${50 * label.sin}%) calc(-50% - ${50 * label.cos}%)`,
                }}
              >
                {item.name}
              </button>
            </Fragment>
          );
        })}
        <div
          role="slider"
          tabIndex={0}
          aria-labelledby="dial-label"
          aria-valuemin={0}
          aria-valuemax={LAST_PRESET}
          aria-valuenow={preset}
          aria-valuetext={`${current.name}: ${current.size}, ${current.fps} fps, ${current.limit.toLowerCase()}`}
          className={`${KNOB} size-21`}
          style={{ top: CENTER_Y }}
          {...handlers}
          onKeyDown={(event) =>
            stepByKey(
              event,
              {
                ArrowRight: preset + 1,
                ArrowUp: preset + 1,
                ArrowLeft: preset - 1,
                ArrowDown: preset - 1,
                Home: 0,
                End: LAST_PRESET,
                Enter: next,
                ' ': next,
              },
              (value) => onChange(clamp(value, 0, LAST_PRESET)),
            )
          }
        >
          <KnobFace
            rotate={rotate}
            size={DIAL_SIZE}
            radius={37}
            dots={24}
            stroke={6}
            pointer="w-2"
            cap
          />
        </div>
      </div>
      <span id="dial-label" className={PRINT}>
        Made for
      </span>
    </div>
  );
}
