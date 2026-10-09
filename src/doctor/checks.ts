import { BROWSER_LABELS } from '../browser/finder.js';
import type { BrowserSession } from '../browser/session.js';
import { captureFirstFrame } from '../record/screencast.js';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { formatBytes } from '../shared/format.js';
import { jpegSize } from '../shared/jpeg.js';
import { runCommand } from '../system/command.js';
import { coreLimitsOfProcessesWith } from '../system/core-limit.js';
import { freeBytes } from '../system/disk.js';

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail: string;
  readonly fix?: string;
}

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 13;
const DISK_FAIL_BELOW_BYTES = 1024 ** 3;
const DISK_WARN_BELOW_BYTES = 5 * 1024 ** 3;
const ENCODER_PROBE_URL = 'http://127.0.0.1/__cursorcam/doctor';
const H264_PROBE_CONFIG = {
  codec: 'avc1.640028',
  width: 1920,
  height: 1080,
  framerate: 60,
  bitrate: 8_000_000,
};
const FONT_CHECKS = [
  { label: 'color emoji', query: ':charset=1f600', install: 'fonts-noto-color-emoji' },
  { label: 'CJK', query: ':lang=zh', install: 'fonts-noto-cjk' },
] as const;

export function failedCheck(name: string, error: unknown): CheckResult {
  const hint = error instanceof CursorCamError ? error.hint : undefined;
  return { name, status: 'fail', detail: messageOf(error), ...(hint ? { fix: hint } : {}) };
}

export function checkNode(version: string = process.versions.node): CheckResult {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  const supported = major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR);
  if (supported) return { name: 'Node.js', status: 'ok', detail: version };
  return {
    name: 'Node.js',
    status: 'fail',
    detail: `${version} is too old`,
    fix: `Install Node.js ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} or newer.`,
  };
}

export function checkBrowser(session: BrowserSession): CheckResult {
  const { install, version } = session;
  const detail = `${BROWSER_LABELS[install.kind]} ${version.full} at ${install.path}`;
  if (install.kind !== 'brave') return { name: 'Browser', status: 'ok', detail };
  return {
    name: 'Browser',
    status: 'warn',
    detail,
    fix: 'Brave Shields can change pages. Install Chrome, or turn Shields off for the site.',
  };
}

export async function checkCapture(session: BrowserSession): Promise<CheckResult> {
  const frame = await session.guard(captureFirstFrame(session.page));
  const size = jpegSize(frame.data);
  const { viewport, scale } = session.identity;
  const expectedWidth = viewport.width * scale;
  const detail = size ? `${size.width}×${size.height} frames` : 'unreadable frames';
  if (size?.width === expectedWidth) return { name: 'Capture', status: 'ok', detail };
  return {
    name: 'Capture',
    status: 'warn',
    detail: `${detail}, expected ${expectedWidth} px wide`,
    fix: 'Zoomed shots will look softer. Update the browser.',
  };
}

export async function checkEncoder(session: BrowserSession): Promise<CheckResult> {
  const { page } = session;
  await page.route(ENCODER_PROBE_URL, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>doctor</title>' }),
  );
  try {
    await session.guard(page.goto(ENCODER_PROBE_URL));
    const supported = await session.guard(
      page.evaluate(
        async (config) => (await VideoEncoder.isConfigSupported(config)).supported === true,
        H264_PROBE_CONFIG,
      ),
    );
    if (supported) return { name: 'Encoder', status: 'ok', detail: 'H.264 1080p60' };
    return {
      name: 'Encoder',
      status: 'fail',
      detail: 'This browser cannot encode H.264 video',
      fix: 'Install Google Chrome or Microsoft Edge.',
    };
  } finally {
    await page.unroute(ENCODER_PROBE_URL);
  }
}

export async function checkCoreDumps(
  session: BrowserSession,
  platform: NodeJS.Platform = process.platform,
): Promise<CheckResult> {
  if (platform === 'win32')
    return { name: 'Crash dumps', status: 'ok', detail: 'not used on Windows' };
  if (platform !== 'linux')
    return {
      name: 'Crash dumps',
      status: 'ok',
      detail: 'set by the launcher (not checked on macOS)',
    };
  const limits = await coreLimitsOfProcessesWith(session.profileDir);
  if (limits.length > 0 && limits.every((limit) => limit === 0)) {
    return {
      name: 'Crash dumps',
      status: 'ok',
      detail: `off for ${limits.length} browser processes`,
    };
  }
  return {
    name: 'Crash dumps',
    status: 'fail',
    detail: 'Crash dumps are not turned off for the browser',
    fix: 'Report this as a bug. A browser crash could fill the disk.',
  };
}

export async function checkDisk(dir: string): Promise<CheckResult> {
  const bytes = await freeBytes(dir);
  const detail = `${formatBytes(bytes)} free in ${dir}`;
  const fix = 'Free some disk space. Recording uses up to 1 GB per minute.';
  if (bytes < DISK_FAIL_BELOW_BYTES) return { name: 'Disk', status: 'fail', detail, fix };
  if (bytes < DISK_WARN_BELOW_BYTES) return { name: 'Disk', status: 'warn', detail, fix };
  return { name: 'Disk', status: 'ok', detail };
}

export async function checkFonts(run: typeof runCommand = runCommand): Promise<CheckResult> {
  try {
    const results = await Promise.all(
      FONT_CHECKS.map(async (font) => ({
        font,
        found: (await run('fc-list', [font.query, 'family'])).trim() !== '',
      })),
    );
    const missing = results.filter((result) => !result.found).map((result) => result.font);
    if (missing.length === 0)
      return { name: 'Fonts', status: 'ok', detail: 'emoji and CJK fonts found' };
    return {
      name: 'Fonts',
      status: 'warn',
      detail: `No ${missing.map((font) => font.label).join(' or ')} font found`,
      fix: `Install them, for example: sudo apt install ${missing.map((font) => font.install).join(' ')}`,
    };
  } catch {
    return {
      name: 'Fonts',
      status: 'warn',
      detail: 'Could not check fonts because fc-list is missing',
      fix: 'Install fontconfig, then run doctor again.',
    };
  }
}
