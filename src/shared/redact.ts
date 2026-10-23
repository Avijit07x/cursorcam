export const SECRET_MASK = '•••';

const SECRET_PARAM_NAME =
  /pass|pwd|secret|token|key|auth|code|session|sig|otp|credential|jwt|bearer/i;

const secretValues = new Set<string>();

export function registerSecret(value: string): void {
  if (value.length > 0) secretValues.add(value);
}

export function clearSecrets(): void {
  secretValues.clear();
}

export function redact(text: string): string {
  let result = text;
  const longestFirst = [...secretValues].sort((a, b) => b.length - a.length);
  for (const value of longestFirst) result = result.replaceAll(value, SECRET_MASK);
  return result;
}

export function redactUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return redact(url);
  }
  return redact(decodeSafely(maskUrlSecrets(parsed).toString()));
}

export function maskUrlSecrets(url: URL): URL {
  const masked = new URL(url);
  if (masked.password) masked.password = SECRET_MASK;
  for (const name of new Set(masked.searchParams.keys())) {
    if (SECRET_PARAM_NAME.test(name)) masked.searchParams.set(name, SECRET_MASK);
  }
  return masked;
}

function decodeSafely(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
