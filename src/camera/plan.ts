import type { LoggedEvent } from '../record/events.js';
import { centerOf, clamp, type Point, type Rect, type Size } from '../shared/geometry.js';

export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CameraInput {
  readonly events: readonly LoggedEvent[];
  readonly viewport: Size;
  readonly start: number;
  readonly end: number;
  readonly scrollAt: (time: number) => Point;
  readonly cursorAt: (time: number) => Point | undefined;
  readonly enabled: boolean;
  readonly maxZoom: number;
  readonly holdMs: number;
}

export interface Shot {
  readonly start: number;
  readonly first: number;
  readonly last: number;
  readonly end: number;
  readonly rect: Rect;
  readonly zoom: number;
}

const MIN_ZOOM = 1.3;
const NO_ZOOM = 1;
const TARGET_PADDING_PX = 120;
const LEAD_MS = 900;
const JOIN_GAP_MS = 2_000;
const ZOOM_OUT_MS = 300;
const DRAG_PADDING_PX = 80;
const DEAD_ZONE = 0.7;
const ZOOMED = 1.05;
const STEP_MS = 1000 / 120;
const MOVE_SMOOTH_S = 0.3;
const ZOOM_SMOOTH_S = 0.36;
const MS_PER_SECOND = 1000;
const EXP_SECOND_ORDER = 0.48;
const EXP_THIRD_ORDER = 0.235;

interface Focus {
  readonly step: number;
  readonly time: number;
  until: number;
  readonly rect: Rect;
  readonly zoom: number | false | undefined;
  readonly holdsStep: boolean;
}

export function zoomFor(rect: Rect, viewport: Size, maxZoom: number): number {
  const fit = Math.min(
    viewport.width / (rect.width + 2 * TARGET_PADDING_PX),
    viewport.height / (rect.height + 2 * TARGET_PADDING_PX),
  );
  if (fit < MIN_ZOOM) return NO_ZOOM;
  return Math.min(fit, maxZoom);
}

export function planShots(
  input: CameraInput,
  cuts: readonly number[] = cutTimes(input.events),
): Shot[] {
  if (!input.enabled) return [];
  const shots: Shot[] = [];
  const sceneOf = (time: number) => cuts.filter((cut) => cut <= time).length;
  const sceneEnd = (time: number) => cuts.find((cut) => cut > time) ?? Infinity;
  let open: Shot | undefined;
  let openScene = -1;
  let openStep = -1;
  for (const focus of collectFocuses(input)) {
    const scene = sceneOf(focus.time);
    const previous = scene === openScene ? open : undefined;
    const sameStep = focus.step >= 0 && focus.step === openStep;
    openStep = focus.step;
    const zoom = shotZoom(focus, input);
    if (zoom <= NO_ZOOM) {
      open = undefined;
      continue;
    }
    const end = Math.min(focus.until, sceneEnd(focus.time));
    const joined = previous && joinShots(previous, focus, { zoom, end, sameStep }, input);
    if (joined) {
      shots[shots.length - 1] = joined;
      open = joined;
      continue;
    }
    const start = previous
      ? clamp(focus.time - LEAD_MS, previous.last + ZOOM_OUT_MS, focus.time)
      : focus.time - LEAD_MS;
    open = { start, first: focus.time, last: focus.until, end, rect: focus.rect, zoom };
    openScene = scene;
    shots.push(open);
  }
  return shots;
}

function joinShots(
  previous: Shot,
  focus: Focus,
  next: { readonly zoom: number; readonly end: number; readonly sameStep: boolean },
  input: CameraInput,
): Shot | undefined {
  const { zoom, end, sameStep } = next;
  if (!sameStep && focus.time - previous.last > JOIN_GAP_MS) return undefined;
  const rect = union(previous.rect, focus.rect);
  const inView =
    rect.width <= input.viewport.width / previous.zoom &&
    rect.height <= input.viewport.height / previous.zoom;
  if (!inView) return undefined;
  const fit = zoomFor(rect, input.viewport, Math.max(previous.zoom, zoom));
  const joined = Math.min(previous.zoom, zoom, fit);
  if (joined <= NO_ZOOM) return undefined;
  return {
    ...previous,
    last: Math.max(previous.last, focus.until),
    end: Math.max(previous.end, end),
    rect,
    zoom: joined,
  };
}

export class CameraPath {
  readonly #start: number;
  readonly #states: CameraState[] = [];

  constructor(input: CameraInput) {
    this.#start = input.start;
    const cuts = cutTimes(input.events);
    const shots = planShots(input, cuts);
    const scrolls = scrollRanges(input.events);
    let state: CameraState | undefined;
    let velocity = { x: 0, y: 0, zoom: 0 };
    let nextCut = 0;
    for (let time = input.start; time <= input.end + STEP_MS; time += STEP_MS) {
      const target = targetAt(input, shots, scrolls, time);
      const cut = nextCut < cuts.length && (cuts[nextCut] ?? Infinity) <= time;
      if (cut) while (nextCut < cuts.length && (cuts[nextCut] ?? Infinity) <= time) nextCut += 1;
      if (!state || cut) {
        state = target;
        velocity = { x: 0, y: 0, zoom: 0 };
      } else {
        const dt = STEP_MS / MS_PER_SECOND;
        const x = smoothDamp(state.x, target.x, velocity.x, MOVE_SMOOTH_S, dt);
        const y = smoothDamp(state.y, target.y, velocity.y, MOVE_SMOOTH_S, dt);
        const zoom = smoothDamp(
          Math.log(state.zoom),
          Math.log(target.zoom),
          velocity.zoom,
          ZOOM_SMOOTH_S,
          dt,
        );
        state = { x: x.value, y: y.value, zoom: Math.exp(zoom.value) };
        velocity = { x: x.velocity, y: y.velocity, zoom: zoom.velocity };
      }
      this.#states.push(state);
    }
  }

  at(time: number): CameraState {
    const position = (time - this.#start) / STEP_MS;
    const index = clamp(Math.floor(position), 0, this.#states.length - 1);
    const current = this.#states[index];
    const next = this.#states[Math.min(index + 1, this.#states.length - 1)];
    if (!current || !next) return { x: 0, y: 0, zoom: NO_ZOOM };
    const blend = clamp(position - index, 0, 1);
    return {
      x: current.x + (next.x - current.x) * blend,
      y: current.y + (next.y - current.y) * blend,
      zoom: current.zoom + (next.zoom - current.zoom) * blend,
    };
  }
}

export function cropFor(camera: CameraState, scroll: Point, viewport: Size): Rect {
  const zoom = Math.max(camera.zoom, NO_ZOOM);
  const width = viewport.width / zoom;
  const height = viewport.height / zoom;
  return {
    x: clamp(camera.x - scroll.x - width / 2, 0, viewport.width - width),
    y: clamp(camera.y - scroll.y - height / 2, 0, viewport.height - height),
    width,
    height,
  };
}

function collectFocuses(input: CameraInput): Focus[] {
  const focuses: Focus[] = [];
  let stepFocuses: Focus[] = [];
  let step = -1;
  let stepZoom: number | false | undefined;
  let typingStart: { time: number; rect: Rect } | undefined;
  let dragStart: { time: number; point: Point } | undefined;
  const add = (focus: Focus) => {
    focuses.push(focus);
    stepFocuses.push(focus);
  };
  const toPage = (rect: Rect, time: number): Rect => {
    const scroll = input.scrollAt(time);
    return { ...rect, x: rect.x + scroll.x, y: rect.y + scroll.y };
  };
  for (const event of input.events) {
    switch (event.type) {
      case 'step':
        if (event.phase === 'start') {
          step = event.index;
          stepZoom = event.zoom;
          stepFocuses = [];
        } else {
          for (const focus of stepFocuses) {
            if (focus.holdsStep) focus.until = Math.max(focus.until, event.t);
          }
        }
        break;
      case 'click':
      case 'tap':
      case 'select':
        add({
          step,
          time: event.t,
          until: event.t + input.holdMs,
          rect: toPage(event.target, event.t),
          zoom: stepZoom,
          holdsStep: false,
        });
        break;
      case 'hover':
        if (typeof stepZoom !== 'number') break;
        add({
          step,
          time: event.t,
          until: event.t,
          rect: toPage(event.target, event.t),
          zoom: stepZoom,
          holdsStep: true,
        });
        break;
      case 'typing':
        if (event.phase === 'start')
          typingStart = { time: event.t, rect: toPage(event.target, event.t) };
        else if (typingStart) {
          add({
            step,
            time: typingStart.time,
            until: event.t + input.holdMs,
            rect: typingStart.rect,
            zoom: stepZoom,
            holdsStep: false,
          });
          typingStart = undefined;
        }
        break;
      case 'drag':
        if (event.phase === 'start')
          dragStart = { time: event.t, point: { x: event.x, y: event.y } };
        else if (dragStart) {
          const rect = around([dragStart.point, { x: event.x, y: event.y }], DRAG_PADDING_PX);
          add({
            step,
            time: dragStart.time,
            until: event.t + input.holdMs,
            rect: toPage(rect, event.t),
            zoom: stepZoom,
            holdsStep: false,
          });
          dragStart = undefined;
        }
        break;
      default:
        break;
    }
  }
  return focuses.sort((a, b) => a.time - b.time);
}

function shotZoom(focus: Focus, input: CameraInput): number {
  if (focus.zoom === false) return NO_ZOOM;
  if (typeof focus.zoom === 'number') return focus.zoom;
  return zoomFor(focus.rect, input.viewport, input.maxZoom);
}

function targetAt(
  input: CameraInput,
  shots: readonly Shot[],
  scrolls: readonly [number, number][],
  time: number,
): CameraState {
  const scroll = input.scrollAt(time);
  const wide = {
    x: scroll.x + input.viewport.width / 2,
    y: scroll.y + input.viewport.height / 2,
    zoom: NO_ZOOM,
  };
  if (scrolls.some(([start, end]) => time >= start && time <= end)) return wide;
  const shot = shots.find((candidate) => time >= candidate.start && time <= candidate.end);
  if (!shot) return wide;
  const center = centerOf(shot.rect);
  const cursor = input.cursorAt(time);
  const acting = time >= shot.first && time <= shot.last;
  if (!cursor || !acting || shot.zoom <= ZOOMED) return { ...center, zoom: shot.zoom };
  const page = { x: cursor.x + scroll.x, y: cursor.y + scroll.y };
  return {
    x: follow(center.x, page.x, (input.viewport.width / shot.zoom / 2) * DEAD_ZONE),
    y: follow(center.y, page.y, (input.viewport.height / shot.zoom / 2) * DEAD_ZONE),
    zoom: shot.zoom,
  };
}

function follow(center: number, cursor: number, reach: number): number {
  if (cursor > center + reach) return cursor - reach;
  if (cursor < center - reach) return cursor + reach;
  return center;
}

function scrollRanges(events: readonly LoggedEvent[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start: number | undefined;
  for (const event of events) {
    if (event.type !== 'scroll') continue;
    if (event.phase === 'start') start = event.t;
    else if (start !== undefined) {
      ranges.push([start, event.t]);
      start = undefined;
    }
  }
  if (start !== undefined) ranges.push([start, Infinity]);
  return ranges;
}

function cutTimes(events: readonly LoggedEvent[]): number[] {
  return events
    .filter(
      (event) =>
        (event.type === 'navigate' && event.phase === 'load') ||
        event.type === 'tab' ||
        event.type === 'jump',
    )
    .map((event) => event.t);
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function around(points: readonly Point[], padding: number): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs) - padding;
  const y = Math.min(...ys) - padding;
  return { x, y, width: Math.max(...xs) + padding - x, height: Math.max(...ys) + padding - y };
}

function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  dt: number,
): { value: number; velocity: number } {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const decay = 1 / (1 + x + EXP_SECOND_ORDER * x * x + EXP_THIRD_ORDER * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return {
    value: target + (change + temp) * decay,
    velocity: (velocity - omega * temp) * decay,
  };
}
