import { describe, expect, it, vi } from 'vitest';
import { Lifecycle, onShutdownSignal } from '../../../src/system/lifecycle.js';

describe('Lifecycle', () => {
  it('disposes in reverse order, once', async () => {
    const lifecycle = new Lifecycle();
    const order: string[] = [];
    lifecycle.add(() => {
      order.push('first');
    });
    lifecycle.add(() => {
      order.push('second');
      return Promise.resolve();
    });

    await lifecycle.dispose();
    await lifecycle.dispose();

    expect(order).toEqual(['second', 'first']);
  });

  it('reports stopping from the moment dispose starts', async () => {
    const lifecycle = new Lifecycle();
    const seen: boolean[] = [];
    lifecycle.add(() => {
      seen.push(lifecycle.stopping);
    });

    expect(lifecycle.stopping).toBe(false);
    await lifecycle.dispose();

    expect(seen).toEqual([true]);
    expect(lifecycle.stopping).toBe(true);
  });

  it('runs every disposer even when one fails', async () => {
    const lifecycle = new Lifecycle();
    const after = vi.fn();
    lifecycle.add(after);
    lifecycle.add(() => {
      throw new Error('boom');
    });

    await expect(lifecycle.dispose()).rejects.toBeInstanceOf(AggregateError);
    expect(after).toHaveBeenCalledOnce();
  });
});

describe('onShutdownSignal', () => {
  it('adds and removes its listeners', () => {
    const before = process.listenerCount('SIGTERM');
    const stop = onShutdownSignal(() => undefined);

    expect(process.listenerCount('SIGTERM')).toBe(before + 1);
    stop();
    expect(process.listenerCount('SIGTERM')).toBe(before);
  });
});
