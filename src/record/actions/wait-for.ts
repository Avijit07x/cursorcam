import type { StepOf } from '../../config/steps.js';
import type { ActionContext } from '../context.js';
import { waitForGone, waitForVisible } from '../locate.js';

export async function waitFor(context: ActionContext, step: StepOf<'waitFor'>): Promise<void> {
  const { page } = context.session;
  if (step.state === 'hidden') await waitForGone(page, step.waitFor, context.timeoutMs);
  else await waitForVisible(page, step.waitFor, context.timeoutMs);
}
