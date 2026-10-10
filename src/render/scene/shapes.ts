import { clamp } from '../../shared/geometry.js';
import {
  cover,
  curve,
  type Draw,
  linear,
  mix,
  type Point,
  shade,
  shadow,
  svg,
  tint,
} from './svg.js';

const DUNE_LAYERS = 6;
const DUNE_POINTS = 7;
const RIBBON_PATH: readonly Point[] = [
  [-0.1, 0.78],
  [0.18, 0.58],
  [0.42, 0.78],
  [0.7, 0.38],
  [0.92, 0.3],
  [1.12, 0.08],
];
const HALFTONE_START = 0.6;
const CURSOR_PATH = 'M24 21v21l5.9-5 3.8 8.3 3.2-1.5-3.8-8.2h7.8Z';
const CURSOR_TIP: Point = [24, 21];
const CURSOR_HEIGHT = 25;
const CURSOR_RINGS = [
  { r: 0.1, opacity: 0.35 },
  { r: 0.2, opacity: 0.22 },
  { r: 0.32, opacity: 0.12 },
] as const;

export const split: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  return svg`
    <defs>
      ${linear('left', tint(deep, 0.08), shade(deep, 0.25))}
      ${linear('right', tint(light, 0.2), mix(light, deep, 0.3), [1, 0, 0, 1])}
      ${shadow('edge', frame, { dx: -s * 0.012, dy: 0, spread: s * 0.03, color: shade(deep, 0.5), opacity: 0.45 })}
    </defs>
    ${cover(frame, 'url(#left)')}
    <path d="M${w * 0.6} ${-h * 0.05}C${w * 0.28} ${h * 0.32} ${w * 0.8} ${h * 0.62} ${w * 0.4} ${h * 1.05}L${w * 1.05} ${h * 1.05}L${w * 1.05} ${-h * 0.05}Z" fill="url(#right)" filter="url(#edge)" />`;
};

export const dunes: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const sky = tint(light, 0.4);
  const layers = Array.from({ length: DUNE_LAYERS }, (_, layer) => {
    const base = h * (0.1 + 0.16 * layer);
    const points = Array.from({ length: DUNE_POINTS }, (_, step): Point => [
      w * (-0.1 + step * 0.2),
      base + s * 0.055 * Math.sin(step * 1.25 + layer * 1.9),
    ]);
    return svg`<path d="${curve(points)}L${w * 1.1} ${h * 1.1}L${-w * 0.1} ${h * 1.1}Z" fill="${mix(sky, deep, (layer + 1) / DUNE_LAYERS)}" filter="url(#lift)" />`;
  });
  return svg`
    <defs>${shadow('lift', frame, { dy: -s * 0.006, spread: s * 0.022, color: shade(deep, 0.4), opacity: 0.25 })}</defs>
    ${cover(frame, sky)}
    ${layers.join('')}`;
};

export const ribbons: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const bands = [
    { lift: 0.16, color: mix(deep, light, 0.25), width: s * 0.24 },
    { lift: 0, color: mix(deep, light, 0.55), width: s * 0.18 },
    { lift: -0.16, color: light, width: s * 0.12 },
  ]
    .map(({ lift, color, width }) => {
      const points = RIBBON_PATH.map(([x, y]): Point => [w * x, h * (y + lift)]);
      return svg`<path d="${curve(points)}" stroke="${color}" stroke-width="${width}" />`;
    })
    .join('');
  return svg`
    <defs>
      ${linear('base', deep, shade(deep, 0.3))}
      ${shadow('lift', frame, { dy: s * 0.02, spread: s * 0.03, color: shade(deep, 0.6), opacity: 0.35 })}
    </defs>
    ${cover(frame, 'url(#base)')}
    <g fill="none" stroke-linecap="round" filter="url(#lift)">${bands}</g>`;
};

export const shapes: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const pill = { x: w * 0.8, y: h * 0.86 };
  return svg`
    ${cover(frame, tint(light, 0.72))}
    <circle cx="${w * 0.92}" cy="${h * 0.1}" r="${s * 0.46}" fill="${deep}" />
    <circle cx="${w * 0.02}" cy="${h * 1.02}" r="${s * 0.56}" fill="${light}" />
    <circle cx="${w * 0.1}" cy="${h * 0.1}" r="${s * 0.17}" fill="none" stroke="${mix(deep, light, 0.5)}" stroke-width="${s * 0.05}" />
    <rect x="${pill.x - s * 0.3}" y="${pill.y - s * 0.08}" width="${s * 0.6}" height="${s * 0.16}" rx="${s * 0.08}" fill="${mix(deep, light, 0.4)}" transform="rotate(-28 ${pill.x} ${pill.y})" />
    <circle cx="${w * 0.05}" cy="${h * 0.55}" r="${s * 0.035}" fill="${deep}" />`;
};

function ease(value: number): number {
  const t = clamp((value - HALFTONE_START) / (1 - HALFTONE_START), 0, 1);
  return t * t * (3 - 2 * t);
}

export const halftone: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const gap = s * 0.032;
  const dots: string[] = [];
  for (let row = 0, y = gap / 2; y < h + gap; row += 1, y += gap) {
    for (let x = ((row % 2) * gap) / 2; x < w + gap; x += gap) {
      const along = (x / w + y / h) / 2;
      const radius = gap * 0.5 * Math.max(ease(along), ease(1 - along));
      if (radius > gap * 0.04) dots.push(svg`<circle cx="${x}" cy="${y}" r="${radius}" />`);
    }
  }
  return svg`${cover(frame, tint(light, 0.5))}<g fill="${deep}">${dots.join('')}</g>`;
};

export const cursor: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s, side, band } = frame;
  const [x, y] = side ? [w - band * 0.5, h * 0.38] : [w * 0.38, h - band * 0.5];
  const rings = CURSOR_RINGS.map(
    ({ r, opacity }) =>
      svg`<circle cx="${x}" cy="${y}" r="${s * r}" stroke-opacity="${opacity}" />`,
  ).join('');
  const scale = (s * 1.05) / CURSOR_HEIGHT;
  return svg`
    <defs>${linear('base', deep, mix(deep, light, 0.4))}</defs>
    ${cover(frame, 'url(#base)')}
    <g fill="none" stroke="${light}" stroke-width="${s * 0.006}">${rings}</g>
    <path d="${CURSOR_PATH}" transform="translate(${x} ${y}) rotate(-14) scale(${scale}) translate(${-CURSOR_TIP[0]} ${-CURSOR_TIP[1]})" fill="${light}" fill-opacity="0.24" />`;
};
