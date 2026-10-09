import type { StepOf, Target } from '../../config/steps.js';
import { moveToTarget, prepareTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';

export async function clickTarget(
  context: ActionContext,
  target: Target,
  count: number,
): Promise<void> {
  const prepared = await prepareTarget(context, target, { enabled: true });
  const ready = await moveToTarget(context, target, prepared);
  await context.pointer.click(ready.box, count);
}

export function click(context: ActionContext, step: StepOf<'click'>): Promise<void> {
  return clickTarget(context, step.click, 1);
}

export function dblclick(context: ActionContext, step: StepOf<'dblclick'>): Promise<void> {
  return clickTarget(context, step.dblclick, 2);
}
