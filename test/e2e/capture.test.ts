import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { describe, expect, it } from 'vitest';
import { captureFlow } from '../../src/capture/capture.js';
import { buildSteps } from '../../src/capture/steps.js';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { Lifecycle } from '../../src/system/lifecycle.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { browserAvailable, browserPid, hasDisplay, startCli, useTempCache } from './helpers.js';

const OPEN_MESSAGE = 'A browser window is open.';

describe.skipIf(!browserAvailable())('capture', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const work = useTempDir('each');

  const capture = async (path: string, act: (page: Page) => Promise<void>) => {
    const lifecycle = new Lifecycle();
    let acting = Promise.resolve();
    try {
      const flow = await captureFlow({
        url: site.url(path),
        paths: cache.paths(),
        lifecycle,
        headed: false,
        onOpen: (page) => {
          acting = act(page).finally(() => page.close());
        },
      });
      await acting;
      return buildSteps(site.url(path), flow.events);
    } finally {
      await lifecycle.dispose();
    }
  };

  const check = async (file: object, env: NodeJS.ProcessEnv = {}) => {
    const steps = join(work.path(), 'captured.json');
    await writeFile(steps, JSON.stringify(file));
    return startCli(['check', steps], work.path(), { ...cache.env(), ...env }).finished;
  };

  it('saves what a person clicks, types and picks, and the steps play back', async () => {
    const captured = await capture('/capture.html', async (page) => {
      await page.getByRole('button', { name: 'New project' }).click();
      await page.getByLabel('Name').click();
      await page.keyboard.type('Apollo');
      await page.getByLabel('Plan').focus();
      await page.keyboard.press('P');
      const label = await page.getByText('Private').boundingBox();
      if (!label) throw new Error('The Private label is not on screen.');
      await page.mouse.click(label.x + label.width - 4, label.y + label.height / 2);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByText('Saved Apollo on Pro, private').waitFor();
      await page.getByRole('link', { name: 'Go to second page' }).click();
      await page.getByText('Loaded').waitFor();
      await page.goto(site.url('/capture.html'));
      await page.getByRole('button', { name: 'New project' }).click();
    });

    expect(captured.file).toEqual({
      url: site.url('/capture.html'),
      steps: [
        { pause: 600 },
        { click: "role=button[name='New project']" },
        { type: 'Apollo', into: "role=textbox[name='Name']" },
        { select: 'Pro', in: "role=combobox[name='Plan']" },
        { click: "role=checkbox[name='Private']" },
        { click: { find: "role=button[name='Save']", exact: true } },
        { click: "role=link[name='Go to second page']" },
        { goto: '/capture.html' },
        { click: "role=button[name='New project']", pauseAfter: 1500 },
      ],
    });
    const played = await check(captured.file);
    expect(played.code, played.stderr).toBe(ExitCode.Ok);
  });

  it('saves a login as secrets, keys as presses and a double click once', async () => {
    const captured = await capture('/basics.html', async (page) => {
      await page.getByRole('button', { name: 'Get started' }).dblclick();
      await page.getByLabel('Email').click();
      await page.keyboard.type('robin@example.com');
      await page.getByLabel('Password').click();
      await page.keyboard.type('hunter2');
      await page.keyboard.press('Enter');
      await page.getByText('Signed in as robin@example.com').waitFor();
      await page.keyboard.press('Escape');
      await page.keyboard.press('ControlOrMeta+K');
    });

    expect(captured.file.steps).toEqual([
      { pause: 600 },
      { dblclick: "role=button[name='Get started']" },
      { type: '$secret:EMAIL', into: "role=textbox[name='Email']" },
      { type: '$secret:PASSWORD', into: 'label=Password' },
      { press: 'Enter' },
      { press: 'Escape' },
      { press: 'Mod+K', pauseAfter: 1500 },
    ]);
    expect(captured.secrets).toEqual(['EMAIL', 'PASSWORD']);
    expect(JSON.stringify(captured)).not.toContain('hunter2');
    const played = await check(captured.file, {
      CURSORCAM_SECRET_EMAIL: 'robin@example.com',
      CURSORCAM_SECRET_PASSWORD: 'hunter2',
    });
    expect(played.code, played.stderr).toBe(ExitCode.Ok);
  });

  it('names the iframe a target is in', async () => {
    const captured = await capture('/frames.html', async (page) => {
      const payment = page.frameLocator('#payment');
      await payment.getByLabel('Card number').click();
      await page.keyboard.type('4242');
      await payment.getByRole('button', { name: 'Pay' }).click();
      await payment.getByText('Paid with 4242').waitFor();
    });

    expect(captured.file.steps).toEqual([
      { pause: 600 },
      { type: '4242', into: { find: "role=textbox[name='Card number']", frame: '#payment' } },
      { click: { find: "role=button[name='Pay']", frame: '#payment' }, pauseAfter: 1500 },
    ]);
    const played = await check(captured.file);
    expect(played.code, played.stderr).toBe(ExitCode.Ok);
  });

  it('never writes over a steps file', async () => {
    const steps = join(work.path(), 'flow.json');
    await writeFile(steps, '{}');
    const refused = await startCli(
      ['capture', site.url('/capture.html'), steps],
      work.path(),
      cache.env(),
    ).finished;

    expect(refused.code).toBe(ExitCode.BadInput);
    expect(refused.stderr).toContain(`${steps} already exists.`);
  });

  it.skipIf(!hasDisplay)('saves nothing when the window closes before any click', async () => {
    const running = startCli(['capture', site.url('/capture.html')], work.path(), cache.env());
    await expect.poll(running.stderr, { timeout: 30_000 }).toContain(OPEN_MESSAGE);
    process.kill(await browserPid(running.child.pid ?? 0), 'SIGTERM');

    const closed = await running.finished;
    expect(closed.code, closed.stderr).toBe(ExitCode.BadInput);
    expect(closed.stderr).toContain('Nothing was saved: no clicks or typing were captured.');
    await expect(access(join(work.path(), 'cursorcam-output', 'capture.json'))).rejects.toThrow();
  });

  it.skipIf(!hasDisplay)('saves nothing when stopped with Ctrl-C', async () => {
    const running = startCli(['capture', site.url('/capture.html')], work.path(), cache.env());
    await expect.poll(running.stderr, { timeout: 30_000 }).toContain(OPEN_MESSAGE);
    running.child.kill('SIGINT');

    const stopped = await running.finished;
    expect(stopped.code, stopped.stderr).toBe(ExitCode.Interrupted);
    expect(stopped.stderr).toContain('Stopped before the steps were saved.');
    await expect(access(join(work.path(), 'cursorcam-output', 'capture.json'))).rejects.toThrow();
  });
});
