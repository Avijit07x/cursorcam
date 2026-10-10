import { clamp, type Size } from '../../shared/geometry.js';
import type { Box, JobLayout } from '../job.js';

export type Point = readonly [number, number];

export interface Tones {
  readonly deep: string;
  readonly light: string;
}

export interface Frame {
  readonly width: number;
  readonly height: number;
  readonly short: number;
  readonly window: Box;
  readonly radius: number;
  readonly side: boolean;
  readonly band: number;
  readonly gap: number;
}

export type Draw = (frame: Frame, tones: Tones) => string;

interface Shadow {
  readonly dx?: number;
  readonly dy: number;
  readonly spread: number;
  readonly color: string;
  readonly opacity: number;
}

interface Stop {
  readonly offset: number;
  readonly color: string;
  readonly opacity?: number;
}

const PLACES = 100;
const CURVE_PULL = 6;

export function frameOf(size: Size, layout: Pick<JobLayout, 'window' | 'radius'>): Frame {
  const { x, y } = layout.window;
  const side = x >= y;
  return {
    width: size.width,
    height: size.height,
    short: Math.min(size.width, size.height),
    window: layout.window,
    radius: layout.radius,
    side,
    band: side ? x : y,
    gap: Math.min(x, y),
  };
}

function format(value: unknown): string {
  return typeof value === 'number' ? String(Math.round(value * PLACES) / PLACES) : String(value);
}

export function svg(strings: TemplateStringsArray, ...values: readonly unknown[]): string {
  return strings.reduce(
    (out, text, index) => out + text + (index < values.length ? format(values[index]) : ''),
    '',
  );
}

function channels(color: string): [number, number, number] {
  const hex = color.slice(1);
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const value = Number.parseInt(full, 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

export function mix(from: string, to: string, amount: number): string {
  const [red, green, blue] = channels(from);
  const [toRed, toGreen, toBlue] = channels(to);
  const blend = (start: number, end: number) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${blend(red, toRed)}${blend(green, toGreen)}${blend(blue, toBlue)}`;
}

export function shade(color: string, amount: number): string {
  return mix(color, '#000000', amount);
}

export function tint(color: string, amount: number): string {
  return mix(color, '#ffffff', amount);
}

function pair([x, y]: Point): string {
  return svg`${x} ${y}`;
}

export function curve(points: readonly Point[], closed = false): string {
  const count = points.length;
  const at = (index: number): Point => {
    const point = points[closed ? (index + count) % count : clamp(index, 0, count - 1)];
    if (!point) throw new Error('A curve needs at least two points.');
    return point;
  };
  const segments = closed ? count : count - 1;
  let path = `M${pair(at(0))}`;
  for (let index = 0; index < segments; index += 1) {
    const before = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const after = at(index + 2);
    const pull: Point = [
      from[0] + (to[0] - before[0]) / CURVE_PULL,
      from[1] + (to[1] - before[1]) / CURVE_PULL,
    ];
    const push: Point = [
      to[0] - (after[0] - from[0]) / CURVE_PULL,
      to[1] - (after[1] - from[1]) / CURVE_PULL,
    ];
    path += `C${pair(pull)} ${pair(push)} ${pair(to)}`;
  }
  return closed ? `${path}Z` : path;
}

function region(frame: Frame): string {
  return svg`filterUnits="userSpaceOnUse" x="${-frame.width}" y="${-frame.height}" width="${3 * frame.width}" height="${3 * frame.height}" color-interpolation-filters="sRGB"`;
}

export function blur(id: string, frame: Frame, amount: number): string {
  return svg`<filter id="${id}" ${region(frame)}><feGaussianBlur stdDeviation="${amount}" /></filter>`;
}

export function shadow(id: string, frame: Frame, look: Shadow): string {
  const { dx = 0, dy, spread, color, opacity } = look;
  return svg`<filter id="${id}" ${region(frame)}><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${spread}" flood-color="${color}" flood-opacity="${opacity}" /></filter>`;
}

function stops(marks: readonly Stop[]): string {
  return marks
    .map(
      ({ offset, color, opacity = 1 }) =>
        svg`<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}" />`,
    )
    .join('');
}

export function linear(
  id: string,
  from: string,
  to: string,
  [x1, y1, x2, y2]: readonly [number, number, number, number] = [0, 0, 1, 1],
): string {
  return svg`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops([
    { offset: 0, color: from },
    { offset: 1, color: to },
  ])}</linearGradient>`;
}

export function radial(
  id: string,
  [cx, cy, r]: readonly [number, number, number],
  marks: readonly Stop[],
): string {
  return svg`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(marks)}</radialGradient>`;
}

export function cover(frame: Frame, paint: string, mask?: string): string {
  const masked = mask ? svg` mask="url(#${mask})"` : '';
  return svg`<rect width="${frame.width}" height="${frame.height}" fill="${paint}"${masked} />`;
}
