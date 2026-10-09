import type { StepOf } from '../../config/steps.js';
import { sleep } from '../../shared/time.js';
import { moveToTarget, prepareTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';

const HOVER_HOLD_MS = 600;

export async function hover(context: ActionContext, step: StepOf<'hover'>): Promise<void> {
  const prepared = await prepareTarget(context, step.hover);
  const ready = await moveToTarget(context, step.hover, prepared);
  context.events.log({ type: 'hover', target: ready.box });
  await sleep(HOVER_HOLD_MS / context.speed);
}
