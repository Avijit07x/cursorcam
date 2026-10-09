import { describe, expect, it } from 'vitest';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { browserAvailable } from '../helpers.js';
import { useFixtureServer } from '../../helpers/fixture-server.js';
import { eventsOf, useRecorder } from '../recorder-helpers.js';

describe.skipIf(!browserAvailable())('recording actions', () => {
  const site = useFixtureServer();
  const recorder = useRecorder();

  const textOf = async (run: Awaited<ReturnType<typeof recorder.record>>, selector: string) =>
    run.recording.session.page.locator(selector).textContent();

  it('clicks, types, selects and hovers like a person, and logs each move', async () => {
    const run = await recorder.record({
      url: site.url('/basics.html'),
      steps: [
        { click: "role=button[name='Get started']" },
        { type: 'alex@example.com', into: 'label=Email' },
        { select: 'Monthly', in: 'label=Billing' },
        { hover: "role=button[name='Account']" },
        { click: 'text=Settings' },
        { waitFor: '#loaded' },
      ],
    });

    expect(await textOf(run, '#loaded')).toBe('Loaded');
    const cursor = eventsOf(run.events, 'cursor');
    expect(cursor.length).toBeGreaterThan(20);
    const jumps = cursor.slice(1).map((point, index) => {
      const previous = cursor[index];
      return previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
    });
    expect(Math.max(...jumps)).toBeLessThan(80);
    expect(eventsOf(run.events, 'click')).toHaveLength(3);
    expect(eventsOf(run.events, 'typing').map((event) => event.phase)).toEqual(['start', 'end']);
    expect(eventsOf(run.events, 'navigate').map((event) => event.phase)).toEqual(['start', 'load']);
    expect(run.frames.length).toBeGreaterThan(5);
  });

  it('clicks a pulsing button, waits for a fade-in and for a disabled button', async () => {
    const run = await recorder.record({
      url: site.url('/motion.html'),
      steps: [
        { click: "role=button[name='Upgrade']" },
        { waitFor: '#out' },
        { click: "role=button[name='Continue']" },
        { click: "role=button[name='Submit']" },
      ],
    });

    expect(await textOf(run, '#out')).toBe('late clicked');
  });

  it('treats a see-through element as hidden', async () => {
    const error = await recorder.fail({
      url: site.url('/motion.html'),
      timeout: 1_500,
      steps: [{ click: '#ghost' }],
    });

    expect(error.exitCode).toBe(ExitCode.StepFailed);
    expect(error.message).toContain('see-through');
  });

  it('clicks a see-through checkbox drawn by the page, like a custom todo circle', async () => {
    const run = await recorder.record({
      url: site.url('/motion.html'),
      timeout: 3_000,
      steps: [{ click: 'testid=todo-toggle' }],
    });

    expect(await textOf(run, '#out')).toBe('todo done');
  });

  it('scrolls a target clear of a sticky header and names a covering banner', async () => {
    const run = await recorder.record({
      url: site.url('/cover.html'),
      steps: [{ click: "role=button[name='Buy now']" }],
    });
    expect(await textOf(run, '#out')).toBe('bought');

    const error = await recorder.fail({
      url: site.url('/cover.html#cookies'),
      steps: [{ click: "role=button[name='Under banner']" }],
    });
    expect(error.message).toContain('is covered by button "Accept"');
  });

  it('refuses an unclear target and lists the matches, then accepts nth, within and near', async () => {
    const error = await recorder.fail({
      url: site.url('/strict.html'),
      steps: [{ click: "role=button[name='Save']" }],
    });
    expect(error.message).toContain('matches 2 elements');
    expect(error.message).toContain('0: button "Save"');

    const run = await recorder.record({
      url: site.url('/strict.html'),
      steps: [
        { click: { find: "role=button[name='Save']", nth: -1 } },
        { waitFor: 'text=billing saved' },
        { click: { find: "role=button[name='Save']", within: '#profile' } },
        { waitFor: 'text=profile saved' },
        { click: { find: "role=button[name='Save']", near: 'label=Card' } },
      ],
    });
    expect(await textOf(run, '#out')).toBe('billing saved');
  });

  it('finds buttons inside shadow DOM and fields inside a cross-origin frame', async () => {
    const shadow = await recorder.record({
      url: site.url('/shadow.html'),
      steps: [{ click: "role=button[name='Launch']" }],
    });
    expect(await textOf(shadow, '#out')).toBe('launched');

    const framed = await recorder.record({
      url: site.url('/frames.html'),
      steps: [
        { type: '4242 4242', into: { find: 'label=Card number', frame: '#payment' } },
        { click: { find: "role=button[name='Pay']", frame: '#payment' } },
      ],
    });
    const frame = framed.recording.session.page.frameLocator('#payment');
    expect(await frame.locator('#done').textContent()).toBe('Paid with 4242 4242');
  });

  it('picks an option from an in-page list and drags a card', async () => {
    const run = await recorder.record({
      url: site.url('/select.html'),
      steps: [{ select: 'Large', in: 'label=Size', showList: true }],
    });
    expect(await run.recording.session.page.locator('#size').inputValue()).toBe('Large');
    expect(eventsOf(run.events, 'click').length).toBe(2);

    const dragged = await recorder.record({
      url: site.url('/drag.html'),
      steps: [{ drag: 'text=Task A', to: 'label=Done column' }],
    });
    expect(await textOf(dragged, '#out')).toBe('dropped');
    expect(eventsOf(dragged.events, 'drag').map((event) => event.phase)).toEqual(['start', 'end']);
  });

  it('lists the options when a select has no such option', async () => {
    const error = await recorder.fail({
      url: site.url('/select.html'),
      steps: [{ select: 'Huge', in: 'label=Size' }],
    });

    expect(error.message).toContain('Options: "Small", "Medium", "Large"');
  });
});
