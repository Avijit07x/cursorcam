import { EXAMPLE_REQUEST } from '@/lib/commands';

interface Preset {
  readonly name: string;
  readonly flag: string;
  readonly size: string;
  readonly res: string;
  readonly fps: number;
  readonly limit: string;
}

const DEFAULT_PRESET: Preset = {
  name: 'Default',
  flag: 'No flag needed',
  size: '1920×1080',
  res: '1080p',
  fps: 60,
  limit: 'Any length',
};

export const PRESETS: readonly Preset[] = [
  DEFAULT_PRESET,
  {
    name: 'YouTube',
    flag: '--for youtube',
    size: '1920×1080',
    res: '1080p',
    fps: 60,
    limit: 'Any length',
  },
  { name: 'X', flag: '--for x', size: '1920×1080', res: '1080p', fps: 30, limit: 'Up to 140 s' },
  {
    name: 'LinkedIn',
    flag: '--for linkedin',
    size: '1920×1080',
    res: '1080p',
    fps: 30,
    limit: '3 s to 15 min',
  },
  {
    name: 'Discord',
    flag: '--for discord',
    size: '1280×720',
    res: '720p',
    fps: 30,
    limit: 'Under 20 MB',
  },
];

export const LAST_PRESET = PRESETS.length - 1;

export const presetAt = (index: number) => PRESETS[index] ?? DEFAULT_PRESET;

export const SHAPES = {
  wide: {
    label: 'Wide',
    name: 'Wide 16:9',
    words: '',
    note: '1920×1080',
    width: '100%',
    icon: 'h-3.5 w-6',
  },
  square: {
    label: 'Square',
    name: 'Square 1:1',
    words: ', as a square video',
    note: '1080×1080, from any recording',
    width: '56.25%',
    icon: 'size-4',
  },
  tall: {
    label: 'Tall',
    name: 'Tall 9:16',
    words: ', on a phone, as a vertical video',
    note: '1080×1920, needs a phone recording',
    width: '31.640625%',
    icon: 'h-4.75 w-2.75',
  },
} as const;

export type ShapeKey = keyof typeof SHAPES;

export const SHAPE_KEYS = Object.keys(SHAPES) as ShapeKey[];

export const ZOOM = { min: 13, max: 25, start: 20, marks: [13, 20, 25] } as const;

export const TIPS = ['Try the knobs!', 'Now press Ask Claude!', 'Snap! Copy it below.'] as const;
export const TIP_TOUCHED = 1;
export const TIP_SNAPPED = 2;

const TENTHS = 10;

export const zoomScale = (tenths: number) => tenths / TENTHS;

export const zoomText = (tenths: number) => `${zoomScale(tenths).toFixed(1)}×`;

export interface CameraSettings {
  readonly preset: number;
  readonly shape: ShapeKey;
  readonly zoom: number;
}

export const START_SETTINGS: CameraSettings = { preset: 0, shape: 'wide', zoom: ZOOM.start };

export function buildRequest({ preset, shape, zoom }: CameraSettings) {
  const forWords = preset > 0 ? `, for ${presetAt(preset).name}` : '';
  const zoomWords = zoom === ZOOM.start ? '' : `, zoom up to ${zoomScale(zoom)}×`;
  return `${EXAMPLE_REQUEST}${forWords}${SHAPES[shape].words}${zoomWords}`;
}

export function settingChips({ preset, shape, zoom }: CameraSettings) {
  return [
    preset > 0 ? `For ${presetAt(preset).name}` : 'Default size',
    SHAPES[shape].name,
    `Up to ${zoomText(zoom)} zoom`,
  ];
}

export function screenNote({ preset, shape }: CameraSettings) {
  const parts: string[] = [];
  if (preset > 0) parts.push(`Made for ${presetAt(preset).name}`);
  if (shape === 'tall') parts.push('Needs a phone recording');
  return parts.join(' · ');
}
