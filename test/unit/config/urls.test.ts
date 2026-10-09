import { describe, expect, it } from 'vitest';
import { isLocalUrl, parseWebUrl, resolveStepUrl } from '../../../src/config/urls.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

const BASE = 'http://localhost:3000/app/';

describe('resolveStepUrl', () => {
  it('resolves paths against the steps url', () => {
    expect(resolveStepUrl(BASE, '/pricing')).toBe('http://localhost:3000/pricing');
    expect(resolveStepUrl(BASE, 'settings?tab=2')).toBe('http://localhost:3000/app/settings?tab=2');
  });

  it('allows other origins only when listed', () => {
    expect(() => resolveStepUrl(BASE, 'https://example.com/x')).toThrow(
      expect.objectContaining({
        exitCode: ExitCode.BadInput,
        hint: 'Add "https://example.com" to allowOrigins in the steps file.',
      }),
    );
    expect(resolveStepUrl(BASE, 'https://example.com/x', ['https://example.com'])).toBe(
      'https://example.com/x',
    );
  });

  it('refuses other protocols', () => {
    expect(() => resolveStepUrl(BASE, 'javascript:alert(1)')).toThrow('must use http or https');
  });
});

describe('parseWebUrl', () => {
  it('accepts web addresses and refuses the rest', () => {
    expect(parseWebUrl('https://example.com').hostname).toBe('example.com');
    expect(() => parseWebUrl('localhost:3000')).toThrow('must use http or https');
    expect(() => parseWebUrl('not a url')).toThrow('is not a valid URL');
  });
});

describe('isLocalUrl', () => {
  it.each([
    ['http://localhost:3000', true],
    ['https://127.0.0.1:8443', true],
    ['http://[::1]:3000', true],
    ['http://app.localhost', true],
    ['https://example.com', false],
    ['http://10.0.0.5', false],
  ])('%s is local: %s', (url, local) => {
    expect(isLocalUrl(url)).toBe(local);
  });
});
