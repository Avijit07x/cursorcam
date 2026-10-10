import { describe, expect, it } from 'vitest';
import { parseStyle } from '../../../src/config/style.js';
import { planJob, type RecordingData } from '../../../src/render/plan.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { at, box, frameAt } from '../../helpers/events.js';

const META: RecordingData['meta'] = {
  version: 1,
  identity: 'desktop',
  viewport: { width: 1280, height: 800 },
  scale: 2,
  frames: 3,
  durationMs: 3_000,
  startedAt: 'now',
  browser: 'Chrome 154',
  url: 'http://localhost:3000/',
};

const RECORDING: RecordingData = {
  meta: META,
  frames: [frameAt(1, 100), frameAt(2, 1_200), frameAt(3, 2_200)],
  events: [
    at(500, { type: 'step', phase: 'start', index: 0, action: 'click' }),
    at(600, { type: 'cursor', x: 200, y: 200 }),
    at(1_000, { type: 'click', x: 200, y: 200, count: 1, target: box(150, 180) }),
    at(1_100, { type: 'dialog', kind: 'alert', message: 'Saved', accepted: true }),
    at(1_150, { type: 'navigate', phase: 'start', url: 'http://localhost:3000/next' }),
    at(1_300, { type: 'navigate', phase: 'load', url: 'http://localhost:3000/next' }),
    at(1_500, { type: 'step', phase: 'end', index: 0, action: 'click' }),
  ],
};

function plan(style: object = {}, recording: RecordingData = RECORDING) {
  return planJob({
    recording,
    style: parseStyle(style, 'test'),
    size: { width: 1920, height: 1080 },
    fps: 30,
    bitrate: 8_000_000,
    workers: 2,
  });
}

describe('planJob', () => {
  it('builds one draw command per output frame, from the first frame to the end', () => {
    const { job, seconds } = plan();

    expect(job.output).toMatchObject({
      width: 1920,
      height: 1080,
      fps: 30,
      frameCount: job.frames.length,
    });
    expect(seconds).toBeCloseTo((2_900 + 1_400) / 1_000, 1);
    expect(job.frames[0]).toMatchObject({ f: 1, url: 0 });
    expect(job.frames.at(-1)).toMatchObject({ f: 3, url: 1 });
    expect(job.urls).toEqual(['localhost:3000', 'localhost:3000/next']);
  });

  it('draws the cursor, ripples and the dialog card at the right moments', () => {
    const { job } = plan();

    expect(job.frames.some((frame) => frame.cursor)).toBe(true);
    expect(job.frames.some((frame) => (frame.ripples ?? []).length > 0)).toBe(true);
    expect(job.dialogs).toEqual([{ kind: 'alert', message: 'Saved' }]);
    expect(job.frames.filter((frame) => frame.dialog === 0)).toHaveLength(42);
    expect(job.background).toEqual({
      kind: 'gradient',
      from: '#4f46e5',
      to: '#06b6d4',
      angle: 135,
    });
  });

  it('follows the style: no cursor, no zoom, a solid background and a fixed URL', () => {
    const { job } = plan({
      cursor: { show: false },
      zoom: { enabled: false },
      background: '#000000',
      urlBar: 'app.example',
    });

    expect(job.cursor).toBeNull();
    expect(job.frames.every((frame) => frame.cursor === undefined && frame.crop[2] === 1_280)).toBe(
      true,
    );
    expect(job.background).toEqual({ kind: 'solid', color: '#000000' });
    expect(job.urls).toEqual(['app.example']);
  });

  it('draws a scene background as an SVG at the output size', () => {
    const { job } = plan({ background: { scene: 'glass', colors: 'ocean' } });

    if (job.background.kind !== 'scene') throw new Error('expected a scene background');
    expect(job.background.svg).toMatch(/^<svg [^>]*width="1920" height="1080"/);
    expect(job.background.svg).toContain('#38bdf8');
  });

  it('picks stills at step ends and one close-up per step', () => {
    const { moments } = plan();

    expect(moments.stills).toEqual([
      { name: 'still-01-step-01.png', frame: expect.any(Number) as number },
    ]);
    expect(moments.crops).toEqual([
      { name: 'crop-01-step-01.png', source: 1, rect: { x: 102, y: 132, width: 196, height: 136 } },
    ]);
  });

  it('refuses a recording with no frames', () => {
    expect(() => plan({}, { ...RECORDING, frames: [] })).toThrow(
      expect.objectContaining({ exitCode: ExitCode.EncodeFailed }),
    );
  });
});
