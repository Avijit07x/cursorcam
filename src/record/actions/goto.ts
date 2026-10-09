import type { StepOf } from '../../config/steps.js';
import { resolveStepUrl } from '../../config/urls.js';
import type { ActionContext } from '../context.js';
import { openUrl } from '../waits.js';

export async function goto(context: ActionContext, step: StepOf<'goto'>): Promise<void> {
  const { url, allowOrigins } = context.plan.header;
  await openUrl(
    context.session.page,
    resolveStepUrl(url, step.goto, allowOrigins),
    context.timeoutMs,
  );
}
