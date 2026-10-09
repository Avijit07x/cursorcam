export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

const MARKER_PREFIX = 0xff;
const FIRST_SEGMENT_OFFSET = 2;
const START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const HEIGHT_OFFSET = 5;
const WIDTH_OFFSET = 7;

export function jpegSize(data: Buffer): ImageSize | undefined {
  let offset = FIRST_SEGMENT_OFFSET;
  while (offset + WIDTH_OFFSET + 2 <= data.length) {
    if (data[offset] !== MARKER_PREFIX) return undefined;
    const marker = data[offset + 1] ?? 0;
    if (START_OF_FRAME_MARKERS.has(marker)) {
      return {
        width: data.readUInt16BE(offset + WIDTH_OFFSET),
        height: data.readUInt16BE(offset + HEIGHT_OFFSET),
      };
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  return undefined;
}
