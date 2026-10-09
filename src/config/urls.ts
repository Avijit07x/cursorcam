import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';

const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '0.0.0.0', '[::1]']);
const LOOPBACK_V4 = /^127(?:\.\d{1,3}){3}$/;
const LOCALHOST_SUFFIX = '.localhost';

export function resolveStepUrl(
  base: string,
  target: string,
  allowOrigins: readonly string[] = [],
): string {
  let url: URL;
  try {
    url = new URL(target, base);
  } catch {
    throw badUrl(`"${target}" is not a valid URL or path.`);
  }
  if (!WEB_PROTOCOLS.has(url.protocol)) throw badUrl(`"${target}" must use http or https.`);

  const allowed = new Set([
    new URL(base).origin,
    ...allowOrigins.map((origin) => new URL(origin).origin),
  ]);
  if (!allowed.has(url.origin)) {
    throw badUrl(
      `goto "${target}" leaves ${new URL(base).origin}.`,
      `Add "${url.origin}" to allowOrigins in the steps file.`,
    );
  }
  return url.toString();
}

export function parseWebUrl(text: string): URL {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw badUrl(`"${text}" is not a valid URL.`, 'Use a full address like http://localhost:3000.');
  }
  if (!WEB_PROTOCOLS.has(url.protocol)) throw badUrl(`"${text}" must use http or https.`);
  return url;
}

export function isLocalUrl(url: string): boolean {
  const { hostname } = new URL(url);
  return (
    LOCAL_HOSTNAMES.has(hostname) ||
    LOOPBACK_V4.test(hostname) ||
    hostname.endsWith(LOCALHOST_SUFFIX)
  );
}

function badUrl(message: string, hint?: string): CursorCamError {
  return new CursorCamError(message, { exitCode: ExitCode.BadInput, hint });
}
