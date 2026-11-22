import { describe, expect, it } from 'vitest';
import { computeLayout, fullFrameLayout, fullFrameSize } from '../../../src/render/layout.js';

const STYLE = { padding: 0.06, radius: 14, shadow: 0.45, browserBar: true };
const DESKTOP = { width: 1280, height: 800 };

describe('computeLayout', () => {
  it('centers the window with its bar inside the padding', () => {
    const layout = computeLayout({ width: 1920, height: 1080 }, DESKTOP, STYLE);

    expect(layout.window.y).toBeGreaterThanOrEqual(65);
    expect(layout.window.y + layout.window.height).toBeLessThanOrEqual(1080 - 64);
    expect(layout.window.x * 2 + layout.window.width).toBeCloseTo(1920, -1);
    expect(layout.bar?.height).toBeGreaterThan(30);
    expect(layout.content.y).toBe(layout.window.y + (layout.bar?.height ?? 0));
    expect(layout.content.width / layout.content.height).toBeCloseTo(1.6, 2);
  });

  it('drops the bar when asked and scales the corner radius with the size', () => {
    const layout = computeLayout({ width: 1280, height: 720 }, DESKTOP, {
      ...STYLE,
      browserBar: false,
    });

    expect(layout.bar).toBeNull();
    expect(layout.window).toEqual(layout.content);
    expect(layout.radius).toBe(9);
  });

  it('fits a phone recording into a vertical video by height', () => {
    const layout = computeLayout({ width: 1080, height: 1920 }, { width: 390, height: 844 }, STYLE);

    expect(layout.window.height).toBeLessThanOrEqual(1920 - 2 * 65);
    expect(layout.window.width).toBeLessThan(1080);
  });
});

describe('a video without a background', () => {
  it('takes the shape of the recording, as big as the frame allows, with even sides', () => {
    expect(fullFrameSize({ width: 1920, height: 1080 }, DESKTOP)).toEqual({
      width: 1728,
      height: 1080,
    });
    expect(fullFrameSize({ width: 1080, height: 1080 }, DESKTOP)).toEqual({
      width: 1080,
      height: 676,
    });
    expect(fullFrameSize({ width: 1080, height: 1920 }, { width: 390, height: 844 })).toEqual({
      width: 888,
      height: 1920,
    });
  });

  it('fills the frame with the page: no bar, corners or shadow', () => {
    const frame = { x: 0, y: 0, width: 1728, height: 1080 };

    expect(fullFrameLayout({ width: 1728, height: 1080 })).toEqual({
      window: frame,
      content: frame,
      bar: null,
      radius: 0,
      shadow: 0,
    });
  });
});
