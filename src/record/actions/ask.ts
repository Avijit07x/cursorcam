import type { StepOf } from '../../config/steps.js';
import { registerSecret } from '../../shared/redact.js';
import type { ActionContext } from '../context.js';
import { typeInto } from './type.js';

export async function ask(context: ActionContext, step: StepOf<'ask'>): Promise<void> {
  context.events.log({ type: 'ask', phase: 'wait', label: step.ask });
  const answer = await context.answers.waitForAnswer(step.ask);
  registerSecret(answer);
  context.events.log({ type: 'ask', phase: 'done', label: step.ask });
  await typeInto(context, step.into, { text: answer, secret: true });
}
