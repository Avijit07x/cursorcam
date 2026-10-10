import { blur, cover, type Draw, linear, mix, radial, shade, svg, tint } from './svg.js';

export const mesh: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  return svg`
    <defs>${blur('soft', frame, s * 0.14)}</defs>
    ${cover(frame, mix(deep, light, 0.5))}
    <g filter="url(#soft)">
      <circle cx="${w * 0.06}" cy="${h * 0.1}" r="${s * 0.62}" fill="${deep}" />
      <circle cx="${w * 0.98}" cy="${h * 0.04}" r="${s * 0.5}" fill="${light}" />
      <circle cx="${w * 0.92}" cy="${h}" r="${s * 0.6}" fill="${shade(deep, 0.2)}" />
      <circle cx="${w * 0.1}" cy="${h * 1.02}" r="${s * 0.48}" fill="${tint(light, 0.3)}" />
      <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${s * 0.32}" fill="${mix(deep, light, 0.3)}" />
    </g>`;
};

export const glow: Draw = (frame, { deep, light }) => svg`
  <defs>
    ${radial(
      'halo',
      [0.5, 0.5, 0.6],
      [
        { offset: 0, color: light, opacity: 0.95 },
        { offset: 0.5, color: mix(deep, light, 0.45), opacity: 0.55 },
        { offset: 1, color: deep, opacity: 0 },
      ],
    )}
    ${radial(
      'rim',
      [0.5, 0, 0.55],
      [
        { offset: 0, color: tint(light, 0.35), opacity: 0.5 },
        { offset: 1, color: light, opacity: 0 },
      ],
    )}
  </defs>
  ${cover(frame, shade(deep, 0.62))}
  ${cover(frame, 'url(#halo)')}
  ${cover(frame, 'url(#rim)')}`;

const STREAKS = [
  { x: 0.18, y: 0.3, rx: 0.07, ry: 0.5, turn: 16, tone: 'light', opacity: 0.75 },
  { x: 0.38, y: 0.18, rx: 0.05, ry: 0.38, turn: 8, tone: 'glint', opacity: 0.6 },
  { x: 0.6, y: 0.32, rx: 0.09, ry: 0.52, turn: -12, tone: 'middle', opacity: 0.85 },
  { x: 0.84, y: 0.22, rx: 0.06, ry: 0.42, turn: -20, tone: 'light', opacity: 0.7 },
] as const;

export const aurora: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s } = frame;
  const tones = { light, glint: tint(light, 0.35), middle: mix(deep, light, 0.55) };
  const streaks = STREAKS.map(
    ({ x, y, rx, ry, turn, tone, opacity }) =>
      svg`<ellipse cx="${w * x}" cy="${h * y}" rx="${w * rx}" ry="${h * ry}" fill="${tones[tone]}" opacity="${opacity}" transform="rotate(${turn} ${w * x} ${h * y})" />`,
  ).join('');
  return svg`
    <defs>
      ${linear('sky', shade(deep, 0.7), shade(deep, 0.3), [0, 0, 0, 1])}
      ${blur('soft', frame, s * 0.07)}
    </defs>
    ${cover(frame, 'url(#sky)')}
    <g filter="url(#soft)">
      ${streaks}
      <ellipse cx="${w / 2}" cy="${h * 1.08}" rx="${w * 0.7}" ry="${h * 0.24}" fill="${mix(deep, light, 0.35)}" opacity="0.8" />
    </g>`;
};

export const glass: Draw = (frame, { deep, light }) => {
  const { width: w, height: h, short: s, window, radius, gap } = frame;
  const grow = gap * 0.55;
  const panel = svg`x="${window.x - grow}" y="${window.y - grow}" width="${window.width + 2 * grow}" height="${window.height + 2 * grow}" rx="${radius + grow * 0.9}"`;
  const blobs = svg`
    <circle cx="${w * 0.16}" cy="${h * 0.22}" r="${s * 0.34}" fill="${light}" />
    <circle cx="${w * 0.86}" cy="${h * 0.8}" r="${s * 0.4}" fill="${mix(deep, light, 0.5)}" />
    <circle cx="${w * 0.78}" cy="${h * 0.12}" r="${s * 0.2}" fill="${tint(light, 0.3)}" />
    <circle cx="${w * 0.25}" cy="${h * 0.92}" r="${s * 0.22}" fill="${shade(deep, 0.1)}" />`;
  return svg`
    <defs>
      ${blur('near', frame, s * 0.035)}
      ${blur('far', frame, s * 0.09)}
      <clipPath id="panel"><rect ${panel} /></clipPath>
    </defs>
    ${cover(frame, shade(deep, 0.25))}
    <g filter="url(#near)">${blobs}</g>
    <g clip-path="url(#panel)">
      ${cover(frame, shade(deep, 0.1))}
      <g filter="url(#far)">${blobs}</g>
      <rect ${panel} fill="#ffffff" fill-opacity="0.16" />
    </g>
    <rect ${panel} fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${s * 0.0025}" />`;
};
