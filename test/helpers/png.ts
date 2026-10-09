import { crc32, deflateSync } from 'node:zlib';

export type Rgb = readonly [red: number, green: number, blue: number];

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEADER_BYTES = 13;
const BIT_DEPTH = 8;
const TRUE_COLOR = 2;
const NO_FILTER = 0;

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

export function solidPng(width: number, height: number, color: Rgb): Buffer {
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = BIT_DEPTH;
  header[9] = TRUE_COLOR;
  const row = Buffer.from([NO_FILTER, ...Array.from({ length: width }, () => color).flat()]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
