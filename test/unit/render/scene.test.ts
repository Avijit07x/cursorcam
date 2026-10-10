import { describe, expect, it } from 'vitest';
import { PALETTE_NAMES, PALETTES, SCENES } from '../../../src/config/scenes.js';
import { parseStyle } from '../../../src/config/style.js';
import { computeLayout } from '../../../src/render/layout.js';
import { sceneSvg } from '../../../src/render/scene/index.js';
import { curve, frameOf, mix, shade, tint } from '../../../src/render/scene/svg.js';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const SHAPES = [
  { size: { width: 1920, height: 1080 }, viewport: DESKTOP },
  { size: { width: 1080, height: 1080 }, viewport: DESKTOP },
  { size: { width: 1080, height: 1920 }, viewport: PHONE },
];
const STYLE = parseStyle({}, 'test');

function frameFor(index: number) {
  const shape = SHAPES[index];
  if (!shape) throw new Error(`No shape ${index}`);
  return frameOf(shape.size, computeLayout(shape.size, shape.viewport, STYLE));
}

describe('scene backgrounds', () => {
  it('draws every scene in every palette and shape as a clean SVG', () => {
    for (const [index, { size }] of SHAPES.entries()) {
      const frame = frameFor(index);
      for (const scene of SCENES) {
        for (const palette of PALETTE_NAMES) {
          const svg = sceneSvg(scene, palette, frame);
          expect(svg).toMatch(
            new RegExp(`^<svg [^>]*width="${size.width}" height="${size.height}"[^>]*>.+</svg>$`),
          );
          expect(svg).not.toMatch(/NaN|undefined|Infinity|null|href=/);
        }
      }
    }
  });

  it('uses the two colors it is given', () => {
    const frame = frameFor(0);
    const colors = ['#102030', '#a0b0c0'] as const;
    for (const scene of SCENES) {
      expect(sceneSvg(scene, colors, frame)).not.toContain(PALETTES.indigo[0]);
    }
    expect(sceneSvg('shapes', colors, frame)).toContain('#102030');
    expect(sceneSvg('halftone', 'sunset', frame)).toContain(PALETTES.sunset[0]);
  });

  it('draws the same picture every time', () => {
    const frame = frameFor(1);
    for (const scene of SCENES) {
      expect(sceneSvg(scene, 'teal', frame)).toBe(sceneSvg(scene, 'teal', frame));
    }
  });

  it('keeps the glass frame around the window and the cursor in the margin', () => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const wide = frameFor(0);
    expect(wide.side).toBe(true);
    expect(wide.band).toBe(wide.window.x);
    expect(sceneSvg('glass', 'indigo', wide)).toContain(
      `x="${round(wide.window.x - wide.gap * 0.55)}"`,
    );
    expect(sceneSvg('cursor', 'indigo', wide)).toContain(
      `translate(${round(wide.width - wide.band / 2)} `,
    );
    const square = frameFor(1);
    expect(square.side).toBe(false);
    expect(square.band).toBe(square.window.y);
  });
});

describe('scene colors and curves', () => {
  it('mixes, shades and tints hex colors, short or long', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000', '#fff', 0.25)).toBe('#404040');
    expect(shade('#4f46e5', 0)).toBe('#4f46e5');
    expect(shade('#4f46e5', 1)).toBe('#000000');
    expect(tint('#4f46e5', 1)).toBe('#ffffff');
  });

  it('draws a smooth path through every point, open or closed', () => {
    const points = [
      [0, 0],
      [10, 5],
      [20, 0],
    ] as const;
    expect(curve(points)).toMatch(/^M0 0C.+ 10 5C.+ 20 0$/);
    expect(curve(points, true)).toMatch(/^M0 0(C[^C]+){3}Z$/);
    expect(curve(points, true).endsWith(' 0 0Z')).toBe(true);
  });
});
