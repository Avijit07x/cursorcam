import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadStyle, parseStyle } from '../../../src/config/style.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('style', () => {
  const dir = useTempDir();

  it('fills in a polished default look', async () => {
    expect(await loadStyle(undefined)).toEqual({
      format: 'landscape',
      background: 'aurora',
      padding: 0.06,
      radius: 14,
      shadow: 0.45,
      browserBar: true,
      cursor: { show: true, size: 1, ripple: true },
      zoom: { enabled: true, max: 2, hold: 0 },
      dialogs: true,
      trimIdle: true,
    });
  });

  it('reads inline JSON and files, and keeps nested defaults', async () => {
    const inline = await loadStyle('{ "background": "#101820", "zoom": { "max": 1.5 } }');
    expect(inline.background).toBe('#101820');
    expect(inline.zoom).toEqual({ enabled: true, max: 1.5, hold: 0 });

    const file = join(dir.path(), 'style.json');
    await writeFile(
      file,
      JSON.stringify({ background: { from: '#000000', to: '#ffffff' }, urlBar: false }),
    );
    expect(await loadStyle(file)).toMatchObject({
      background: { from: '#000000', to: '#ffffff', angle: 135 },
      urlBar: false,
    });
  });

  it('finds a background image next to the style file, or in the current folder', async () => {
    await mkdir(join(dir.path(), 'brand'));
    await writeFile(join(dir.path(), 'brand', 'bg.png'), 'png');
    const file = join(dir.path(), 'brand', 'style.json');
    await writeFile(file, JSON.stringify({ background: { image: 'bg.png' } }));
    expect((await loadStyle(file)).background).toEqual({
      image: join(dir.path(), 'brand', 'bg.png'),
    });

    const inline = await loadStyle(
      JSON.stringify({ background: { image: join(dir.path(), 'brand', 'bg.png') } }),
    );
    expect(inline.background).toEqual({ image: join(dir.path(), 'brand', 'bg.png') });
  });

  it('refuses a missing background image or a file that is not an image', async () => {
    const file = join(dir.path(), 'style.json');
    await writeFile(file, JSON.stringify({ background: { image: 'missing.png' } }));
    await expect(loadStyle(file)).rejects.toMatchObject({
      exitCode: ExitCode.BadInput,
      hint: 'A relative path starts from the folder of the style file.',
    });
    await expect(loadStyle('{ "background": { "image": "nope.webp" } }')).rejects.toMatchObject({
      hint: 'A relative path starts from the current folder.',
    });
    await expect(loadStyle(JSON.stringify({ background: { image: file } }))).rejects.toThrow(
      'is not a PNG, JPEG or WebP file',
    );
  });

  it('takes a scene with a palette name or two colors, and indigo by default', () => {
    expect(parseStyle({ background: { scene: 'glow' } }, 'x').background).toEqual({
      scene: 'glow',
      colors: 'indigo',
    });
    expect(
      parseStyle({ background: { scene: 'dunes', colors: ['#1e3a8a', '#38bdf8'] } }, 'x')
        .background,
    ).toEqual({ scene: 'dunes', colors: ['#1e3a8a', '#38bdf8'] });
    expect(() => parseStyle({ background: { scene: 'stars' } }, 'x')).toThrow('background');
    expect(() => parseStyle({ background: { scene: 'mesh', colors: ['#ffffff'] } }, 'x')).toThrow(
      'background',
    );
    expect(() => parseStyle({ background: { scene: 'mesh', colors: 'neon' } }, 'x')).toThrow(
      'background',
    );
  });

  it('explains bad styles', async () => {
    expect(() => parseStyle({ background: 'neon' }, 'x')).toThrow('The style from x has errors');
    expect(() => parseStyle({ zoom: { max: 9 } }, 'x')).toThrow('zoom');
    await expect(loadStyle('{ nope')).rejects.toThrow('is not valid JSON');
    await expect(loadStyle(join(dir.path(), 'missing.json'))).rejects.toThrow(
      'Could not read the style file',
    );
  });
});
