import type { Locator } from 'playwright-core';
import type { StepOf } from '../../config/steps.js';
import { redact } from '../../shared/redact.js';
import { sleep } from '../../shared/time.js';
import { aimPoint, moveToTarget, prepareTarget, type PreparedTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';
import { describeTarget, stepFailed } from '../locate.js';

const LIST_ATTRIBUTE = 'data-cursorcam-list';
const LIST_OPEN_MS = 350;
const MAX_LISTED_OPTIONS = 12;

export async function select(context: ActionContext, step: StepOf<'select'>): Promise<void> {
  const labels = typeof step.select === 'string' ? [step.select] : step.select;
  const prepared = await prepareTarget(context, step.in, { enabled: true });
  await checkOptions(prepared.locator, labels, describeTarget(step.in));
  const [single] = labels;
  if (
    step.showList &&
    labels.length === 1 &&
    single !== undefined &&
    (await supportsInPageList(prepared))
  ) {
    await pickFromList(context, step, prepared, single);
    return;
  }
  const ready = await moveToTarget(context, step.in, prepared);
  context.events.log({ type: 'select', target: ready.box });
  await prepared.locator.selectOption(
    labels.map((label) => ({ label })),
    { timeout: context.timeoutMs },
  );
}

async function pickFromList(
  context: ActionContext,
  step: StepOf<'select'>,
  prepared: PreparedTarget,
  label: string,
): Promise<void> {
  await prepared.locator.evaluate((element, attribute) => {
    const key = '__cursorCamListSheet';
    const registry = window as unknown as Record<string, CSSStyleSheet | undefined>;
    if (!registry[key]) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        `select[${attribute}], select[${attribute}]::picker(select) { appearance: base-select; }`,
      );
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      registry[key] = sheet;
    }
    element.setAttribute(attribute, '');
  }, LIST_ATTRIBUTE);
  const opened = await moveToTarget(context, step.in, prepared);
  await context.pointer.click(opened.box);
  await sleep(LIST_OPEN_MS);

  const option = prepared.locator.locator('option').filter({ hasText: label }).first();
  const box = await option.boundingBox();
  if (!box) throw stepFailed(`The list for ${describeTarget(step.in)} did not open.`);
  await context.pointer.moveTo(aimPoint(box, context.session.identity.viewport), context.speed);
  await context.pointer.click(box);
}

async function supportsInPageList(prepared: PreparedTarget): Promise<boolean> {
  return prepared.locator.evaluate(
    (element) =>
      element instanceof HTMLSelectElement &&
      !element.multiple &&
      CSS.supports('appearance', 'base-select'),
  );
}

async function checkOptions(
  locator: Locator,
  labels: readonly string[],
  target: string,
): Promise<void> {
  const options = await locator.evaluate((element) =>
    element instanceof HTMLSelectElement
      ? [...element.options].map((option) => option.label)
      : null,
  );
  if (options === null) {
    throw stepFailed(
      `${target} is not a <select>.`,
      'Use click steps to open a custom menu and pick an item.',
    );
  }
  const missing = labels.filter((label) => !options.includes(label));
  if (missing.length === 0) return;
  const listed = options
    .slice(0, MAX_LISTED_OPTIONS)
    .map((option) => `"${redact(option)}"`)
    .join(', ');
  throw stepFailed(
    `${target} has no option "${redact(missing.join('", "'))}". Options: ${listed}.`,
  );
}
