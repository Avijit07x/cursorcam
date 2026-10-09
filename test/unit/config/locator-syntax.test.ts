import { describe, expect, it } from 'vitest';
import {
  formatLocator,
  LocatorSyntaxError,
  parseLocator,
} from '../../../src/config/locator-syntax.js';

describe('parseLocator', () => {
  it.each([
    ["role=button[name='Get started']", { kind: 'role', role: 'button', name: 'Get started' }],
    ['role=button[name="It\'s on"]', { kind: 'role', role: 'button', name: "It's on" }],
    ['role=Link', { kind: 'role', role: 'link' }],
    ['label=Email', { kind: 'label', value: 'Email' }],
    ['text="Sign in"', { kind: 'text', value: 'Sign in' }],
    ['placeholder=Search', { kind: 'placeholder', value: 'Search' }],
    ['testid=save-button', { kind: 'testid', value: 'save-button' }],
    ['alt=Logo', { kind: 'alt', value: 'Logo' }],
    ['title=Close', { kind: 'title', value: 'Close' }],
    ['css=#app > button', { kind: 'css', selector: '#app > button' }],
    ['.card a[href="x=y"]', { kind: 'css', selector: '.card a[href="x=y"]' }],
  ])('reads %s', (source, expected) => {
    expect(parseLocator(source)).toEqual(expected);
  });

  it.each(['', '   ', 'role=button[name=Save]', 'label=', 'text=""'])('rejects %j', (source) => {
    expect(() => parseLocator(source)).toThrow(LocatorSyntaxError);
  });

  it('writes locators back in the same syntax', () => {
    expect(formatLocator({ kind: 'role', role: 'button', name: 'Save' })).toBe(
      "role=button[name='Save']",
    );
    expect(formatLocator({ kind: 'role', role: 'button', name: "It's" })).toBe(
      'role=button[name="It\'s"]',
    );
    expect(formatLocator({ kind: 'role', role: 'link' })).toBe('role=link');
    expect(formatLocator({ kind: 'label', value: 'Email' })).toBe('label=Email');
    expect(formatLocator({ kind: 'css', selector: '#id' })).toBe('#id');
  });
});
