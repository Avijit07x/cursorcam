import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePaths } from '../../../src/system/paths.js';

describe('resolvePaths', () => {
  it('uses the cache override when it is set', () => {
    const paths = resolvePaths({ CURSORCAM_CACHE_DIR: '/tmp/cursorcam-cache' });

    expect(paths.cache).toBe('/tmp/cursorcam-cache');
    expect(paths.profiles).toBe(join('/tmp/cursorcam-cache', 'profiles'));
    expect(paths.savedProfiles).toBe(join('/tmp/cursorcam-cache', 'saved-profiles'));
    expect(paths.launcher).toBe(join('/tmp/cursorcam-cache', 'bin', 'browser-launcher.sh'));
  });

  it('falls back to the per-user cache folder', () => {
    const paths = resolvePaths({});

    expect(paths.cache).toMatch(/cursorcam/);
    expect(paths.profiles.startsWith(paths.cache)).toBe(true);
  });
});
