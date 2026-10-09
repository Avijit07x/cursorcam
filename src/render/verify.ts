import { stat } from 'node:fs/promises';
import { ALL_FORMATS, FilePathSource, Input } from 'mediabunny';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

export interface VideoFacts {
  readonly codec: string | null;
  readonly width: number;
  readonly height: number;
  readonly seconds: number;
  readonly frames: number;
  readonly bytes: number;
}

export interface ExpectedVideo {
  readonly width: number;
  readonly height: number;
  readonly frames: number;
}

export async function readVideoFacts(file: string): Promise<VideoFacts> {
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(file) });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('The file has no video track.');
    const stats = await track.computePacketStats();
    return {
      codec: await track.getCodec(),
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      seconds: await input.computeDuration(),
      frames: stats.packetCount,
      bytes: (await stat(file)).size,
    };
  } finally {
    input.dispose();
  }
}

export async function verifyVideo(file: string, expected: ExpectedVideo): Promise<VideoFacts> {
  let facts: VideoFacts;
  try {
    facts = await readVideoFacts(file);
  } catch (error) {
    throw new CursorCamError('The finished video could not be read back.', {
      exitCode: ExitCode.EncodeFailed,
      cause: error,
    });
  }
  const problems = [
    facts.width === expected.width && facts.height === expected.height
      ? undefined
      : `size ${facts.width}×${facts.height} instead of ${expected.width}×${expected.height}`,
    facts.frames === expected.frames
      ? undefined
      : `${facts.frames} frames instead of ${expected.frames}`,
  ].filter((problem) => problem !== undefined);
  if (problems.length > 0) {
    throw new CursorCamError(`The finished video is wrong: ${problems.join(', ')}.`, {
      exitCode: ExitCode.EncodeFailed,
    });
  }
  return facts;
}
