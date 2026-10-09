const NO_SUCH_PROCESS = 'ESRCH';

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== NO_SUCH_PROCESS;
  }
}
