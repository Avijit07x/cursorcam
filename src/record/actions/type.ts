import type { Locator } from 'playwright-core';
import { MASK_BLUR } from '../../browser/handlers.js';
import type { StepOf, Target } from '../../config/steps.js';
import { resolveText, type TextValue } from '../../config/values.js';
import { redact } from '../../shared/redact.js';
import { moveToTarget, prepareTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';
import { isFastTyping, keyChord, splitForTyping, typeText, typingDelay } from '../keyboard.js';
import { callHelper, type FieldInfo } from '../page-scripts.js';

const SELECT_ALL = 'Mod+A';
const DELETE_KEY = 'Backspace';
const CHECKED_FIELD_KINDS: ReadonlySet<FieldInfo['kind']> = new Set([
  'input',
  'textarea',
  'editable',
]);

export interface TypeOptions {
  readonly paste?: boolean | undefined;
  readonly clear?: boolean | undefined;
}

export async function type(context: ActionContext, step: StepOf<'type'>): Promise<void> {
  await typeInto(context, step.into, resolveText(step.type, context.env), step);
}

export async function typeInto(
  context: ActionContext,
  target: Target,
  value: TextValue,
  options: TypeOptions = {},
): Promise<void> {
  const { page } = context.session;
  const prepared = await prepareTarget(context, target, { enabled: true });
  let field = await callHelper(prepared.locator, 'readField');
  if (!field.focused) {
    const ready = await moveToTarget(context, target, prepared);
    await context.pointer.click(ready.box);
    field = await callHelper(prepared.locator, 'readField');
  }
  if (value.secret && !isPasswordField(field))
    await callHelper(prepared.locator, 'blur', MASK_BLUR);

  const clearing = field.value !== '' && options.clear !== false;
  if (clearing) {
    await page.keyboard.press(keyChord(SELECT_ALL));
    await page.keyboard.press(DELETE_KEY);
  }
  const before = clearing ? '' : field.value;
  const fast = !options.paste && isFastTyping(value.text);
  const chars = splitForTyping(value.text).length;
  context.events.log({ type: 'typing', phase: 'start', target: prepared.box, fast, chars });
  if (options.paste) await page.keyboard.insertText(value.text);
  else await typeText(page, value.text, typingDelay(value.text, context.speed));
  context.events.log({ type: 'typing', phase: 'end', target: prepared.box, fast, chars });
  await checkTypedValue(context, prepared.locator, `${before}${value.text}`, value.secret);
}

function isPasswordField(field: FieldInfo): boolean {
  return field.kind === 'input' && field.type === 'password';
}

async function checkTypedValue(
  context: ActionContext,
  locator: Locator,
  expected: string,
  secret: boolean,
): Promise<void> {
  const field = await callHelper(locator, 'readField');
  if (!CHECKED_FIELD_KINDS.has(field.kind) || field.value === expected) return;
  const message = secret
    ? 'A field shows different text than was typed. A length limit or input mask may have changed it.'
    : `A field shows "${redact(field.value)}" instead of "${redact(expected)}". A length limit or input mask may have changed it.`;
  context.events.log({ type: 'warning', message });
}
