import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { inspectPage } from '../../src/inspect/inspect.js';
import { jpegSize } from '../../src/shared/jpeg.js';
import { Lifecycle } from '../../src/system/lifecycle.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { browserAvailable, useTempCache } from './helpers.js';

describe.skipIf(!browserAvailable())('inspect', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const out = useTempDir('each');

  const inspect = async (
    path: string,
    extra: { phone?: boolean; filter?: string; limit?: number } = {},
  ) => {
    const lifecycle = new Lifecycle();
    try {
      return await inspectPage({
        url: site.url(path),
        viewport: extra.phone ? 'phone' : 'desktop',
        outDir: out.path(),
        paths: cache.paths(),
        lifecycle,
        filter: extra.filter,
        limit: extra.limit ?? 60,
      });
    } finally {
      await lifecycle.dispose();
    }
  };

  it('saves the first frame and lists working locators in page order', async () => {
    const report = await inspect('/basics.html');

    expect(jpegSize(await readFile(report.frame))).toEqual({ width: 2560, height: 1600 });
    expect(report.targets.map((target) => target.locator)).toEqual([
      "role=button[name='Get started']",
      "role=textbox[name='Email']",
      'label=Password',
      "role=combobox[name='Billing']",
      "role=button[name='Sign in']",
      "role=button[name='Account']",
      "role=link[name='Go to second page']",
    ]);
  });

  it('filters, caps and warns about things the video cannot show', async () => {
    const filtered = await inspect('/basics.html', { filter: 'sign' });
    expect(filtered.targets.map((target) => target.locator)).toEqual([
      "role=button[name='Sign in']",
    ]);

    const capped = await inspect('/basics.html', { limit: 2 });
    expect(capped.targets).toHaveLength(2);
    expect(capped.total).toBe(7);

    const report = await inspect('/select.html');
    expect(report.warnings).toEqual([
      expect.stringContaining('the option list only shows'),
      expect.stringContaining('its picker will not show'),
      expect.stringContaining('its tooltip will not show'),
    ]);
  });

  it('finds targets inside frames and shadow DOM, and warns phones about a missing viewport tag', async () => {
    const framed = await inspect('/frames.html');
    expect(framed.targets.map((target) => target.locator)).toContainEqual({
      find: "role=button[name='Pay']",
      frame: '#payment',
    });

    const shadow = await inspect('/shadow.html');
    expect(shadow.targets.map((target) => target.locator)).toContain("role=button[name='Launch']");

    const noViewportTag =
      'The page has no viewport meta tag, so phones show the desktop layout zoomed out.';
    const phone = await inspect('/basics.html', { phone: true });
    expect(phone.warnings).not.toContain(noViewportTag);
    const bare = await inspect('/dialogs.html', { phone: true });
    expect(bare.warnings).toContain(noViewportTag);
  });
});
