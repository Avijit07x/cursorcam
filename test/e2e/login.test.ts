import { access, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { savedLoginFile } from '../../src/login/saved.js';
import { ExitCode } from '../../src/shared/exit-codes.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { useTempDir } from '../helpers/temp-dir.js';
import {
  browserAvailable,
  browserPid,
  hasDisplay,
  processCommandLines,
  startCli,
  useTempCache,
} from './helpers.js';

const OPEN_MESSAGE = 'A browser window is open.';
const SNAPSHOT_WAIT_MS = 2_500;

describe.skipIf(!browserAvailable() || !hasDisplay)('cursorcam login', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const work = useTempDir('each');

  const run = (args: readonly string[]) => startCli(args, work.path(), cache.env()).finished;

  it('saves the login when the browser closes, and recordings use it', async () => {
    const login = startCli(
      ['login', site.url('/login-save.html'), '--profile', 'e2e'],
      work.path(),
      cache.env(),
    );
    await expect.poll(login.stderr, { timeout: 30_000 }).toContain(OPEN_MESSAGE);
    await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_WAIT_MS));
    process.kill(await browserPid(login.child.pid ?? 0), 'SIGTERM');

    const saved = await login.finished;
    expect(saved.code, saved.stderr).toBe(ExitCode.Ok);
    expect(saved.stdout).toContain('Saved the login as "e2e"');
    const file = savedLoginFile(cache.paths(), 'e2e');
    expect((await stat(file)).mode & 0o777).toBe(0o600);

    const steps = join(work.path(), 'account.json');
    await writeFile(
      steps,
      JSON.stringify({
        url: site.url('/logged-in.html'),
        timeout: 2_000,
        steps: [{ waitFor: 'text=Signed in as Robin' }],
      }),
    );
    expect((await run(['check', steps, '--profile', 'e2e'])).code).toBe(ExitCode.Ok);
    expect((await run(['check', steps])).code).toBe(ExitCode.StepFailed);

    const forgot = await run(['login', '--profile', 'e2e', '--forget']);
    expect(forgot.stdout).toBe('Deleted the saved login "e2e".\n');
    await expect(access(file)).rejects.toThrow();
    expect((await run(['login', '--profile', 'e2e', '--forget'])).code).toBe(ExitCode.BadInput);
  });

  it('saves nothing when stopped with Ctrl-C, and leaves no browser behind', async () => {
    const login = startCli(
      ['login', site.url('/login-save.html'), '--profile', 'stopped'],
      work.path(),
      cache.env(),
    );
    await expect.poll(login.stderr, { timeout: 30_000 }).toContain(OPEN_MESSAGE);
    await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_WAIT_MS));
    login.child.kill('SIGINT');

    const stopped = await login.finished;
    expect(stopped.code, stopped.stderr).toBe(ExitCode.Interrupted);
    expect(stopped.stderr).toContain('Stopped before the login was saved.');
    await expect(access(savedLoginFile(cache.paths(), 'stopped'))).rejects.toThrow();
    expect(await processCommandLines()).not.toContain(`cursorcam-${login.child.pid}-`);
  });

  it('asks for a page and checks the name', async () => {
    const noUrl = await run(['login']);
    expect(noUrl.code).toBe(ExitCode.BadInput);
    expect(noUrl.stderr).toContain('Pass the page to log in on.');
    const badName = await run(['login', site.url('/login-save.html'), '--profile', '../x']);
    expect(badName.code).toBe(ExitCode.BadInput);
  });
});
