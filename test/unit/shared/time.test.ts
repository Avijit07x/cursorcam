import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../../../src/shared/time.js';

const TIMEOUT_MS = 1_000;

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result when the work finishes in time', async () => {
    await expect(
      withTimeout(Promise.resolve('done'), TIMEOUT_MS, () => new Error('late')),
    ).resolves.toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fails with the timeout error when the work is too slow', async () => {
    const result = withTimeout(new Promise(() => undefined), TIMEOUT_MS, () => new Error('late'));
    vi.advanceTimersByTime(TIMEOUT_MS);

    await expect(result).rejects.toThrow('late');
    expect(vi.getTimerCount()).toBe(0);
  });
});
