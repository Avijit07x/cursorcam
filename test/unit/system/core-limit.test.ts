import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { coreLimitsOfProcessesWith } from '../../../src/system/core-limit.js';

const KEEP_ALIVE_SCRIPT = 'setTimeout(() => undefined, 30000)';

describe.skipIf(process.platform !== 'linux')('coreLimitsOfProcessesWith', () => {
  it('reads the core limit of matching processes only', async () => {
    const marker = `cursorcam-marker-${randomUUID()}`;
    const child = spawn(
      '/bin/sh',
      ['-c', `ulimit -c 0 && exec "${process.execPath}" -e "${KEEP_ALIVE_SCRIPT}" ${marker}`],
      { stdio: 'ignore' },
    );
    await once(child, 'spawn');

    try {
      await expect.poll(() => coreLimitsOfProcessesWith(marker)).toEqual([0]);
      expect(await coreLimitsOfProcessesWith(`${marker}-none`)).toEqual([]);
    } finally {
      child.kill();
    }
  });
});
