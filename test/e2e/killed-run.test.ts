import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { describe, expect, it } from 'vitest';
import { sweepStaleProfiles } from '../../src/system/cleanup.js';
import { browserAvailable, processCommandLines, useTempCache } from './helpers.js';

const HOLD_BROWSER_SCRIPT = join(import.meta.dirname, 'fixtures', 'hold-browser.mjs');
const BROWSER_EXIT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 250;

describe.skipIf(!browserAvailable())('a killed run', () => {
  const cache = useTempCache();

  it('leaves no browser behind, and the next run removes its profile', async () => {
    const child = spawn(process.execPath, [HOLD_BROWSER_SCRIPT], {
      env: cache.env(),
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const lines = createInterface({ input: child.stdout });
    const [profileDir] = (await once(lines, 'line')) as [string];
    lines.close();

    child.kill('SIGKILL');
    await once(child, 'exit');

    await expect
      .poll(async () => (await processCommandLines()).includes(profileDir), {
        timeout: BROWSER_EXIT_TIMEOUT_MS,
        interval: POLL_INTERVAL_MS,
      })
      .toBe(false);
    expect(existsSync(profileDir)).toBe(true);

    expect(await sweepStaleProfiles(cache.paths().profiles)).toBe(1);
    expect(existsSync(profileDir)).toBe(false);
  });
});
