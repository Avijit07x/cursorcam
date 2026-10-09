import type { Page } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

const CHALLENGE_TITLE =
  /^(just a moment|attention required|access denied|verify you are human|are you a robot|security check)/i;
const CHALLENGE_FRAMES: readonly RegExp[] = [
  /^https:\/\/challenges\.cloudflare\.com\//,
  /^https:\/\/(www\.)?(google\.com|recaptcha\.net)\/recaptcha\/[^?]*\/(anchor|bframe)\?(?!.*size=invisible)/,
  /^https:\/\/([a-z0-9-]+\.)?hcaptcha\.com\/captcha\//,
  /^https:\/\/([a-z0-9-]+\.)?arkoselabs\.com\//,
];

export function isChallengeTitle(title: string): boolean {
  return CHALLENGE_TITLE.test(title.trim());
}

export function isChallengeFrame(url: string): boolean {
  return CHALLENGE_FRAMES.some((pattern) => pattern.test(url));
}

export async function findBlock(page: Page): Promise<string | undefined> {
  if (page.isClosed()) return undefined;
  const title = await page.title().catch(() => '');
  if (isChallengeTitle(title)) return `The site shows a "${title}" check page.`;
  if (page.frames().some((frame) => isChallengeFrame(frame.url()))) {
    return 'The site asks for a captcha.';
  }
  return undefined;
}

export async function assertNotBlocked(page: Page): Promise<void> {
  const reason = await findBlock(page);
  if (!reason) return;
  throw new CursorCamError(reason, {
    exitCode: ExitCode.Blocked,
    hint: 'Log in once yourself with cursorcam login <url> --profile <name>, then record with --profile <name>. CursorCam never solves captchas.',
  });
}
