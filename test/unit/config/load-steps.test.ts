import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { actionOf, loadSteps, parseSteps } from '../../../src/config/load-steps.js';
import { stepsJsonSchema } from '../../../src/config/steps.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const URL = 'http://localhost:3000';
const parse = (raw: unknown, env: NodeJS.ProcessEnv = {}) =>
  parseSteps(raw, '/project/steps.json', env);
function badInput(message: string): Error {
  return expect.objectContaining({
    exitCode: ExitCode.BadInput,
    message: expect.stringContaining(message) as string,
  }) as Error;
}

describe('parseSteps', () => {
  it('fills in the defaults', () => {
    const plan = parse({ url: URL, steps: [{ click: 'text=Go' }] });

    expect(plan.header).toMatchObject({
      viewport: 'desktop',
      locale: 'en-US',
      colorScheme: 'light',
      timeout: 15_000,
    });
    expect(plan.dir).toBe('/project');
    expect(plan.steps.map(actionOf)).toEqual(['click']);
  });

  it('accepts every action', () => {
    const plan = parse({
      url: URL,
      steps: [
        { goto: '/' },
        { click: 'text=A', zoom: 2, speed: 0.5, pauseAfter: 200, dialog: 'dismiss' },
        { dblclick: { find: 'text=B', nth: 1 } },
        { hover: 'text=C' },
        { type: 'hi', into: 'label=D', paste: true, clear: false },
        { press: 'Mod+K' },
        { select: ['x', 'y'], in: 'label=E', showList: true },
        { upload: 'a.pdf', into: 'label=F' },
        { scroll: { to: 'bottom' }, in: '#list' },
        { scroll: { by: -200 } },
        { drag: 'text=G', to: 'text=H' },
        { waitFor: 'text=I', state: 'hidden' },
        { pause: 500 },
        { ask: '2FA code', into: 'label=Code' },
      ],
    });

    expect(plan.steps.map(actionOf)).toEqual([
      'goto',
      'click',
      'dblclick',
      'hover',
      'type',
      'press',
      'select',
      'upload',
      'scroll',
      'scroll',
      'drag',
      'waitFor',
      'pause',
      'ask',
    ]);
  });

  it('explains steps without exactly one action', () => {
    expect(() => parse({ url: URL, steps: [{ into: 'x' }] })).toThrow(
      badInput('Step 1 needs exactly one action, but has no action'),
    );
    expect(() => parse({ url: URL, steps: [{ click: 'a', hover: 'b' }] })).toThrow(
      badInput('has click, hover'),
    );
    expect(() => parse({ url: URL, steps: ['click'] })).toThrow(
      badInput('Step 1 must be an object'),
    );
  });

  it('points at the broken field', () => {
    expect(() => parse({ url: URL, steps: [{ click: 'role=button[name=Save]' }] })).toThrow(
      badInput('Step 1 (click) has errors'),
    );
    expect(() => parse({ url: URL, steps: [{ type: 'x' }] })).toThrow(badInput('into'));
    expect(() => parse({ url: URL, steps: [{ click: 'a', zoom: 9 }] })).toThrow(badInput('zoom'));
    expect(() => parse({ url: URL, steps: [{ click: 'a', extra: 1 }] })).toThrow(badInput('extra'));
    expect(() => parse({ url: 'ftp://x', steps: [{ pause: 1 }] })).toThrow(badInput('url'));
    expect(() => parse({ url: URL, steps: [] })).toThrow(badInput('steps'));
  });

  it('refuses hover and drag on phones, and goto to unlisted origins', () => {
    expect(() => parse({ url: URL, viewport: 'phone', steps: [{ hover: 'a' }] })).toThrow(
      badInput('phones cannot do'),
    );
    expect(() => parse({ url: URL, steps: [{ goto: 'https://evil.example' }] })).toThrow(
      badInput('leaves'),
    );
  });

  it('checks that every secret is set before anything runs', () => {
    const raw = { url: URL, steps: [{ type: '$secret:pass', into: 'label=P' }] };
    expect(() => parse(raw)).toThrow(badInput('CURSORCAM_SECRET_PASS is not set'));
    expect(parse(raw, { CURSORCAM_SECRET_PASS: 'x' }).steps).toHaveLength(1);
    const credentials = {
      url: URL,
      httpCredentials: { username: 'u', password: '$env:BASIC_PASS' },
      steps: [{ pause: 1 }],
    };
    expect(() => parse(credentials)).toThrow(badInput('BASIC_PASS is not set'));
  });
});

describe('loadSteps', () => {
  const dir = useTempDir();

  it('reads a file and reports bad JSON', async () => {
    const good = join(dir.path(), 'good.json');
    const bad = join(dir.path(), 'bad.json');
    await writeFile(good, JSON.stringify({ url: URL, steps: [{ pause: 1 }] }));
    await writeFile(bad, '{ "url": ');

    await expect(loadSteps(good)).resolves.toMatchObject({ path: good });
    await expect(loadSteps(bad)).rejects.toThrow(badInput('is not valid JSON'));
    await expect(loadSteps(join(dir.path(), 'none.json'))).rejects.toThrow(
      badInput('Could not read'),
    );
  });
});

describe('stepsJsonSchema', () => {
  it('describes every action for editors and Claude', () => {
    const schema = JSON.stringify(stepsJsonSchema());

    for (const action of ['goto', 'click', 'type', 'ask', 'waitFor'])
      expect(schema).toContain(`"${action}"`);
  });
});
