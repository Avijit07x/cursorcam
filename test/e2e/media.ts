import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;

export async function hasTool(name: string): Promise<boolean> {
  return run(name, ['-version']).then(
    () => true,
    () => false,
  );
}

export async function probe(file: string): Promise<Record<string, string>> {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-count_frames',
    '-show_entries',
    'stream=codec_name,profile,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,r_frame_rate,nb_read_frames',
    '-of',
    'default=nw=1',
    file,
  ]);
  return Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map((line) => line.split('=') as [string, string]),
  );
}

export async function decodeErrors(file: string): Promise<string> {
  const { stderr } = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], {
    maxBuffer: MAX_BUFFER,
  });
  return stderr.trim();
}

export async function frameRgb(file: string, seconds: number): Promise<Buffer> {
  const { stdout } = await run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(seconds),
      '-i',
      file,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    { encoding: 'buffer', maxBuffer: MAX_BUFFER },
  );
  return stdout;
}

export async function topLevelBoxes(file: string): Promise<string[]> {
  const data = await readFile(file);
  const boxes: string[] = [];
  let offset = 0;
  while (offset + 8 <= data.length) {
    let size = data.readUInt32BE(offset);
    boxes.push(data.toString('latin1', offset + 4, offset + 8));
    if (size === 1) size = Number(data.readBigUInt64BE(offset + 8));
    if (size === 0) break;
    offset += size;
  }
  return boxes;
}
