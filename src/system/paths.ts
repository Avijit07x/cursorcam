import { join } from 'node:path';
import envPaths from 'env-paths';

const APP_NAME = 'cursorcam';
const CACHE_DIR_ENV = 'CURSORCAM_CACHE_DIR';

export interface AppPaths {
  readonly cache: string;
  readonly profiles: string;
  readonly savedProfiles: string;
  readonly launcher: string;
}

export function resolvePaths(env: NodeJS.ProcessEnv = process.env): AppPaths {
  const cache = env[CACHE_DIR_ENV] ?? envPaths(APP_NAME, { suffix: '' }).cache;
  return {
    cache,
    profiles: join(cache, 'profiles'),
    savedProfiles: join(cache, 'saved-profiles'),
    launcher: join(cache, 'bin', 'browser-launcher.sh'),
  };
}
