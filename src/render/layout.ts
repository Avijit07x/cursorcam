import type { Size } from '../shared/geometry.js';
import type { JobLayout } from './job.js';

export interface LayoutStyle {
  readonly padding: number;
  readonly radius: number;
  readonly shadow: number;
  readonly browserBar: boolean;
}

const BAR_CSS_PX = 38;
const BASE_SHORT_SIDE = 1080;

export function fullFrameSize(box: Size, viewport: Size): Size {
  const scale = Math.min(box.width / viewport.width, box.height / viewport.height);
  return { width: even(viewport.width * scale), height: even(viewport.height * scale) };
}

export function fullFrameLayout(size: Size): JobLayout {
  const frame = { x: 0, y: 0, width: size.width, height: size.height };
  return { window: frame, content: frame, bar: null, radius: 0, shadow: 0 };
}

// H.264 needs even sides.
function even(value: number): number {
  return 2 * Math.round(value / 2);
}

export function computeLayout(output: Size, viewport: Size, style: LayoutStyle): JobLayout {
  const shortSide = Math.min(output.width, output.height);
  const padding = Math.round(shortSide * style.padding);
  const room = { width: output.width - 2 * padding, height: output.height - 2 * padding };
  const barCss = style.browserBar ? BAR_CSS_PX : 0;
  const width = Math.min(room.width, (room.height * viewport.width) / (viewport.height + barCss));
  const scale = width / viewport.width;
  const windowWidth = Math.round(width);
  const barHeight = Math.round(barCss * scale);
  const contentHeight = Math.round(viewport.height * scale);
  const x = Math.round((output.width - windowWidth) / 2);
  const y = Math.round((output.height - contentHeight - barHeight) / 2);
  return {
    window: { x, y, width: windowWidth, height: contentHeight + barHeight },
    content: { x, y: y + barHeight, width: windowWidth, height: contentHeight },
    bar: barHeight > 0 ? { x, y, width: windowWidth, height: barHeight } : null,
    radius: Math.round((style.radius * shortSide) / BASE_SHORT_SIDE),
    shadow: style.shadow,
  };
}
