import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

type Scope = 'each' | 'all';

export function useTempDir(scope: Scope = 'each'): { path: () => string } {
  let dir: string | undefined;
  const setup = scope === 'each' ? beforeEach : beforeAll;
  const teardown = scope === 'each' ? afterEach : afterAll;

  setup(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cursorcam-test-'));
  });

  teardown(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  return {
    path: () => {
      if (!dir) throw new Error('useTempDir is only available inside a test');
      return dir;
    },
  };
}
