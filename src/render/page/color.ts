const KR = 0.2126;
const KB = 0.0722;
const KG = 1 - KR - KB;
const LUMA_OFFSET = 16;
const LUMA_RANGE = 219;
const CHROMA_OFFSET = 128;
const CHROMA_RANGE = 224;
const MAX_CHANNEL = 255;
const ROUNDING = 0.5;
const CHANNELS = 4;

const Y_R = (LUMA_RANGE * KR) / MAX_CHANNEL;
const Y_G = (LUMA_RANGE * KG) / MAX_CHANNEL;
const Y_B = (LUMA_RANGE * KB) / MAX_CHANNEL;
const U_R = (-CHROMA_RANGE * KR) / (2 * (1 - KB)) / MAX_CHANNEL;
const U_G = (-CHROMA_RANGE * KG) / (2 * (1 - KB)) / MAX_CHANNEL;
const U_B = CHROMA_RANGE / 2 / MAX_CHANNEL;
const V_R = CHROMA_RANGE / 2 / MAX_CHANNEL;
const V_G = (-CHROMA_RANGE * KG) / (2 * (1 - KR)) / MAX_CHANNEL;
const V_B = (-CHROMA_RANGE * KB) / (2 * (1 - KR)) / MAX_CHANNEL;

export const LIMITED_BT709 = {
  primaries: 'bt709',
  transfer: 'bt709',
  matrix: 'bt709',
  fullRange: false,
} as const;

export function i420Size(width: number, height: number): number {
  return width * height + 2 * (width / 2) * (height / 2);
}

export function rgbaToI420(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  out: Uint8Array,
): void {
  const lumaSize = width * height;
  const chromaWidth = width / 2;
  const uStart = lumaSize;
  const vStart = lumaSize + lumaSize / 4;
  const rowBytes = width * CHANNELS;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const a = (y * width + x) * CHANNELS;
      const b = a + CHANNELS;
      const c = a + rowBytes;
      const d = c + CHANNELS;
      const r0 = rgba[a] ?? 0;
      const g0 = rgba[a + 1] ?? 0;
      const b0 = rgba[a + 2] ?? 0;
      const r1 = rgba[b] ?? 0;
      const g1 = rgba[b + 1] ?? 0;
      const b1 = rgba[b + 2] ?? 0;
      const r2 = rgba[c] ?? 0;
      const g2 = rgba[c + 1] ?? 0;
      const b2 = rgba[c + 2] ?? 0;
      const r3 = rgba[d] ?? 0;
      const g3 = rgba[d + 1] ?? 0;
      const b3 = rgba[d + 2] ?? 0;
      const top = y * width + x;
      const bottom = top + width;
      out[top] = LUMA_OFFSET + ROUNDING + Y_R * r0 + Y_G * g0 + Y_B * b0;
      out[top + 1] = LUMA_OFFSET + ROUNDING + Y_R * r1 + Y_G * g1 + Y_B * b1;
      out[bottom] = LUMA_OFFSET + ROUNDING + Y_R * r2 + Y_G * g2 + Y_B * b2;
      out[bottom + 1] = LUMA_OFFSET + ROUNDING + Y_R * r3 + Y_G * g3 + Y_B * b3;
      const red = (r0 + r1 + r2 + r3) / 4;
      const green = (g0 + g1 + g2 + g3) / 4;
      const blue = (b0 + b1 + b2 + b3) / 4;
      const chroma = (y / 2) * chromaWidth + x / 2;
      out[uStart + chroma] = CHROMA_OFFSET + ROUNDING + U_R * red + U_G * green + U_B * blue;
      out[vStart + chroma] = CHROMA_OFFSET + ROUNDING + V_R * red + V_G * green + V_B * blue;
    }
  }
}
