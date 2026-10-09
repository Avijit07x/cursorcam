import { describe, expect, it } from 'vitest';
import {
  CameraPath,
  cropFor,
  planShots,
  zoomFor,
  type CameraInput,
} from '../../../src/camera/plan.js';
import type { LoggedEvent } from '../../../src/record/events.js';
import { at, box } from '../../helpers/events.js';

const VIEWPORT = { width: 1280, height: 800 };

function input(events: LoggedEvent[], extra: Partial<CameraInput> = {}): CameraInput {
  return {
    events,
    viewport: VIEWPORT,
    start: 0,
    end: 10_000,
    scrollAt: () => ({ x: 0, y: 0 }),
    cursorAt: () => undefined,
    enabled: true,
    maxZoom: 2,
    holdMs: 0,
    ...extra,
  };
}

const click = (t: number, x: number, y: number) =>
  at(t, { type: 'click', x: x + 50, y: y + 20, count: 1, target: box(x, y) });

const stepStart = (t: number, index: number, zoom?: number | false) =>
  at(t, {
    type: 'step',
    phase: 'start',
    index,
    action: 'click',
    ...(zoom === undefined ? {} : { zoom }),
  });

const stepEnd = (t: number, index: number) =>
  at(t, { type: 'step', phase: 'end', index, action: 'click', pauseAfter: 700 });

function clickStep(index: number, t: number, x: number, y: number): LoggedEvent[] {
  return [stepStart(t - 800, index), click(t, x, y), stepEnd(t + 700, index)];
}

function zoomsBetween(path: CameraPath, from: number, to: number): number[] {
  return Array.from({ length: (to - from) / 10 }, (_, index) => path.at(from + index * 10).zoom);
}

describe('zoomFor', () => {
  it('zooms in on small targets up to the limit, and not at all on huge ones', () => {
    expect(zoomFor(box(0, 0), VIEWPORT, 2)).toBe(2);
    expect(zoomFor(box(0, 0, 600, 300), VIEWPORT, 2)).toBeCloseTo(1.48, 2);
    expect(zoomFor(box(0, 0, 1200, 700), VIEWPORT, 2)).toBe(1);
  });
});

describe('planShots', () => {
  it('zooms in before a click and starts zooming out right at it', () => {
    const [shot] = planShots(input(clickStep(0, 2_000, 100, 100)));

    expect(shot).toMatchObject({ start: 1_100, first: 2_000, last: 2_000, end: 2_000, zoom: 2 });
  });

  it('stays zoomed after each action for the hold time', () => {
    const [shot] = planShots(input(clickStep(0, 2_000, 100, 100), { holdMs: 800 }));

    expect(shot).toMatchObject({ first: 2_000, last: 2_800, end: 2_800 });
  });

  it('keeps a click and the typing after it in one shot', () => {
    const events = [
      at(0, { type: 'step', phase: 'start', index: 0, action: 'type' }),
      click(1_000, 100, 100),
      at(1_100, { type: 'typing', phase: 'start', target: box(100, 100), fast: false, chars: 5 }),
      at(2_500, { type: 'typing', phase: 'end', target: box(100, 100), fast: false, chars: 5 }),
      at(3_200, { type: 'step', phase: 'end', index: 0, action: 'type', pauseAfter: 700 }),
    ];
    const shots = planShots(input(events));

    expect(shots).toEqual([
      { start: 100, first: 1_000, last: 2_500, end: 2_500, rect: box(100, 100), zoom: 2 },
    ]);
  });

  it('stays zoomed between nearby actions that follow each other', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 2_500, 300, 160)];
    const shots = planShots(input(events));

    expect(shots).toHaveLength(1);
    expect(shots[0]).toMatchObject({
      first: 1_000,
      last: 2_500,
      rect: { x: 100, y: 100, width: 300, height: 100 },
      zoom: 2,
    });
  });

  it('zooms out when the next action does not fit in the same zoomed view', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 2_500, 800, 100)];

    expect(planShots(input(events))).toHaveLength(2);
  });

  it('zooms out during a long wait between nearby actions, unless the hold covers it', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 4_000, 120, 100)];

    expect(planShots(input(events))).toHaveLength(2);
    expect(planShots(input(events, { holdMs: 1_500 }))).toHaveLength(1);
  });

  it('starts the next zoom only after the last one has zoomed out', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 1_700, 1_100, 700)];
    const shots = planShots(input(events));

    expect(shots[0]?.end).toBe(1_000);
    expect(shots[1]?.start).toBe(1_300);
  });

  it('zooms out between actions far apart in time', () => {
    const shots = planShots(input([click(1_000, 100, 100), click(8_000, 100, 100)]));

    expect(shots[0]?.end).toBe(1_000);
    expect(shots[1]?.start).toBe(7_100);
  });

  it('zooms on a hover only when its step sets a zoom, then holds for the whole step', () => {
    const hover = (zoom?: number) => [
      stepStart(1_000, 0, zoom),
      at(2_000, { type: 'hover', target: box(100, 100) }),
      stepEnd(3_800, 0),
    ];

    expect(planShots(input(hover()))).toEqual([]);
    expect(planShots(input(hover(1.5)))).toEqual([
      { start: 1_100, first: 2_000, last: 3_800, end: 3_800, rect: box(100, 100), zoom: 1.5 },
    ]);
  });

  it('shows the whole page for a step with zoom off', () => {
    const events = [
      ...clickStep(0, 1_000, 100, 100),
      stepStart(1_800, 1, false),
      click(2_000, 120, 100),
      stepEnd(2_700, 1),
      ...clickStep(2, 3_500, 140, 100),
    ];
    const shots = planShots(input(events, { holdMs: 3_000 }));

    expect(shots.map((shot) => shot.first)).toEqual([1_000, 3_500]);
  });

  it('ends a shot at a page load, and follows step zoom options', () => {
    const events = [
      at(0, { type: 'step', phase: 'start', index: 0, action: 'type', zoom: 1.5 }),
      at(1_000, { type: 'typing', phase: 'start', target: box(100, 100), fast: false, chars: 5 }),
      at(4_000, { type: 'typing', phase: 'end', target: box(100, 100), fast: false, chars: 5 }),
      at(4_500, { type: 'navigate', phase: 'load', url: 'x' }),
      stepStart(5_000, 1, false),
      click(6_000, 100, 100),
    ];

    expect(planShots(input(events, { holdMs: 2_000 }))).toEqual([
      { start: 100, first: 1_000, last: 6_000, end: 4_500, rect: box(100, 100), zoom: 1.5 },
    ]);
  });

  it('plans nothing when zoom is off', () => {
    expect(planShots(input([click(1_000, 100, 100)], { enabled: false }))).toEqual([]);
  });
});

describe('CameraPath', () => {
  it('moves smoothly toward the target with no jumps', () => {
    const path = new CameraPath(input([click(2_000, 100, 100)]));
    const samples = Array.from({ length: 200 }, (_, index) => path.at(index * 25));
    const steps = samples.slice(1).map((state, index) => {
      const previous = samples[index];
      return previous ? Math.hypot(state.x - previous.x, state.y - previous.y) : 0;
    });

    expect(samples[0]).toEqual({ x: 640, y: 400, zoom: 1 });
    expect(path.at(2_000).zoom).toBeGreaterThan(1.9);
    expect(path.at(9_000).zoom).toBeCloseTo(1, 1);
    expect(Math.max(...steps)).toBeLessThan(40);
  });

  it('is zoomed in at the click, and zoomed out soon after', () => {
    const path = new CameraPath(input(clickStep(0, 2_000, 100, 100)));
    const held = new CameraPath(input(clickStep(0, 2_000, 100, 100), { holdMs: 1_000 }));

    expect(path.at(2_000).zoom).toBeGreaterThan(1.9);
    expect(path.at(2_100).zoom).toBeGreaterThan(1.8);
    expect(path.at(3_000).zoom).toBeLessThan(1.2);
    expect(held.at(2_900).zoom).toBeGreaterThan(1.9);
  });

  it('stays zoomed between nearby clicks', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 2_500, 300, 160)];
    const path = new CameraPath(input(events));

    expect(Math.min(...zoomsBetween(path, 1_000, 2_500))).toBeGreaterThan(1.9);
  });

  it('zooms out on the way to a far action, and is zoomed in again at its click', () => {
    const events = [...clickStep(0, 1_000, 100, 100), ...clickStep(1, 2_600, 1_100, 700)];
    const path = new CameraPath(input(events));

    expect(Math.min(...zoomsBetween(path, 1_000, 2_600))).toBeLessThan(1.3);
    expect(path.at(2_600).zoom).toBeGreaterThan(1.85);
  });

  it('cuts straight to the new view after a page load', () => {
    const events = [
      stepStart(200, 0),
      click(1_000, 1_000, 600),
      stepEnd(1_550, 0),
      at(1_600, { type: 'navigate', phase: 'load', url: 'x' }),
    ];
    const path = new CameraPath(input(events, { holdMs: 1_000 }));

    expect(path.at(1_590).zoom).toBeGreaterThan(1.5);
    expect(path.at(1_610)).toEqual({ x: 640, y: 400, zoom: 1 });
  });

  it('does not chase the cursor on its way to the target', () => {
    const cursorAt = (time: number) => (time < 1_900 ? { x: 1_200, y: 700 } : { x: 150, y: 120 });
    const path = new CameraPath(input([click(2_000, 100, 100)], { cursorAt }));
    const crop = cropFor(path.at(1_800), { x: 0, y: 0 }, VIEWPORT);

    expect(crop.x + crop.width).toBeLessThan(1_100);
  });

  it('keeps a cursor that moves during a held step inside the zoomed view', () => {
    const events = [
      stepStart(0, 0, 2),
      at(1_000, { type: 'hover', target: box(100, 100) }),
      stepEnd(2_600, 0),
    ];
    const cursorAt = (time: number) =>
      time > 1_500 && time < 2_400 ? { x: 1_200, y: 700 } : undefined;
    const path = new CameraPath(input(events, { cursorAt }));
    const crop = cropFor(path.at(2_200), { x: 0, y: 0 }, VIEWPORT);

    expect(crop.x + crop.width).toBeGreaterThan(1_100);
  });
});

describe('cropFor', () => {
  it('turns page coordinates into a crop that stays inside the frame', () => {
    expect(cropFor({ x: 640, y: 400, zoom: 1 }, { x: 0, y: 0 }, VIEWPORT)).toEqual({
      x: 0,
      y: 0,
      ...VIEWPORT,
    });
    expect(cropFor({ x: 50, y: 50, zoom: 2 }, { x: 0, y: 0 }, VIEWPORT)).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 400,
    });
    expect(cropFor({ x: 700, y: 1_400, zoom: 2 }, { x: 0, y: 1_000 }, VIEWPORT)).toEqual({
      x: 380,
      y: 200,
      width: 640,
      height: 400,
    });
  });
});
