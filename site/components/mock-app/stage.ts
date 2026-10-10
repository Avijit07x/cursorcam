import { stagger, type MotionValue, type Transition, type useAnimate } from 'motion/react';
import { POP, SOFT } from '@/lib/motion';
import { GLIDE_EASE, STAGE_TIMING } from './timing';

export type Part =
  | 'cursor-art'
  | 'ripple'
  | 'new-button'
  | 'new-row'
  | `row-${number}`
  | 'email'
  | 'address'
  | 'login'
  | 'login-card'
  | 'password'
  | 'password-dot'
  | 'login-go'
  | 'code'
  | 'code-card'
  | 'code-ask'
  | `code-box-${number}`
  | 'code-go'
  | 'wait'
  | 'wait-bar'
  | 'spinner'
  | 'toast'
  | 'zoom-chip'
  | 'ff-chip'
  | 'modal'
  | 'modal-card'
  | 'title'
  | 'create-button';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PointValues {
  readonly x: MotionValue<number>;
  readonly y: MotionValue<number>;
}

export interface ZoomValues {
  readonly scale: MotionValue<number>;
  readonly origin: PointValues;
}

type ScopedAnimate = ReturnType<typeof useAnimate>[1];
type PartTransition = Omit<Transition, 'delay'> & {
  readonly delay?: number | ReturnType<typeof stagger>;
};

interface StageOptions<Flags extends object> {
  readonly animate: ScopedAnimate;
  readonly scene: HTMLElement;
  readonly cursor: PointValues;
  readonly ripple: PointValues;
  readonly zoom: ZoomValues;
  readonly instant: boolean;
  readonly signal: AbortSignal;
  readonly update: (patch: Partial<Flags>) => void;
  readonly toast: (text: string) => void;
}

const MS = 1000;
const GLIDE_ARC = 0.16;
const POP_IN_FROM = 0.85;
const TOAST_DROP = -10;
const ROW_RISE = 8;
const RIPPLE = { from: 0.3, to: 2.4, opacity: 0.85 };
const CURSOR_SQUISH = { low: 0.78, high: 1.08 };
const TARGET_SQUISH = { low: 0.9, high: 1.06 };
const SQUISH_TIMES = [0, 0.3, 0.65, 1];
const DOT_FROM = 0.3;
const INSTANT: Transition = { duration: 0 };
const HALF = 0.5;

export const part = (name: Part) => ({ 'data-part': name });

const select = (name: Part) => `[data-part="${name}"]`;

function framedAxis(at: number, scale: number) {
  if (scale <= 1) return at;
  return Math.min(1, Math.max(0, (at * scale - HALF) / (scale - 1)));
}

export const framedOrigin = (point: Point, scale: number): Point => ({
  x: framedAxis(point.x, scale),
  y: framedAxis(point.y, scale),
});

export function createStage<Flags extends object>({
  animate,
  scene,
  cursor,
  ripple,
  zoom,
  instant,
  signal,
  update,
  toast,
}: StageOptions<Flags>) {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  signal.addEventListener('abort', () => timers.forEach(clearTimeout), { once: true });

  const timed = (ms: number, ease: Transition['ease']): Transition =>
    instant ? INSTANT : { duration: ms / MS, ease };
  const spring = (transition: Transition) => (instant ? INSTANT : transition);

  function wait(ms: number) {
    signal.throwIfAborted();
    if (instant) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);
      timers.add(timer);
    });
  }

  function run(name: Part, keyframes: Parameters<ScopedAnimate>[1], transition: PartTransition) {
    signal.throwIfAborted();
    return animate(select(name), keyframes, transition);
  }

  function pointOn(name: Part, fx = 0.5, fy = 0.5): Point {
    const target = scene.querySelector<HTMLElement>(select(name));
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = target;
    while (node && node !== scene) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    const width = target?.offsetWidth ?? 0;
    const height = target?.offsetHeight ?? 0;
    return {
      x: (x + width * fx) / scene.clientWidth,
      y: (y + height * fy) / scene.clientHeight,
    };
  }

  function glide(to: Point, ms: number, arc = GLIDE_ARC) {
    signal.throwIfAborted();
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    const from = { x: cursor.x.get() * width, y: cursor.y.get() * height };
    const end = { x: to.x * width, y: to.y * height };
    const bend = {
      x: (from.x + end.x) / 2 - (end.y - from.y) * arc,
      y: (from.y + end.y) / 2 + (end.x - from.x) * arc,
    };
    return animate(0, 1, {
      ...timed(ms, GLIDE_EASE),
      onUpdate: (t: number) => {
        const u = 1 - t;
        cursor.x.set((u * u * from.x + 2 * u * t * bend.x + t * t * end.x) / width);
        cursor.y.set((u * u * from.y + 2 * u * t * bend.y + t * t * end.y) / height);
      },
    });
  }

  function squish(name: Part, low: number, high: number, ms: number) {
    return run(
      name,
      { scale: [1, low, high, 1] },
      { ...timed(ms, 'easeInOut'), times: SQUISH_TIMES },
    );
  }

  function click(point: Point, target?: Part) {
    signal.throwIfAborted();
    ripple.x.jump(point.x);
    ripple.y.jump(point.y);
    run(
      'ripple',
      { scale: [RIPPLE.from, RIPPLE.to], opacity: [RIPPLE.opacity, 0] },
      timed(STAGE_TIMING.click.ripple, 'easeOut'),
    );
    squish('cursor-art', CURSOR_SQUISH.low, CURSOR_SQUISH.high, STAGE_TIMING.click.cursor);
    if (target) squish(target, TARGET_SQUISH.low, TARGET_SQUISH.high, STAGE_TIMING.click.target);
    return wait(STAGE_TIMING.click.settle);
  }

  function zoomTo(level: number, point: Point | null, ms: number) {
    signal.throwIfAborted();
    if (point) {
      zoom.origin.x.jump(point.x);
      zoom.origin.y.jump(point.y);
    }
    return animate(zoom.scale, level, timed(ms, GLIDE_EASE));
  }

  function panTo(point: Point, ms: number) {
    signal.throwIfAborted();
    const transition = timed(ms, GLIDE_EASE);
    return Promise.all([
      animate(zoom.origin.x, point.x, transition),
      animate(zoom.origin.y, point.y, transition),
    ]);
  }

  const pop = (name: Part, from: number) => run(name, { scale: [from, 1] }, spring(POP));
  const popIn = (name: Part) =>
    run(name, { opacity: [0, 1], scale: [POP_IN_FROM, 1] }, spring(POP));
  const fadeIn = (name: Part, ms: number) => run(name, { opacity: [0, 1] }, timed(ms, 'easeOut'));
  const fadeOut = (name: Part, ms: number = STAGE_TIMING.fadeOut) =>
    run(name, { opacity: [1, 0] }, timed(ms, 'easeIn'));
  const fill = (from: number, to: number, ms: number, ease: Transition['ease']) =>
    run('wait-bar', { scaleX: [from, to] }, timed(ms, ease));

  function set(patch: Partial<Flags>) {
    signal.throwIfAborted();
    update(patch);
  }

  function showToast(text: string) {
    signal.throwIfAborted();
    toast(text);
    return run('toast', { opacity: [0, 1], y: [TOAST_DROP, 0] }, spring(POP));
  }

  const addRow = () => run('new-row', { opacity: [0, 1], y: [ROW_RISE, 0] }, spring(SOFT));

  function typeDots(count: number, gap: number) {
    run(
      'password-dot',
      { opacity: [0, 1], scale: [DOT_FROM, 1] },
      { ...spring(POP), delay: instant ? 0 : stagger(gap / MS) },
    );
    return wait(count * gap);
  }

  function spin() {
    const spinner = instant
      ? null
      : run(
          'spinner',
          { rotate: [0, 360] },
          { duration: STAGE_TIMING.spinTurn / MS, ease: 'linear', repeat: Infinity },
        );
    return {
      speedUp: (rate: number) => {
        if (spinner) spinner.speed = rate;
      },
      stop: () => spinner?.stop(),
    };
  }

  return {
    wait,
    pointOn,
    glide,
    squish,
    click,
    zoomTo,
    panTo,
    pop,
    popIn,
    fadeIn,
    fadeOut,
    fill,
    set,
    showToast,
    addRow,
    typeDots,
    spin,
  };
}

export type Stage<Flags extends object> = ReturnType<typeof createStage<Flags>>;
