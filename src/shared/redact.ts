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
  if (parsed.password) parsed.password = SECRET_MASK;
  for (const name of new Set(parsed.searchParams.keys())) {
    if (SECRET_PARAM_NAME.test(name)) parsed.searchParams.set(name, SECRET_MASK);
  }
  return redact(decodeSafely(parsed.toString()));
}

function decodeSafely(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
