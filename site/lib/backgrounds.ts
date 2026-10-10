import type { PaletteName, SceneName } from '@cursorcam/scenes';

export const backgroundUrl = (scene: SceneName, palette: PaletteName) =>
  `/backgrounds/${scene}-${palette}.svg`;

export const backgroundStyle = (scene: SceneName, palette: PaletteName) =>
  `{ "background": { "scene": "${scene}", "colors": "${palette}" } }`;
