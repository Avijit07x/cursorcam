import { exitCodeOf } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { Lifecycle, onShutdownSignal } from '../system/lifecycle.js';
import { printError } from './output.js';

type Action = (lifecycle: Lifecycle) => Promise<ExitCode>;

export async function runAction(action: Action): Promise<void> {
  const lifecycle = new Lifecycle();
  const stopListening = onShutdownSignal(() => {
    void lifecycle
      .dispose()
      .catch(printError)
      .finally(() => process.exit(ExitCode.Interrupted));
  });

  try {
    process.exitCode = await action(lifecycle);
  } catch (error) {
    printError(error);
    process.exitCode = exitCodeOf(error);
  } finally {
    stopListening();
    await lifecycle.dispose().catch(printError);
  }
}
