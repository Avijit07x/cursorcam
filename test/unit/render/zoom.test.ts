import { describe, expect, it } from 'vitest';
import { shownPart, windowTransform } from '../../../src/render/page/zoom.js';

const CONTENT = { x: 235, y: 108, width: 1450, height: 906 };
const FRAME = { width: 1920, height: 1080 };
const PAGE_WIDTH = 1280;

describe('windowTransform', () => {
  it('leaves the window in place without zoom', () => {
    const camera = windowTransform([0, 0, 1280, 800], CONTENT, PAGE_WIDTH);

    expect(camera).toEqual({ scale: 1, x: 0, y: 0 });
    expect(shownPart(CONTENT, camera, FRAME)).toEqual(CONTENT);
  });

  it('scales the whole window so the zoomed part of the page lands on the content box', () => {
    const camera = windowTransform([320, 200, 640, 400], CONTENT, PAGE_WIDTH);
    const pagePixel = CONTENT.width / PAGE_WIDTH;
    const onScreen = (pageX: number) => (CONTENT.x + pageX * pagePixel) * camera.scale + camera.x;

    expect(camera.scale).toBe(2);
    expect(onScreen(320)).toBeCloseTo(CONTENT.x);
    expect(onScreen(960)).toBeCloseTo(CONTENT.x + CONTENT.width);
    expect(onScreen(0)).toBeLessThan(0);
    expect(shownPart(CONTENT, camera, FRAME)).toEqual({ x: 0, y: 0, ...FRAME });
  });

  it('keeps the window edge and the background in view at the edge of the page', () => {
    const camera = windowTransform([0, 0, 640, 400], CONTENT, PAGE_WIDTH);
    const shown = shownPart(CONTENT, camera, FRAME);

    expect(shown.x).toBe(CONTENT.x);
    expect(shown.y).toBe(CONTENT.y);
    expect(shown.x + shown.width).toBe(FRAME.width);
  });

  it('lands the bottom of the page on the bottom of a content box of another shape', () => {
    const full = { x: 0, y: 0, width: 888, height: 1920 };
    const camera = windowTransform([195, 422, 195, 422], full, 390);

    expect((full.y + full.height) * camera.scale + camera.y).toBeCloseTo(1920);
    expect((full.x + full.width) * camera.scale + camera.x).toBeCloseTo(888);
  });
});
