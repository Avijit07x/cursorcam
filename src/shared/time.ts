import { setTimeout as delay } from 'node:timers/promises';

export function sleep(ms: number): Promise<void> {
  return delay(Math.max(ms, 0));
}

export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function pollUntil(
  check: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs: number,
): Promise<boolean> {
  const end = performance.now() + timeoutMs;
  for (;;) {
    if (await check()) return true;
    const left = end - performance.now();
    if (left <= 0) return false;
    await sleep(Math.min(intervalMs, left));
  }
}
