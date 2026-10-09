import {
  canEncodeVideo,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSample,
  VideoSampleSource,
  type StreamTargetChunk,
} from 'mediabunny';
import type { JobOutput, VideoCodecName } from '../job.js';
import { LIMITED_BT709 } from './color.js';

const PACKET_MARGIN = 2;
const CODECS: readonly VideoCodecName[] = ['avc', 'vp9'];

export interface EncoderHandle {
  readonly codec: VideoCodecName;
  add(data: Uint8Array, index: number): Promise<void>;
  finish(): Promise<void>;
  cancel(): Promise<void>;
}

export async function openEncoder(
  output: JobOutput,
  write: (chunk: StreamTargetChunk) => Promise<void>,
): Promise<EncoderHandle> {
  const codec = await pickCodec(output);
  const muxer = new Output({
    format: new Mp4OutputFormat({ fastStart: 'reserve' }),
    target: new StreamTarget(new WritableStream<StreamTargetChunk>({ write })),
  });
  const source = new VideoSampleSource({
    codec,
    quality: new Quality({ bitrate: output.bitrate, bitrateMode: 'variable' }),
    keyFrameInterval: output.keyFrameSeconds,
  });
  muxer.addVideoTrack(source, {
    frameRate: output.fps,
    maximumPacketCount: output.frameCount + PACKET_MARGIN,
  });
  await muxer.start();

  return {
    codec,
    add: async (data, index) => {
      const sample = new VideoSample(data, {
        format: 'I420',
        codedWidth: output.width,
        codedHeight: output.height,
        timestamp: index / output.fps,
        duration: 1 / output.fps,
        colorSpace: LIMITED_BT709,
      });
      try {
        await source.add(sample);
      } finally {
        sample.close();
      }
    },
    finish: () => muxer.finalize(),
    cancel: () => muxer.cancel(),
  };
}

async function pickCodec(output: JobOutput): Promise<VideoCodecName> {
  const options = { width: output.width, height: output.height, bitrate: output.bitrate };
  for (const codec of CODECS) {
    if (await canEncodeVideo(codec, options)) return codec;
  }
  throw new Error('This browser cannot encode H.264 or VP9 video.');
}
