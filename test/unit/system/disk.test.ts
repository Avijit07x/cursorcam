import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { freeBytes } from '../../../src/system/disk.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('freeBytes', () => {
  const temp = useTempDir();

  it('reports free space and creates the folder when missing', async () => {
    const bytes = await freeBytes(join(temp.path(), 'nested', 'dir'));

    expect(bytes).toBeGreaterThan(0);
  });
});
