import { describe, expect, it } from 'vitest';
import { IDENTITIES } from '../../src/browser/identity.js';
import { launchBrowser } from '../../src/browser/launch.js';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { runCommand } from '../../src/system/command.js';
import { coreLimitsOfProcessesWith } from '../../src/system/core-limit.js';
import { useTempCache } from '../e2e/helpers.js';

const CRASH_TESTS_ENABLED =
  process.env.CURSORCAM_CRASH_TESTS === '1' && process.platform === 'linux';
const DUMP_SETTLE_MS = 5_000;

async function chromeCoreDumpsSince(since: Date): Promise<string> {
  const output = await runCommand('coredumpctl', [
    'list',
    '--no-pager',
    '--no-legend',
    `--since=@${Math.floor(since.getTime() / 1000)}`,
  ]).catch(() => '');
  return output
    .split('\n')
    .filter((line) => line.includes('chrome'))
    .join('\n');
}

describe.skipIf(!CRASH_TESTS_ENABLED)('a browser crash', () => {
  const cache = useTempCache();

  it('fails the session at once and writes no core dump', async () => {
    const since = new Date();
    const session = await launchBrowser({ identity: IDENTITIES.desktop, paths: cache.paths() });

    try {
      await session.page.goto('about:blank');
      expect(new Set(await coreLimitsOfProcessesWith(session.profileDir))).toEqual(new Set([0]));

      const waiting = session.guard(new Promise<never>(() => undefined));
      const cdp = await session.context.newCDPSession(session.page);
      cdp.send('Page.crash').catch(() => undefined);

      await expect(waiting).rejects.toMatchObject({ exitCode: ExitCode.Crashed });
      await new Promise((resolve) => setTimeout(resolve, DUMP_SETTLE_MS));
      expect(await chromeCoreDumpsSince(since)).toBe('');
    } finally {
      await session.dispose();
    }
  });
});
