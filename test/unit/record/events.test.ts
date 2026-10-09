import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createClock, EventLog } from '../../../src/record/events.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('EventLog', () => {
  const dir = useTempDir();

  it('appends one JSON line per event with both clocks', async () => {
    const file = join(dir.path(), 'events.jsonl');
    const log = new EventLog({ now: () => 12.345 }, file, vi.fn());
    log.log({ type: 'key', key: 'Enter' });
    log.log({ type: 'warning', message: 'careful' });
    await log.close();

    const lines = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(lines).toEqual([
      { type: 'key', key: 'Enter', t: 12.3, wall: expect.any(Number) as number },
      { type: 'warning', message: 'careful', t: 12.3, wall: expect.any(Number) as number },
    ]);
    expect(log.warnings).toEqual(['careful']);
  });

  it('collects warnings even without a file', async () => {
    const log = new EventLog(createClock(), undefined, vi.fn());
    log.log({ type: 'warning', message: 'w' });
    await log.close();

    expect(log.warnings).toEqual(['w']);
  });

  it('reports a file that cannot be written', async () => {
    const onError = vi.fn();
    const log = new EventLog(createClock(), join(dir.path(), 'missing', 'events.jsonl'), onError);
    log.log({ type: 'key', key: 'a' });
    await log.close();

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
