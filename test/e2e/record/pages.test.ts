import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useFixtureServer } from '../../helpers/fixture-server.js';
import { browserAvailable, CI_SLOWDOWN } from '../helpers.js';
import { eventsOf, useRecorder } from '../recorder-helpers.js';

describe.skipIf(!browserAvailable())('recording real pages', () => {
  const site = useFixtureServer();
  const recorder = useRecorder();

  it('answers alert, confirm and prompt dialogs, and leaves a guarded page', async () => {
    const run = await recorder.record({
      url: site.url('/dialogs.html'),
      steps: [
        { click: '#alert' },
        { click: '#confirm', dialog: 'dismiss' },
        { waitFor: 'text=confirm false' },
        { click: '#prompt', dialog: { accept: true, text: 'Robin' } },
        { waitFor: 'text=prompt Robin' },
        { click: '#guard' },
        { click: 'text=Leave' },
        { waitFor: 'text=Second page' },
      ],
    });

    const dialogs = eventsOf(run.events, 'dialog').map((dialog) => [dialog.kind, dialog.accepted]);
    expect(dialogs.slice(0, 3)).toEqual([
      ['alert', true],
      ['confirm', false],
      ['prompt', true],
    ]);
    expect(await run.recording.session.page.title()).toBe('Second');
  });

  it('follows a new tab, then returns when the popup closes itself', async () => {
    const run = await recorder.record({
      url: site.url('/tabs.html'),
      steps: [
        { click: 'text=Open help' },
        { waitFor: 'text=Help center' },
        { click: "role=button[name='Done']" },
        { waitFor: 'text=done' },
      ],
    });

    expect(eventsOf(run.events, 'tab').map((event) => event.reason)).toEqual(['opened', 'closed']);
    expect(new Set(run.frames.map((frame) => frame.tab))).toEqual(new Set([0, 1, 2]));
  });

  it('saves downloads into the run folder and uploads through a styled picker', async () => {
    const run = await recorder.record({
      url: site.url('/files.html'),
      steps: [
        { click: 'text=Download report' },
        { upload: 'upload.txt', into: 'text=Choose resume' },
        { waitFor: 'text=resume: upload.txt' },
        { upload: 'upload.txt', into: 'label=Attachment' },
        { waitFor: 'text=plain: upload.txt' },
      ],
    });

    const downloads = join(run.dirs.outDir, 'downloads');
    await expect.poll(() => readdir(downloads).catch(() => [])).toEqual(['report.txt']);
    expect(await readFile(join(downloads, 'report.txt'), 'utf8')).toBe('downloaded');
  });

  it('types emoji, CJK and accents exactly, and warns when a field changes the text', async () => {
    const message = 'Ship it 🚀 家族 👨‍👩‍👧 café 🇮🇳';
    const run = await recorder.record({
      url: site.url('/typing.html'),
      steps: [
        { type: message, into: 'label=Message' },
        { type: '123456', into: 'label=Code' },
        { type: 'dashboard', into: 'label=Search' },
        { pause: 400 },
        { type: 'hello', into: 'label=Controlled' },
        { type: 'Line one', into: 'label=Editor' },
      ],
    });

    const page = run.recording.session.page;
    expect(await page.getByLabel('Message').inputValue()).toBe(message);
    expect(await page.getByLabel('Code').inputValue()).toBe('1234');
    expect(
      await page.evaluate(() => (window as unknown as { searchLog: string[] }).searchLog),
    ).toEqual(['dashboard']);
    expect(
      await page.evaluate(() =>
        (window as unknown as { controlledState(): string }).controlledState(),
      ),
    ).toBe('hello');
    expect(run.recording.warnings).toEqual([
      'A field shows "1234" instead of "123456". A length limit or input mask may have changed it.',
    ]);
  });

  it('does not hang on polling, server events, slow loads, late fonts or skeletons', async () => {
    const started = performance.now();
    const run = await recorder.record({
      url: site.url('/waiting.html'),
      steps: [
        { click: "role=button[name='Load rows']" },
        { click: 'text=Open report' },
        { click: "role=button[name='Export']" },
      ],
    });

    expect(await run.recording.session.page.getByRole('button').textContent()).toBe('Exported');
    expect(performance.now() - started).toBeLessThan(25_000 * CI_SLOWDOWN);
  });

  it('scrolls smoothly with the wheel, inside lists and on the page', async () => {
    const run = await recorder.record({
      url: site.url('/scroll.html'),
      steps: [
        { click: "role=button[name='Open row 35']" },
        { click: "role=button[name='Contact sales']" },
        { scroll: { to: 'top' } },
        { scroll: { to: '#faq' } },
        { scroll: { by: -300 } },
      ],
    });

    expect(await run.recording.session.page.locator('#out').textContent()).toBe('bottom clicked');
    expect(eventsOf(run.events, 'jump')).toEqual([]);
    const positions = run.frames.map((frame) => frame.scrollY);
    const steps = positions.slice(1).map((y, index) => Math.abs(y - (positions[index] ?? y)));
    expect(new Set(positions).size).toBeGreaterThan(10);
    expect(Math.max(...steps)).toBeLessThan(400 * CI_SLOWDOWN);
  });

  it('taps on a phone and ends with exit 10 on a challenge page', async () => {
    const run = await recorder.record({
      url: site.url('/phone.html'),
      viewport: 'phone',
      steps: [
        { click: "role=button[name='Menu']" },
        { click: 'text=Pricing' },
        { waitFor: 'text=Second page' },
      ],
    });
    expect(eventsOf(run.events, 'tap')).toHaveLength(2);
    expect(eventsOf(run.events, 'cursor')).toEqual([]);

    const blocked = await recorder.fail({ url: site.url('/blocked.html'), steps: [{ pause: 10 }] });
    expect(blocked.exitCode).toBe(ExitCode.Blocked);
  });
});
