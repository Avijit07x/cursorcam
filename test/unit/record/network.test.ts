import { describe, expect, it } from 'vitest';
import { activeCount, isTracked } from '../../../src/record/network.js';

describe('network quiet rules', () => {
  it('ignores streams, sockets and media', () => {
    for (const type of ['websocket', 'eventsource', 'media', 'ping'])
      expect(isTracked(type)).toBe(false);
    for (const type of ['fetch', 'xhr', 'document', 'script', 'image', 'font'])
      expect(isTracked(type)).toBe(true);
  });

  it('stops counting requests that stay open a long time', () => {
    const now = 20_000;
    expect(activeCount([{ start: 19_000 }, { start: 16_000 }, { start: 10_000 }], now)).toBe(2);
    expect(activeCount([], now)).toBe(0);
  });
});
