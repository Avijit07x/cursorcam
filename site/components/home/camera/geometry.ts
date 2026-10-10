const DEGREES = 180 / Math.PI;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function polar(angle: number, radius: number) {
  const sin = Math.sin(angle / DEGREES);
  const cos = Math.cos(angle / DEGREES);
  return { x: sin * radius, y: -cos * radius, sin, cos };
}

export function pointerAround(element: Element, x: number, y: number) {
  const box = element.getBoundingClientRect();
  const dx = x - (box.left + box.width / 2);
  const dy = box.top + box.height / 2 - y;
  return { angle: Math.atan2(dx, dy) * DEGREES, distance: Math.hypot(dx, dy) };
}
