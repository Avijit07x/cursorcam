import type { CheckResult, CheckStatus } from '../doctor/checks.js';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { redact } from '../shared/redact.js';

const STATUS_SYMBOLS: Readonly<Record<CheckStatus, string>> = { ok: '✓', warn: '!', fail: '✗' };
const NAME_COLUMN_WIDTH = 13;
const DETAIL_INDENT = ' '.repeat(2);

export function printError(error: unknown): void {
  const lines = [`Error: ${messageOf(error)}`];
  if (error instanceof CursorCamError) {
    if (error.hint) lines.push(`Fix: ${error.hint}`);
    if (error.cause !== undefined) lines.push(`Cause: ${messageOf(error.cause).split('\n')[0]}`);
  } else if (error instanceof Error && error.stack) {
    lines.push(error.stack);
  }
  process.stderr.write(`${redact(lines.join('\n'))}\n`);
}

export function formatChecks(results: readonly CheckResult[]): string {
  return results
    .flatMap((result) => {
      const line = `${STATUS_SYMBOLS[result.status]} ${result.name.padEnd(NAME_COLUMN_WIDTH)} ${result.detail}`;
      return result.fix ? [line, `${DETAIL_INDENT}Fix: ${result.fix}`] : [line];
    })
    .join('\n');
}
