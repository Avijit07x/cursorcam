import { describe, expect, it } from 'vitest';
import { isChallengeFrame, isChallengeTitle } from '../../../src/browser/blocked.js';

describe('challenge detection', () => {
  it('spots challenge page titles', () => {
    expect(isChallengeTitle('Just a moment...')).toBe(true);
    expect(isChallengeTitle(' Attention Required! | Cloudflare')).toBe(true);
    expect(isChallengeTitle('Just a moment of your time: pricing')).toBe(true);
    expect(isChallengeTitle('Dashboard')).toBe(false);
  });

  it('spots visible captcha frames but not invisible score checks', () => {
    expect(isChallengeFrame('https://challenges.cloudflare.com/cdn-cgi/challenge-platform/x')).toBe(
      true,
    );
    expect(isChallengeFrame('https://www.google.com/recaptcha/api2/anchor?k=1&size=normal')).toBe(
      true,
    );
    expect(isChallengeFrame('https://www.google.com/recaptcha/api2/bframe?k=1')).toBe(true);
    expect(
      isChallengeFrame('https://www.google.com/recaptcha/api2/anchor?k=1&size=invisible'),
    ).toBe(false);
    expect(isChallengeFrame('https://newassets.hcaptcha.com/captcha/v1/abc')).toBe(true);
    expect(isChallengeFrame('https://example.com/recaptcha')).toBe(false);
  });
});
