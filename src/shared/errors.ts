import { ExitCode } from './exit-codes.js';

interface CursorCamErrorOptions {
  readonly exitCode: ExitCode;
  readonly hint?: string | undefined;
  readonly cause?: unknown;
}

export class CursorCamError extends Error {
  override readonly name = 'CursorCamError';
  readonly exitCode: ExitCode;
  readonly hint: string | undefined;

  constructor(message: string, { exitCode, hint, cause }: CursorCamErrorOptions) {
    super(message, { cause });
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export function exitCodeOf(error: unknown): ExitCode {
  return error instanceof CursorCamError ? error.exitCode : ExitCode.Internal;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
