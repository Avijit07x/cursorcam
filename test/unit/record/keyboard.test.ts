import { describe, expect, it } from 'vitest';
import {
  isFastTyping,
  keyChord,
  splitForTyping,
  typingDelay,
} from '../../../src/record/keyboard.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';

describe('keyboard', () => {
  it('splits text into code points, keeping emoji whole', () => {
    expect(splitForTyping('a🚀é')).toEqual(['a', '🚀', 'é']);
    expect(splitForTyping('🇮🇳')).toHaveLength(2);
  });

  it('types long text fast so the render can speed it up', () => {
    expect(isFastTyping('short')).toBe(false);
    expect(isFastTyping('x'.repeat(61))).toBe(true);
    expect(typingDelay('short')).toBe(55);
    expect(typingDelay('x'.repeat(61))).toBe(8);
    expect(typingDelay('short', 2)).toBe(27.5);
  });

  it('maps Mod to Cmd on macOS and Ctrl elsewhere', () => {
    expect(keyChord('Mod+K')).toBe('ControlOrMeta+K');
    expect(keyChord('Shift + Tab')).toBe('Shift+Tab');
    expect(keyChord('+')).toBe('+');
    expect(() => keyChord('Mod+')).toThrow(
      expect.objectContaining({ exitCode: ExitCode.BadInput }),
    );
  });
});
