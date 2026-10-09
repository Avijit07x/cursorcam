import { afterEach, describe, expect, it } from 'vitest';
import { clearSecrets, redact, redactUrl, registerSecret } from '../../../src/shared/redact.js';

describe('redact', () => {
  afterEach(() => {
    clearSecrets();
  });

  it('hides registered values, longest first', () => {
    registerSecret('abc');
    registerSecret('abcdef');
    registerSecret('');

    expect(redact('x abcdef y abc')).toBe('x ••• y •••');
  });

  it('hides secret-looking query values and passwords in URLs', () => {
    expect(redactUrl('https://a.test/cb?code=123&page=2&access_token=xyz')).toBe(
      'https://a.test/cb?code=•••&page=2&access_token=•••',
    );
    expect(redactUrl('https://user:pw@a.test/')).toBe('https://user:•••@a.test/');
  });

  it('hides registered values that appear encoded in URLs', () => {
    registerSecret('p@ss word');

    expect(redactUrl('https://a.test/?q=p%40ss%20word')).toBe('https://a.test/?q=•••');
    expect(redactUrl('not a url p@ss word')).toBe('not a url •••');
  });
});
