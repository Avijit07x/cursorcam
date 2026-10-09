import { describe, expect, it } from 'vitest';
import type { ScrollMeasure, ScrollerInfo } from '../../../src/record/page-scripts.js';
import { planScroll, scrollDuration, wheelSteps } from '../../../src/record/scroll-plan.js';

const VIEWPORT = { width: 1280, height: 800 };
const page = (top: number, maxTop: number): ScrollerInfo => ({
  rect: { x: 0, y: 0, ...VIEWPORT },
  left: 0,
  top,
  maxLeft: 0,
  maxTop,
  isDocument: true,
});
const measure = (element: ScrollMeasure['element'], scrollers: ScrollerInfo[]): ScrollMeasure => ({
  element,
  viewport: VIEWPORT,
  scrollers,
});

describe('planScroll', () => {
  it('leaves comfortably visible targets alone', () => {
    expect(
      planScroll(measure({ x: 100, y: 300, width: 100, height: 40 }, [page(0, 2000)]), 'reveal'),
    ).toBeUndefined();
  });

  it('centers a target below the fold, within the page limits', () => {
    const plan = planScroll(
      measure({ x: 100, y: 1500, width: 100, height: 40 }, [page(0, 2000)]),
      'reveal',
    );
    expect(plan).toEqual({ index: 0, delta: { x: 0, y: 1120 }, area: { x: 0, y: 0, ...VIEWPORT } });

    const limited = planScroll(
      measure({ x: 100, y: 1500, width: 100, height: 40 }, [page(0, 900)]),
      'reveal',
    );
    expect(limited?.delta.y).toBe(900);
  });

  it('aligns tall targets near the top instead of centering them', () => {
    const plan = planScroll(
      measure({ x: 0, y: 1000, width: 100, height: 2000 }, [page(0, 5000)]),
      'reveal',
    );
    expect(plan?.delta.y).toBeCloseTo(1000 - 800 * 0.12);
  });

  it('scrolls the inner list first, and the page first when the list is off screen', () => {
    const list: ScrollerInfo = {
      rect: { x: 40, y: 100, width: 300, height: 200 },
      left: 0,
      top: 0,
      maxLeft: 0,
      maxTop: 1400,
      isDocument: false,
    };
    const inList = planScroll(
      measure({ x: 40, y: 1500, width: 300, height: 40 }, [list, page(0, 3000)]),
      'reveal',
    );
    expect(inList?.index).toBe(0);
    expect(inList?.delta.y).toBeCloseTo(1320);

    const offscreen = { ...list, rect: { ...list.rect, y: 2000 } };
    const outer = planScroll(
      measure({ x: 40, y: 2100, width: 300, height: 40 }, [offscreen, page(0, 3000)]),
      'reveal',
    );
    expect(outer?.index).toBe(1);
  });

  it('centers on request even when the target is visible', () => {
    const plan = planScroll(
      measure({ x: 100, y: 200, width: 100, height: 40 }, [page(500, 2000)]),
      'center',
    );
    expect(plan?.delta.y).toBe(-180);
  });
});

describe('wheel pacing', () => {
  it('splits a distance into eased whole-pixel steps that add up exactly', () => {
    const steps = wheelSteps(1000, 40);

    expect(steps.reduce((sum, step) => sum + step, 0)).toBe(1000);
    expect(steps.every((step) => Number.isInteger(step))).toBe(true);
    expect(steps[0]).toBeLessThan(steps[20] ?? 0);
    expect(wheelSteps(-300, 10).reduce((sum, step) => sum + step, 0)).toBe(-300);
  });

  it('takes longer for longer scrolls, within limits, and shorter when sped up', () => {
    expect(scrollDuration(100)).toBe(350);
    expect(scrollDuration(2000)).toBe(1000);
    expect(scrollDuration(10_000)).toBe(1400);
    expect(scrollDuration(2000, 2)).toBe(500);
  });
});
