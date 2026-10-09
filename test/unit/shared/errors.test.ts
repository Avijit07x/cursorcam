import { describe, expect, it } from 'vitest';
import { exitCodeOf, messageOf, CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

describe('CursorCamError', () => {
  it('keeps its exit code, hint and cause', () => {
    const cause = new Error('root');
    const error = new CursorCamError('failed', {
      exitCode: ExitCode.NoBrowser,
      hint: 'install Chrome',
      cause,
    });

    expect(error.exitCode).toBe(ExitCode.NoBrowser);
    expect(error.hint).toBe('install Chrome');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('CursorCamError');
  });
});

describe('exitCodeOf', () => {
  it('uses the exit code of a CursorCamError', () => {
    expect(exitCodeOf(new CursorCamError('x', { exitCode: ExitCode.DiskFull }))).toBe(
      ExitCode.DiskFull,
    );
  });

  it('treats any other error as internal', () => {
    expect(exitCodeOf(new Error('x'))).toBe(ExitCode.Internal);
    expect(exitCodeOf('x')).toBe(ExitCode.Internal);
  });
});

describe('messageOf', () => {
  it('reads messages from errors and other values', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
    expect(messageOf(42)).toBe('42');
  });
});
