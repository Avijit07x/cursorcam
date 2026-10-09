export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type JobBackground =
  | { readonly kind: 'solid'; readonly color: string }
  | {
      readonly kind: 'gradient';
      readonly from: string;
      readonly to: string;
      readonly angle: number;
    }
  | { readonly kind: 'image'; readonly url: string };

export interface JobLayout {
  readonly window: Box;
  readonly content: Box;
  readonly bar: Box | null;
  readonly radius: number;
  readonly shadow: number;
}

export interface JobOutput {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly bitrate: number;
  readonly frameCount: number;
  readonly keyFrameSeconds: number;
}

export interface JobSource {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

export interface JobCursor {
  readonly kind: 'arrow' | 'touch';
  readonly size: number;
}

export interface JobDialog {
  readonly kind: string;
  readonly message: string;
}

export type CropBox = readonly [x: number, y: number, width: number, height: number];
export type CursorState = readonly [x: number, y: number, pressed: 0 | 1];
export type RippleState = readonly [x: number, y: number, progress: number];

export interface DrawFrame {
  readonly f: number;
  readonly crop: CropBox;
  readonly cursor?: CursorState;
  readonly ripples?: readonly RippleState[];
  readonly dialog?: number;
  readonly url?: number;
}

export interface RenderJob {
  readonly output: JobOutput;
  readonly source: JobSource;
  readonly layout: JobLayout;
  readonly background: JobBackground;
  readonly cursor: JobCursor | null;
  readonly dialogs: readonly JobDialog[];
  readonly urls: readonly string[];
  readonly frames: readonly DrawFrame[];
  readonly workers: number;
}

export type StillRequest =
  | { readonly kind: 'composite'; readonly name: string; readonly frame: DrawFrame }
  | { readonly kind: 'poster'; readonly name: string; readonly frame: DrawFrame }
  | { readonly kind: 'crop'; readonly name: string; readonly f: number; readonly rect: CropBox };

export interface RenderProgress {
  readonly done: number;
  readonly total: number;
}

export type VideoCodecName = 'avc' | 'vp9';

export interface RenderSummary {
  readonly frames: number;
  readonly ms: number;
  readonly codec: VideoCodecName;
}

export interface RenderApi {
  cursorCamRender(): Promise<RenderSummary>;
  cursorCamStills(requests: readonly StillRequest[]): Promise<number>;
}
