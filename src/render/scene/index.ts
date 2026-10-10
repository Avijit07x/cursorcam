import { PALETTES, type SceneColors, type SceneName } from '../../config/scenes.js';
import { beams, contours, grid, ripple } from './lines.js';
import { cursor, dunes, halftone, ribbons, shapes, split } from './shapes.js';
import { aurora, glass, glow, mesh } from './soft.js';
import { type Draw, type Frame, svg, type Tones } from './svg.js';

const DRAWINGS: Record<SceneName, Draw> = {
  mesh,
  glow,
  split,
  dunes,
  aurora,
  glass,
  ripple,
  contours,
  grid,
  ribbons,
  beams,
  shapes,
  halftone,
  cursor,
};

function tonesOf(colors: SceneColors): Tones {
  const [deep, light] = typeof colors === 'string' ? PALETTES[colors] : colors;
  return { deep, light };
}

export function sceneSvg(name: SceneName, colors: SceneColors, frame: Frame): string {
  const { width, height } = frame;
  const body = DRAWINGS[name](frame, tonesOf(colors));
  return svg`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
    .replace(/>\s+</g, '><')
    .trim();
}
