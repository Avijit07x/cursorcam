type Disposer = () => Promise<void> | void;

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

export class Lifecycle {
  readonly #disposers: Disposer[] = [];
  #disposed = false;

  get stopping(): boolean {
    return this.#disposed;
  }

  add(disposer: Disposer): void {
    this.#disposers.push(disposer);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors: unknown[] = [];
    for (const disposer of this.#disposers.toReversed()) {
      try {
        await disposer();
      } catch (error) {
        errors.push(error);
      }
    }
    this.#disposers.length = 0;
    if (errors.length > 0) throw new AggregateError(errors, 'Cleanup failed');
  }
}

export function onShutdownSignal(handler: (signal: NodeJS.Signals) => void): () => void {
  for (const signal of SHUTDOWN_SIGNALS) process.once(signal, handler);
  return () => {
    for (const signal of SHUTDOWN_SIGNALS) process.off(signal, handler);
  };
}
