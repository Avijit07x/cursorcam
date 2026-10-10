import {
  blur,
  cover,
  curve,
  type Draw,
  linear,
  mix,
  type Point,
  radial,
  shade,
  svg,
  tint,
} from './svg.js';

const CONTOUR_POINTS = 40;
const RAY_COUNT = 9;
const DEGREES = Math.PI / 180;

export const ripple: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const reach = Math.hypot(w, h) / 2;
  const rings: string[] = [];
  for (let r = s * 0.3; r < reach; r += s * 0.05) {
    const opacity = 0.06 + 0.4 * (1 - r / reach);
    rings.push(svg`<circle cx="${w / 2}" cy="${h / 2}" r="${r}" stroke-opacity="${opacity}" />`);
  }
  return svg`
    <defs>${radial(
      'base',
      [0.5, 0.5, 0.75],
      [
        { offset: 0, color: mix(deep, light, 0.35) },
        { offset: 1, color: shade(deep, 0.35) },
      ],
    )}</defs>
    ${cover(frame, 'url(#base)')}
    <g fill="none" stroke="${light}" stroke-width="${s * 0.003}">${rings.join('')}</g>`;
};

export const contours: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const cx = w * 0.28;
  const cy = h * 0.38;
  const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + s * 0.1;
  const lines: string[] = [];
  for (let line = 0, r = s * 0.12; r < reach; line += 1, r += s * 0.045) {
    const points = Array.from({ length: CONTOUR_POINTS }, (_, step): Point => {
      const angle = (step / CONTOUR_POINTS) * Math.PI * 2;
      const wobble =
        s *
        0.035 *
        (Math.sin(3 * angle + line * 0.18) +
          0.6 * Math.sin(5 * angle - line * 0.11) +
          0.4 * Math.sin(2 * angle + line * 0.07));
      const radius = r + wobble;
      return [cx + radius * 1.2 * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    lines.push(`<path d="${curve(points, true)}" />`);
  }
  return svg`
    <defs>${linear('base', tint(deep, 0.05), shade(deep, 0.35))}</defs>
    ${cover(frame, 'url(#base)')}
    <g fill="none" stroke="${light}" stroke-opacity="0.32" stroke-width="${s * 0.0024}">${lines.join('')}</g>`;
};

export const grid: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const step = s * 0.05;
  return svg`
    <defs>
      <pattern id="cells" width="${step}" height="${step}" patternUnits="userSpaceOnUse" x="${w / 2}" y="${h / 2}">
        <path d="M${step} 0H0V${step}" fill="none" stroke="${light}" stroke-opacity="0.28" stroke-width="${s * 0.0018}" />
      </pattern>
      ${radial(
        'fade',
        [0.5, 0.5, 0.7],
        [
          { offset: 0.35, color: '#ffffff' },
          { offset: 1, color: '#ffffff', opacity: 0 },
        ],
      )}
      <mask id="edge">${cover(frame, 'url(#fade)')}</mask>
      ${radial(
        'glow',
        [0.5, 0.5, 0.5],
        [
          { offset: 0, color: light, opacity: 0.55 },
          { offset: 1, color: light, opacity: 0 },
        ],
      )}
    </defs>
    ${cover(frame, shade(deep, 0.5))}
    ${cover(frame, 'url(#glow)')}
    ${cover(frame, 'url(#cells)', 'edge')}`;
};

export const beams: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const origin: Point = [-w * 0.05, -h * 0.15];
  const far = Math.hypot(w, h) * 1.6;
  const toward = (angle: number): Point => [
    origin[0] + far * Math.cos(angle),
    origin[1] + far * Math.sin(angle),
  ];
  const rays = Array.from({ length: RAY_COUNT }, (_, ray) => {
    const start = (8 + ray * 9) * DEGREES;
    const end = start + (2.2 + (ray % 3)) * DEGREES;
    const [ax, ay] = toward(start);
    const [bx, by] = toward(end);
    return svg`<path d="M${origin[0]} ${origin[1]}L${ax} ${ay}L${bx} ${by}Z" fill-opacity="${0.08 + (ray % 2) * 0.06}" />`;
  }).join('');
  return svg`
    <defs>
      ${blur('soft', frame, s * 0.012)}
      ${radial(
        'source',
        [0, 0, 0.8],
        [
          { offset: 0, color: tint(light, 0.3), opacity: 0.65 },
          { offset: 1, color: light, opacity: 0 },
        ],
      )}
    </defs>
    ${cover(frame, shade(deep, 0.5))}
    ${cover(frame, 'url(#source)')}
    <g fill="${light}" filter="url(#soft)">${rays}</g>`;
};
