import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { retryWhileBusy, writeJsonAtomic } from '../../../src/runs/files.js';
import { useTempDir } from '../../helpers/temp-dir.js';

function busyError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

describe('retryWhileBusy', () => {
  it('retries a file Windows holds for a moment', async () => {
    const work = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(busyError('EPERM'))
      .mockRejectedValueOnce(busyError('EBUSY'))
      .mockResolvedValue('done');

    await expect(retryWhileBusy(work, 'win32')).resolves.toBe('done');
    expect(work).toHaveBeenCalledTimes(3);
  });

  it('fails at once elsewhere, and for other errors', async () => {
    const denied = vi.fn<() => Promise<void>>().mockRejectedValue(busyError('EPERM'));
    const missing = vi.fn<() => Promise<void>>().mockRejectedValue(busyError('ENOENT'));

    await expect(retryWhileBusy(denied, 'linux')).rejects.toMatchObject({ code: 'EPERM' });
    await expect(retryWhileBusy(missing, 'win32')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(denied).toHaveBeenCalledOnce();
    expect(missing).toHaveBeenCalledOnce();
  });
});

describe('writeJsonAtomic', () => {
  const temp = useTempDir();

  it('writes the whole file', async () => {
    const file = join(temp.path(), 'status.json');

    await writeJsonAtomic(file, { state: 'done' });

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ state: 'done' });
  });
});
