import { describe, expect, it } from 'vitest';
import { isProcessAlive } from '../../../src/system/process.js';

const UNUSED_PID = 2 ** 22 + 12_345;

describe('isProcessAlive', () => {
  it('sees the current process', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('reports a pid that does not exist as dead', () => {
    expect(isProcessAlive(UNUSED_PID)).toBe(false);
  });
});
