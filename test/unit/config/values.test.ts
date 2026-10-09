import { afterEach, describe, expect, it } from 'vitest';
import { isValueReference, resolveText } from '../../../src/config/values.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { clearSecrets, redact } from '../../../src/shared/redact.js';

describe('resolveText', () => {
  afterEach(() => {
    clearSecrets();
  });

  it('keeps plain text as it is', () => {
    expect(resolveText('hello $secret:x')).toEqual({ text: 'hello $secret:x', secret: false });
    expect(isValueReference('hello')).toBe(false);
  });

  it('reads $secret: values from CURSORCAM_SECRET_ variables and hides them from now on', () => {
    expect(resolveText('$secret:password', { CURSORCAM_SECRET_PASSWORD: 'p4ss' })).toEqual({
      text: 'p4ss',
      secret: true,
    });
    expect(redact('typed p4ss')).toBe('typed •••');
  });

  it('reads $env: values from the named variable', () => {
    expect(resolveText('$env:DEMO_USER', { DEMO_USER: 'robin' })).toEqual({
      text: 'robin',
      secret: true,
    });
  });

  it('names the missing variable without guessing a value', () => {
    expect(() => resolveText('$secret:token', {})).toThrow(
      expect.objectContaining({
        exitCode: ExitCode.BadInput,
        message: 'The steps use $secret:token, but CURSORCAM_SECRET_TOKEN is not set.',
      }),
    );
  });
});
