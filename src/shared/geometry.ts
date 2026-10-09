export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export function centerOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function lerpPoint(from: Point, to: Point, progress: number): Point {
  return { x: lerp(from.x, to.x, progress), y: lerp(from.y, to.y, progress) };
}

export function easeInOutCubic(progress: number): number {
  const t = clamp(progress, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function intersect(a: Rect, b: Rect): Rect | undefined {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= x || bottom <= y) return undefined;
  return { x, y, width: right - x, height: bottom - y };
}

export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
