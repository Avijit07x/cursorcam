import { access, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LOGIN_IDENTITY } from '../../src/browser/identity.js';
import { launchBrowser } from '../../src/browser/launch.js';
import type { BrowserSession } from '../../src/browser/session.js';
import type { LoginState } from '../../src/login/capture.js';
import { readLoginState } from '../../src/login/storage.js';
import { saveLogin, savedLoginFile } from '../../src/login/saved.js';
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

  it('keeps a site of the saved login it starts from when no page on it is open', async () => {
    const other = { origin: site.otherOrigin(), localStorage: [{ name: 'token', value: 'abc' }] };
    const file = await saveLogin(cache.paths(), 'again', { cookies: [], origins: [other] });
    const login = startCli(
      ['login', site.url('/login-save.html'), '--profile', 'again'],
      work.path(),
      cache.env(),
    );
    await expect.poll(login.stderr, { timeout: 30_000 }).toContain(OPEN_MESSAGE);
    await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_WAIT_MS));
    process.kill(await browserPid(login.child.pid ?? 0), 'SIGTERM');

    const saved = await login.finished;
    expect(saved.code, saved.stderr).toBe(ExitCode.Ok);
    const state = JSON.parse(await readFile(file, 'utf8')) as LoginState;
    expect(state.origins.map((entry) => entry.origin).toSorted()).toEqual(
      [site.otherOrigin(), new URL(site.url()).origin].toSorted(),
    );
    expect(state.origins).toContainEqual(other);
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

describe.skipIf(!browserAvailable())('login snapshots', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const work = useTempDir('each');
  const sessions: BrowserSession[] = [];
  const open = async (loginState?: string) => {
    const session = await launchBrowser({
      identity: LOGIN_IDENTITY,
      paths: cache.paths(),
      ...(loginState ? { loginState } : {}),
    });
    sessions.push(session);
    return session;
  };

  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((session) => session.dispose()));
  });

  it('opens no tab for a site seen in a frame, and saves a login that comes back', async () => {
    const session = await open();
    const cdp = await session.context.newCDPSession(session.page);
    let tabs = 0;
    cdp.on('Target.targetCreated', ({ targetInfo }) => {
      if (targetInfo.type === 'page') tabs += 1;
    });
    await cdp.send('Target.setDiscoverTargets', { discover: true });
    await session.page.goto(site.url('/login-frame.html'));
    await expect.poll(() => session.page.title()).toBe('Saved');
    await expect.poll(() => session.page.frames().length).toBe(2);
    const opened = tabs;

    const state = await readLoginState(session.context, undefined);
    expect(tabs).toBe(opened);
    expect(state.cookies.map((cookie) => cookie.name)).toContain('frame_session');
    expect(state.origins).toHaveLength(1);

    const file = join(work.path(), 'login.json');
    await writeFile(file, JSON.stringify(state));
    const restored = await open(file);
    await restored.page.goto(site.url('/second.html'));
    expect(
      await restored.page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open('auth');
          request.onsuccess = () => resolve(request.result);
        });
        const token = await new Promise((resolve) => {
          const request = db.transaction('tokens').objectStore('tokens').get('me');
          request.onsuccess = () => resolve(request.result);
        });
        return { user: localStorage.getItem('frame-user'), token, cookie: document.cookie };
      }),
    ).toEqual({ user: 'Sam', token: { token: 'abc' }, cookie: 'frame_session=xyz' });
  });
});
