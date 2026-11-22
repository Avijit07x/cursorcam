import type { BrowserContext } from 'playwright-core';
import { describe, expect, it } from 'vitest';
import { readLoginState } from '../../../src/login/storage.js';

const COOKIE = {
  name: 'session',
  value: 'abc',
  domain: 'app.example',
  path: '/',
  expires: -1,
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
};

function fakeContext(pages: { url: string; storage?: object | Error }[]): BrowserContext {
  return {
    cookies: () => Promise.resolve([COOKIE]),
    pages: () =>
      pages.map(({ url, storage }) => ({
        url: () => url,
        evaluate: () =>
          storage instanceof Error ? Promise.reject(storage) : Promise.resolve(storage),
      })),
  } as unknown as BrowserContext;
}

describe('readLoginState', () => {
  it('reads cookies and the open pages, and skips pages that are not web pages', async () => {
    const app = { origin: 'https://app.example', localStorage: [{ name: 'user', value: 'Robin' }] };
    const state = await readLoginState(
      fakeContext([{ url: 'https://app.example/home', storage: app }, { url: 'about:blank' }]),
      undefined,
    );

    expect(state).toEqual({ cookies: [COOKIE], origins: [app] });
  });

  it('keeps what it read before for a site that is closed or busy, and drops emptied sites', async () => {
    const auth = { origin: 'https://auth.example', localStorage: [{ name: 'a', value: '1' }] };
    const app = { origin: 'https://app.example', localStorage: [{ name: 'b', value: '2' }] };
    const gone = { origin: 'https://gone.example', localStorage: [{ name: 'c', value: '3' }] };
    const state = await readLoginState(
      fakeContext([
        { url: 'https://app.example/', storage: new Error('navigating') },
        { url: 'https://gone.example/', storage: { ...gone, localStorage: [], indexedDB: [] } },
      ]),
      { cookies: [], origins: [auth, app, gone] },
    );

    expect(state.origins).toEqual([auth, app]);
  });
});
