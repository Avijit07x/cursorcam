import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import {
  ACTION_NAMES,
  STEP_SCHEMAS,
  StepsFileSchema,
  type ActionName,
  type Step,
  type StepsFileHeader,
} from './steps.js';
import { resolveStepUrl } from './urls.js';
import { isValueReference, resolveText } from './values.js';

export interface StepsPlan {
  readonly header: StepsFileHeader;
  readonly steps: readonly Step[];
  readonly path: string;
  readonly dir: string;
}

const PHONE_UNSUPPORTED: ReadonlySet<ActionName> = new Set(['hover', 'drag']);
const ACTION_SET: ReadonlySet<string> = new Set(ACTION_NAMES);

export async function loadSteps(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StepsPlan> {
  const absolute = resolve(path);
  let text: string;
  try {
    text = await readFile(absolute, 'utf8');
  } catch (error) {
    throw badInput(`Could not read the steps file ${absolute}.`, messageOf(error));
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw badInput(`${absolute} is not valid JSON.`, messageOf(error));
  }
  return parseSteps(raw, absolute, env);
}

export function parseSteps(
  raw: unknown,
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): StepsPlan {
  const parsed = StepsFileSchema.safeParse(raw);
  if (!parsed.success) throw badInput(`${path} has errors:\n${z.prettifyError(parsed.error)}`);
  const { steps: rawSteps, ...header } = parsed.data;
  const steps = rawSteps.map((step, index) => parseStep(step, index));

  checkPhoneSteps(header.viewport, steps);
  checkGotoTargets(header, steps);
  checkValueReferences(header, steps, env);
  return { header, steps, path, dir: dirname(path) };
}

export function actionOf(step: Step): ActionName {
  const action = ACTION_NAMES.find((name) => name in step);
  if (!action) throw new Error('A parsed step always has one action.');
  return action;
}

function parseStep(raw: unknown, index: number): Step {
  const label = `Step ${index + 1}`;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw badInput(`${label} must be an object like { "click": "text=Save" }.`);
  }
  const actions = Object.keys(raw).filter((key) => ACTION_SET.has(key)) as ActionName[];
  const [action] = actions;
  if (actions.length !== 1 || !action) {
    const found = actions.length === 0 ? 'no action' : `${actions.join(', ')}`;
    throw badInput(
      `${label} needs exactly one action, but has ${found}.`,
      `Actions: ${ACTION_NAMES.join(', ')}.`,
    );
  }
  const result = STEP_SCHEMAS[action].safeParse(raw);
  if (!result.success) {
    throw badInput(`${label} (${action}) has errors:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function checkPhoneSteps(viewport: StepsFileHeader['viewport'], steps: readonly Step[]): void {
  if (viewport !== 'phone') return;
  steps.forEach((step, index) => {
    const action = actionOf(step);
    if (PHONE_UNSUPPORTED.has(action)) {
      throw badInput(
        `Step ${index + 1} uses ${action}, which phones cannot do.`,
        'Use click (a tap) instead.',
      );
    }
  });
}

function checkGotoTargets(header: StepsFileHeader, steps: readonly Step[]): void {
  for (const step of steps) {
    if ('goto' in step) resolveStepUrl(header.url, step.goto, header.allowOrigins);
  }
}

function checkValueReferences(
  header: StepsFileHeader,
  steps: readonly Step[],
  env: NodeJS.ProcessEnv,
): void {
  const values = steps.flatMap((step) => ('type' in step ? [step.type] : []));
  if (header.httpCredentials) {
    values.push(header.httpCredentials.username, header.httpCredentials.password);
  }
  for (const value of values) {
    if (isValueReference(value)) resolveText(value, env);
  }
}

function badInput(message: string, hint?: string): CursorCamError {
  return new CursorCamError(message, { exitCode: ExitCode.BadInput, hint });
}
