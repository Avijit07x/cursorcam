import type { MotionValue } from 'motion/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useCallback, useRef } from 'react';
import { clamp, pointerAround } from './geometry';

const DRAG_THRESHOLD = 6;
const CENTER_DEAD_ZONE = 10;
const HALF_TURN = 180;
const FULL_TURN = 360;

interface TurnOptions {
  readonly rotate: MotionValue<number>;
  readonly sweep: number;
  readonly onTurn: (angle: number) => void;
  readonly onTap: () => void;
  readonly onRelease: () => void;
}

interface Drag {
  readonly x: number;
  readonly y: number;
  readonly start: number;
  pointer: number;
  turned: number;
  moved: boolean;
}

const shortestTurn = (delta: number) =>
  ((((delta + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN;

export function stepByKey(
  event: KeyboardEvent,
  moves: Readonly<Record<string, number>>,
  apply: (value: number) => void,
) {
  const value = moves[event.key];
  if (value === undefined) return;
  event.preventDefault();
  apply(value);
}

export function useTurn({ rotate, sweep, onTurn, onTap, onRelease }: TurnOptions) {
  const drag = useRef<Drag | null>(null);

  const isTurning = useCallback(() => drag.current?.moved === true, []);

  const finish = (tapped: boolean) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (state.moved) onRelease();
    else if (tapped) onTap();
  };

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      rotate.stop();
      const { angle } = pointerAround(event.currentTarget, event.clientX, event.clientY);
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        start: rotate.get(),
        pointer: angle,
        turned: 0,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const state = drag.current;
      if (!state) return;
      const distance = Math.hypot(event.clientX - state.x, event.clientY - state.y);
      if (!state.moved && distance < DRAG_THRESHOLD) return;
      state.moved = true;
      const pointer = pointerAround(event.currentTarget, event.clientX, event.clientY);
      const delta = shortestTurn(pointer.angle - state.pointer);
      state.pointer = pointer.angle;
      if (pointer.distance < CENTER_DEAD_ZONE) return;
      const angle = clamp(state.start + state.turned + delta, -sweep, sweep);
      state.turned = angle - state.start;
      rotate.set(angle);
      onTurn(angle);
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
  };

  return { handlers, isTurning };
}
