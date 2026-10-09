import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatChecks, printError } from '../../../src/cli/output.js';
import { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

describe('formatChecks', () => {
  it('prints one line per check, plus a fix line when there is one', () => {
    const text = formatChecks([
      { name: 'Node.js', status: 'ok', detail: '24.11.0' },
      { name: 'Fonts', status: 'warn', detail: 'No CJK font found', fix: 'Install fonts-noto-cjk' },
      { name: 'Browser', status: 'fail', detail: 'Not found' },
    ]);

    expect(text.split('\n')).toEqual([
      '✓ Node.js       24.11.0',
      '! Fonts         No CJK font found',
      '  Fix: Install fonts-noto-cjk',
      '✗ Browser       Not found',
    ]);
  });
});

describe('printError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the message, fix and first line of the cause', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const error = new CursorCamError('Could not start the browser', {
      exitCode: ExitCode.NoBrowser,
      hint: 'Try another browser.',
      cause: new Error('spawn failed\nstack line'),
    });

    printError(error);

    expect(write).toHaveBeenCalledWith(
      'Error: Could not start the browser\nFix: Try another browser.\nCause: spawn failed\n',
    );
  });
});
