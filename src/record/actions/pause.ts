import type { StepOf } from '../../config/steps.js';
import { sleep } from '../../shared/time.js';
import type { ActionContext } from '../context.js';

export async function pause(_: ActionContext, step: StepOf<'pause'>): Promise<void> {
  await sleep(step.pause);
}
