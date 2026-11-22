import type { Box, CropBox } from '../job.js';

interface WindowTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export function windowTransform(crop: CropBox, content: Box, pageWidth: number): WindowTransform {
  const [cropX, cropY, cropWidth, cropHeight] = crop;
  const scale = pageWidth / cropWidth;
  return {
    scale,
    x: content.x * (1 - scale) - (cropX * content.width) / cropWidth,
    y: content.y * (1 - scale) - (cropY * content.height) / cropHeight,
  };
}

export function shownPart(
  box: Box,
  transform: WindowTransform,
  frame: { readonly width: number; readonly height: number },
): Box {
  const x = Math.max(0, box.x * transform.scale + transform.x);
  const y = Math.max(0, box.y * transform.scale + transform.y);
  const right = Math.min(frame.width, (box.x + box.width) * transform.scale + transform.x);
  const bottom = Math.min(frame.height, (box.y + box.height) * transform.scale + transform.y);
  return { x, y, width: right - x, height: bottom - y };
}
