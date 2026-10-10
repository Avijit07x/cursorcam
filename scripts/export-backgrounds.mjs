import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IDENTITIES } from '../dist/browser/identity.js';
import { PALETTE_NAMES, SCENES } from '../dist/config/scenes.js';
import { parseStyle } from '../dist/config/style.js';
import { computeLayout } from '../dist/render/layout.js';
import { sceneSvg } from '../dist/render/scene/index.js';
import { frameOf } from '../dist/render/scene/svg.js';

const OUT_DIR = join(import.meta.dirname, '..', 'site', 'public', 'backgrounds');
const SIZE = { width: 1920, height: 1080 };

const style = parseStyle({}, 'the defaults');
const frame = frameOf(SIZE, computeLayout(SIZE, IDENTITIES.desktop.viewport, style));

await mkdir(OUT_DIR, { recursive: true });
const files = SCENES.flatMap((scene) =>
  PALETTE_NAMES.map((palette) => ({
    name: `${scene}-${palette}.svg`,
    svg: sceneSvg(scene, palette, frame),
  })),
);
await Promise.all(files.map(({ name, svg }) => writeFile(join(OUT_DIR, name), `${svg}\n`)));
console.log(`Saved ${files.length} backgrounds to ${OUT_DIR}`);
