import { exitCodeOf } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { Lifecycle, onShutdownSignal } from '../system/lifecycle.js';
import { printError } from './output.js';

type Action = (lifecycle: Lifecycle) => Promise<ExitCode>;

const FINISH_AFTER_SIGNAL_MS = 1_000;

export async function runAction(action: Action): Promise<void> {
  const lifecycle = new Lifecycle();
  let interrupted = false;
  let settled = false;
  let forceExit: NodeJS.Timeout | undefined;
  const stopListening = onShutdownSignal(() => {
    interrupted = true;
    void lifecycle
      .dispose()
      .catch(printError)
      .finally(() => {
        if (settled) return;
        forceExit = setTimeout(() => process.exit(ExitCode.Interrupted), FINISH_AFTER_SIGNAL_MS);
      });
  });

  try {
    process.exitCode = await action(lifecycle);
  } catch (error) {
    printError(error);
    process.exitCode = exitCodeOf(error);
  } finally {
    settled = true;
    clearTimeout(forceExit);
    stopListening();
    await lifecycle.dispose().catch(printError);
    if (interrupted) process.exitCode = ExitCode.Interrupted;
  }
}
