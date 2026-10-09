import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseSteps } from '../../src/config/load-steps.js';
import { findPreset } from '../../src/config/presets.js';
import { parseStyle } from '../../src/config/style.js';
import { recordSteps } from '../../src/record/recorder.js';
import { computeLayout } from '../../src/render/layout.js';
import { renderStills, renderVideo, type RenderOutcome } from '../../src/render/renderer.js';
import { createRunDirs, META_FILE, type RunFile } from '../../src/runs/dirs.js';
import { StatusFile } from '../../src/runs/status.js';
import { CursorCamError } from '../../src/shared/errors.js';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { jpegSize } from '../../src/shared/jpeg.js';
import { removeDir } from '../../src/system/cleanup.js';
import { Lifecycle } from '../../src/system/lifecycle.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { browserAvailable, CI_SLOWDOWN, useTempCache } from './helpers.js';
import { decodeErrors, frameRgb, hasTool, probe, topLevelBoxes } from './media.js';
import { FIXTURE_DIR } from './recorder-helpers.js';

const COLOR_TOLERANCE = 6;
const BANDS = ['ff0000', '00ff00', '0000ff', 'ffffff', '000000', '808080', '112233', '6366f1'];
const QUIET_STYLE = { zoom: { enabled: false }, cursor: { show: false }, trimIdle: false };
const RENDER_SPEED_LIMIT = 2 * CI_SLOWDOWN;

interface Recorded {
  readonly run: RunFile;
  readonly outDir: string;
}

describe.skipIf(!browserAvailable())('rendering', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const out = useTempDir('all');
  let ffmpeg = false;
  const runs = new Map<string, Recorded>();

  const record = async (name: string, steps: object): Promise<void> => {
    const plan = parseSteps(steps, join(FIXTURE_DIR, 'steps.json'), {});
    const paths = cache.paths();
    const dirs = await createRunDirs(name, out.path(), paths.cache, true);
    const lifecycle = new Lifecycle();
    try {
      await recordSteps({
        plan,
        paths,
        dirs,
        mode: 'record',
        lifecycle,
        status: new StatusFile(dirs.outDir),
      });
    } finally {
      await lifecycle.dispose();
    }
    const run: RunFile = {
      id: dirs.id,
      cacheDir: dirs.cacheDir,
      url: plan.header.url,
      viewport: plan.header.viewport,
      createdAt: '',
    };
    runs.set(name, { run, outDir: dirs.outDir });
  };

  const render = async (
    name: string,
    style: object = {},
    extra: { presetName?: string; maxBytes?: number } = {},
  ) => {
    const recorded = runs.get(name);
    if (!recorded) throw new Error(`No recording named ${name}`);
    const lifecycle = new Lifecycle();
    try {
      return await renderVideo({
        ...recorded,
        style: parseStyle(style, 'test'),
        paths: cache.paths(),
        lifecycle,
        ...extra,
      });
    } finally {
      await lifecycle.dispose();
    }
  };

  const renderFails = async (
    name: string,
    style: object,
    presetName?: string,
  ): Promise<CursorCamError> => {
    const error = await render(name, style, presetName ? { presetName } : {}).then(
      () => undefined,
      (failure: unknown) => failure,
    );
    expect(error).toBeInstanceOf(CursorCamError);
    return error as CursorCamError;
  };

  const cutShort = async (name: string, copy: string): Promise<void> => {
    const recorded = runs.get(name);
    if (!recorded) throw new Error(`No recording named ${name}`);
    const cacheDir = `${recorded.run.cacheDir}-${copy}`;
    await cp(recorded.run.cacheDir, cacheDir, { recursive: true });
    const metaFile = join(cacheDir, META_FILE);
    const meta = JSON.parse(await readFile(metaFile, 'utf8')) as object;
    await writeFile(metaFile, JSON.stringify({ ...meta, durationMs: 0 }));
    runs.set(copy, { ...recorded, run: { ...recorded.run, cacheDir } });
  };

  beforeAll(async () => {
    ffmpeg = (await hasTool('ffprobe')) && (await hasTool('ffmpeg'));
    await record('flow', {
      url: site.url('/basics.html'),
      steps: [
        { click: "role=button[name='Get started']" },
        { type: 'alex@example.com', into: 'label=Email' },
        { click: 'text=Go to second page' },
        { waitFor: '#loaded' },
      ],
    });
    await record('colors', { url: site.url('/colors.html'), steps: [{ pause: 600 }] });
    await record('phone', {
      url: site.url('/phone.html'),
      viewport: 'phone',
      steps: [{ click: "role=button[name='Menu']" }, { pause: 300 }],
    });
  }, 120_000);

  it('makes a 1080p60 H.264 file that checks out on its own and in a second tool', async () => {
    const started = performance.now();
    const outcome = await render('flow');
    const renderSeconds = (performance.now() - started) / 1000;

    expect(outcome.codec).toBe('avc');
    expect(outcome.facts).toMatchObject({
      codec: 'avc',
      width: 1920,
      height: 1080,
      frames: outcome.job.output.frameCount,
    });
    expect(renderSeconds).toBeLessThan(outcome.facts.seconds * RENDER_SPEED_LIMIT);
    expect(await topLevelBoxes(outcome.file)).toEqual(['ftyp', 'moov', 'free', 'mdat']);
    expect((await readFile(outcome.file)).includes('edts')).toBe(false);
    if (!ffmpeg) return;
    expect(await probe(outcome.file)).toEqual({
      codec_name: 'h264',
      profile: 'High',
      width: '1920',
      height: '1080',
      pix_fmt: 'yuv420p',
      color_range: 'tv',
      color_space: 'bt709',
      color_transfer: 'bt709',
      color_primaries: 'bt709',
      r_frame_rate: '60/1',
      nb_read_frames: String(outcome.job.output.frameCount),
    });
    expect(await decodeErrors(outcome.file)).toBe('');
  });

  it('keeps colors within tolerance through the limited-range pipeline', async () => {
    const outcome = await render('colors', QUIET_STYLE);
    if (!ffmpeg) return;
    const { width } = outcome.job.output;
    const pixels = await frameRgb(outcome.file, outcome.facts.seconds / 2);
    const { content } = computeLayout(
      { width, height: 1080 },
      { width: 1280, height: 800 },
      parseStyle(QUIET_STYLE, 'test'),
    );
    const misses = BANDS.flatMap((hex, band) => {
      const x = Math.round(content.x + (content.width * (band + 0.5)) / BANDS.length);
      const y = Math.round(content.y + content.height / 2);
      const offset = (y * width + x) * 3;
      const expected = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
      const actual = [...pixels.subarray(offset, offset + 3)];
      const worst = Math.max(
        ...expected.map((value, channel) => Math.abs(value - (actual[channel] ?? 0))),
      );
      return worst > COLOR_TOLERANCE ? [`#${hex} came out as ${actual.join(',')}`] : [];
    });

    expect(misses).toEqual([]);
  });

  it('meets every preset rule', async () => {
    const x = await render('flow', {}, { presetName: 'x' });
    expect(x.facts).toMatchObject({ width: 1920, height: 1080 });
    expect(x.job.output.fps).toBe(30);

    const discord = await render('flow', {}, { presetName: 'discord' });
    expect(discord.facts).toMatchObject({ width: 1280, height: 720 });
    expect(discord.facts.bytes).toBeLessThanOrEqual(findPreset('discord').maxBytes ?? 0);

    const tight = await render('flow', {}, { maxBytes: 600_000 });
    expect(tight.facts.bytes).toBeLessThanOrEqual(600_000);

    await cutShort('colors', 'short');
    const short = await renderFails('short', {}, 'linkedin');
    expect(short).toMatchObject({
      exitCode: ExitCode.BadInput,
      message: expect.stringContaining('needs at least 3 s') as string,
    });
  });

  it('makes square and vertical videos, and refuses vertical from a desktop recording', async () => {
    const square = await render('flow', { format: 'square' });
    expect(square.facts).toMatchObject({ width: 1080, height: 1080 });
    expect(square.file.endsWith('video-square.mp4')).toBe(true);

    const vertical = await render('phone', { format: 'vertical' });
    expect(vertical.facts).toMatchObject({ width: 1080, height: 1920 });

    const refused = await renderFails('flow', { format: 'vertical' });
    expect(refused.message).toBe('Vertical videos need a phone recording.');
  });

  it('saves stills at output size and sharp crops of each target', async () => {
    const recorded = runs.get('flow');
    if (!recorded) throw new Error('missing recording');
    const lifecycle = new Lifecycle();
    const saved = new Map<string, Buffer>();
    try {
      await renderStills(
        {
          ...recorded,
          style: parseStyle({}, 'test'),
          paths: cache.paths(),
          lifecycle,
          count: 3,
        },
        (name, data) => {
          saved.set(name, data);
          return Promise.resolve();
        },
      );
    } finally {
      await lifecycle.dispose();
    }

    const names = [...saved.keys()];
    expect(names.filter((name) => name.startsWith('still-'))).toHaveLength(3);
    expect(names.filter((name) => name.startsWith('crop-'))).toEqual([
      'crop-01-step-01.png',
      'crop-02-step-02.png',
      'crop-03-step-03.png',
    ]);
    const still = saved.get(names[0] ?? '') ?? Buffer.alloc(0);
    expect([still.readUInt32BE(16), still.readUInt32BE(20)]).toEqual([1920, 1080]);
  });

  it('re-renders a new look without recording again, and explains when the frames are gone', async () => {
    const first: RenderOutcome = await render('colors', { background: '#000000' });
    expect(first.job.background).toEqual({ kind: 'solid', color: '#000000' });

    const recorded = runs.get('colors');
    if (!recorded) throw new Error('missing recording');
    const frame = (await readdir(join(recorded.run.cacheDir, 'frames')))[0] ?? '';
    expect(jpegSize(await readFile(join(recorded.run.cacheDir, 'frames', frame)))).toEqual({
      width: 2560,
      height: 1600,
    });
    await removeDir(join(recorded.run.cacheDir, 'frames'));
    const gone = await renderFails('colors', {});
    expect(gone.message).toBe('The raw frames for this run are gone.');
  });
});
