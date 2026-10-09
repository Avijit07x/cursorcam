import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sendAnswer } from '../../../src/record/ask.js';
import { EVENTS_FILE } from '../../../src/runs/dirs.js';
import type { StatusFile } from '../../../src/runs/status.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useFixtureServer } from '../../helpers/fixture-server.js';
import { browserAvailable } from '../helpers.js';
import { eventsOf, useRecorder } from '../recorder-helpers.js';

const TOKEN = 'tok-live-91c3e7';
const CODE = '482913';
const BLUR = 'blur(14px)';

describe.skipIf(!browserAvailable())('recording safety', () => {
  const site = useFixtureServer();
  const recorder = useRecorder();

  it('fails fast with exit 7 when the page does not load', async () => {
    const error = await recorder.fail({ url: site.url('/missing'), steps: [{ pause: 10 }] });

    expect(error.exitCode).toBe(ExitCode.PageLoadFailed);
    expect(error.message).toContain('HTTP 404');
  });

  it('never hangs on a target that never shows up', async () => {
    const started = performance.now();
    const error = await recorder.fail({
      url: site.url('/basics.html'),
      timeout: 1_500,
      steps: [{ waitFor: 'text=Never here' }],
    });

    expect(error.exitCode).toBe(ExitCode.StepFailed);
    expect(error.message).toContain('Step 1 (waitFor text=Never here): Could not find');
    expect(performance.now() - started).toBeLessThan(15_000);
  });

  it('blurs secrets and masked elements, and keeps secret values out of every file', async () => {
    const run = await recorder.record(
      {
        url: site.url('/secrets.html'),
        mask: ['.user-email'],
        steps: [{ type: '$secret:token', into: 'label=API token' }],
      },
      { env: { CURSORCAM_SECRET_TOKEN: TOKEN } },
    );

    const page = run.recording.session.page;
    expect(await page.getByLabel('API token').inputValue()).toBe(TOKEN);
    expect(
      await page.getByLabel('API token').evaluate((element) => getComputedStyle(element).filter),
    ).toBe(BLUR);
    expect(
      await page.locator('.user-email').evaluate((element) => getComputedStyle(element).filter),
    ).toBe(BLUR);
    const events = await readFile(join(run.dirs.cacheDir, EVENTS_FILE), 'utf8');
    expect(events).not.toContain(TOKEN);
  });

  it('waits at an ask step, takes the answer over the local socket, and never logs it', async () => {
    let status: StatusFile | undefined;
    const answering = (async () => {
      for (;;) {
        const current = status?.current;
        if (current?.state === 'waiting' && current.answerSocket) {
          await sendAnswer(current.answerSocket, CODE);
          return current.ask;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    })();

    const run = await recorder.record(
      {
        url: site.url('/secrets.html'),
        steps: [
          { ask: 'Verification code', into: 'label=Verification code' },
          { click: 'text=Verify' },
        ],
      },
      { onStatus: (file) => (status = file) },
    );

    expect(await answering).toBe('Verification code');
    const page = run.recording.session.page;
    expect(await page.getByLabel('Verification code').inputValue()).toBe(CODE);
    expect(eventsOf(run.events, 'ask').map((event) => event.phase)).toEqual(['wait', 'done']);
    expect(JSON.stringify(run.events)).not.toContain(CODE);
    expect(run.status.current.state).not.toBe('waiting');
  });

  it('keeps no frames in check mode', async () => {
    const run = await recorder.record(
      { url: site.url('/basics.html'), steps: [{ click: "role=button[name='Get started']" }] },
      { mode: 'check' },
    );

    expect(run.recording.frames).toBe(0);
  });
});
