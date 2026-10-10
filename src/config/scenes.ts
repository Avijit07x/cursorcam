export const SCENES = [
  'mesh',
  'glow',
  'split',
  'dunes',
  'aurora',
  'glass',
  'ripple',
  'contours',
  'grid',
  'ribbons',
  'beams',
  'shapes',
  'halftone',
  'cursor',
] as const;

export type SceneName = (typeof SCENES)[number];

export const PALETTES = {
  indigo: ['#4f46e5', '#c7d2fe'],
  iris: ['#4f46e5', '#f0abfc'],
  ocean: ['#1e3a8a', '#38bdf8'],
  teal: ['#134e4a', '#5eead4'],
  plum: ['#3b0764', '#c084fc'],
  sunset: ['#be185d', '#fdba74'],
  graphite: ['#0f172a', '#64748b'],
  peach: ['#fb7185', '#ffedd5'],
  paper: ['#cbd5e1', '#f8fafc'],
} as const satisfies Record<string, readonly [string, string]>;

export type PaletteName = keyof typeof PALETTES;
export type SceneColors = PaletteName | readonly [string, string];

export const PALETTE_NAMES = Object.keys(PALETTES) as [PaletteName, ...PaletteName[]];
export const DEFAULT_PALETTE: PaletteName = 'indigo';
