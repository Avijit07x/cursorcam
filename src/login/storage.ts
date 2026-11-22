import type { BrowserContext, Page } from 'playwright-core';
import { withTimeout } from '../shared/time.js';
import type { LoginState } from './capture.js';

// Playwright saves and restores IndexedDB, but its public types leave it out.
type OriginState = LoginState['origins'][number] & { readonly indexedDB?: readonly unknown[] };

const WEB_PAGE = /^https?:/;
const PAGE_READ_TIMEOUT_MS = 2_000;

// Playwright's storageState() opens a visible tab for every other site the login touched, like a
// captcha or a sign-in iframe, so a snapshot each second made the login window flash and jump to
// the front. This reads every cookie and the storage of the open pages, without opening a tab.
export async function readLoginState(
  context: BrowserContext,
  previous: LoginState | undefined,
): Promise<LoginState> {
  const cookies = await context.cookies();
  const origins = new Map<string, OriginState>(
    previous?.origins.map((entry) => [entry.origin, entry]),
  );
  for (const entry of await Promise.all(context.pages().map(readPageStorage))) {
    if (entry) origins.set(entry.origin, entry);
  }
  return { cookies, origins: [...origins.values()].filter(hasStorage) };
}

function hasStorage(entry: OriginState): boolean {
  return entry.localStorage.length > 0 || (entry.indexedDB?.length ?? 0) > 0;
}

function readPageStorage(page: Page): Promise<OriginState | undefined> {
  if (!WEB_PAGE.test(page.url())) return Promise.resolve(undefined);
  return withTimeout(
    page.evaluate(collectStorage),
    PAGE_READ_TIMEOUT_MS,
    () => new Error('The page storage took too long to read.'),
  ).catch(() => undefined);
}

// Runs in the page, so it uses nothing from this module. It writes Playwright's storage format.
async function collectStorage(): Promise<OriginState> {
  const done = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB failed.'));
    });
  const keyPathOf = (keyPath: string | string[] | null) => {
    if (Array.isArray(keyPath)) return { keyPathArray: keyPath };
    return keyPath === null ? {} : { keyPath };
  };
  const readStore = async (db: IDBDatabase, name: string) => {
    const store = db.transaction(name, 'readonly').objectStore(name);
    const [keys, values] = await Promise.all([
      done(store.getAllKeys()),
      done<unknown[]>(store.getAll()),
    ]);
    const indexes = [...store.indexNames].map((indexName) => {
      const index = store.index(indexName);
      return {
        name: indexName,
        unique: index.unique,
        multiEntry: index.multiEntry,
        ...keyPathOf(index.keyPath),
      };
    });
    // shortcut: values are kept as JSON, so a Date or binary value comes back as text; switch to
    // Playwright's encoded values if a login ever needs one.
    const records = keys.map((key, at) =>
      store.keyPath === null ? { key, value: values[at] } : { value: values[at] },
    );
    return {
      name,
      autoIncrement: store.autoIncrement,
      ...keyPathOf(store.keyPath),
      indexes,
      records,
    };
  };
  const readDatabase = async ({ name = '', version = 1 }: IDBDatabaseInfo) => {
    const db = await done(indexedDB.open(name));
    try {
      const stores = await Promise.all(
        [...db.objectStoreNames].map((store) => readStore(db, store)),
      );
      return { name, version, stores };
    } finally {
      db.close();
    }
  };
  return {
    origin: location.origin,
    localStorage: Object.keys(localStorage).map((name) => ({
      name,
      value: localStorage.getItem(name) ?? '',
    })),
    indexedDB: await Promise.all((await indexedDB.databases()).map(readDatabase)),
  };
}
