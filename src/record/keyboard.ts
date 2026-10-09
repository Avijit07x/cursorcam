import type { Page } from 'playwright-core';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { sleep } from '../shared/time.js';

const TYPE_DELAY_MS = 55;
const FAST_TYPE_DELAY_MS = 8;
const FAST_AFTER_CHARS = 60;
const MOD_KEY = 'Mod';
const PLATFORM_MOD_KEY = 'ControlOrMeta';
const CHORD_SEPARATOR = '+';

export function splitForTyping(text: string): string[] {
  return [...text];
}

export function isFastTyping(text: string): boolean {
  return splitForTyping(text).length > FAST_AFTER_CHARS;
}

export function typingDelay(text: string, speed = 1): number {
  return (isFastTyping(text) ? FAST_TYPE_DELAY_MS : TYPE_DELAY_MS) / speed;
}

export function keyChord(key: string): string {
  const parts = key.split(CHORD_SEPARATOR).map((part) => part.trim());
  if (parts.some((part) => part === '') && key !== CHORD_SEPARATOR) {
    throw new CursorCamError(`"${key}" is not a valid key. Use names like Enter, Tab or Mod+K.`, {
      exitCode: ExitCode.BadInput,
    });
  }
  return parts.map((part) => (part === MOD_KEY ? PLATFORM_MOD_KEY : part)).join(CHORD_SEPARATOR);
}

export async function typeText(page: Page, text: string, delayMs: number): Promise<void> {
  const start = performance.now();
  const characters = splitForTyping(text);
  for (const [index, character] of characters.entries()) {
    await page.keyboard.type(character);
    await sleep(start + (index + 1) * delayMs - performance.now());
  }
}
