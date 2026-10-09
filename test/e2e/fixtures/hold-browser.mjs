import { IDENTITIES } from '../../../dist/browser/identity.js';
import { launchBrowser } from '../../../dist/browser/launch.js';
import { resolvePaths } from '../../../dist/system/paths.js';

const KEEP_ALIVE_MS = 60_000;

const session = await launchBrowser({ identity: IDENTITIES.desktop, paths: resolvePaths() });
process.stdout.write(`${session.profileDir}\n`);
setInterval(() => undefined, KEEP_ALIVE_MS);
