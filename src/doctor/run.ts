import { IDENTITIES } from '../browser/identity.js';
import { launchBrowser } from '../browser/launch.js';
import type { Lifecycle } from '../system/lifecycle.js';
import type { AppPaths } from '../system/paths.js';
import {
  checkBrowser,
  checkCapture,
  checkCoreDumps,
  checkDisk,
  checkEncoder,
  checkFonts,
  checkNode,
  failedCheck,
  type CheckResult,
} from './checks.js';

async function checkWithBrowser(paths: AppPaths, lifecycle: Lifecycle): Promise<CheckResult[]> {
  try {
    const session = await launchBrowser({ identity: IDENTITIES.desktop, paths });
    lifecycle.add(() => session.dispose());
    return [
      checkBrowser(session),
      await checkCapture(session).catch((error: unknown) => failedCheck('Capture', error)),
      await checkEncoder(session).catch((error: unknown) => failedCheck('Encoder', error)),
      await checkCoreDumps(session),
    ];
  } catch (error) {
    return [failedCheck('Browser', error)];
  }
}

export async function runDoctor(paths: AppPaths, lifecycle: Lifecycle): Promise<CheckResult[]> {
  const browserChecks = await checkWithBrowser(paths, lifecycle);
  const fontChecks = process.platform === 'linux' ? [await checkFonts()] : [];
  return [checkNode(), ...browserChecks, await checkDisk(paths.cache), ...fontChecks];
}
