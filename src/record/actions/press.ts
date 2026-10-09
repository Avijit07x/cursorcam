import type { StepOf } from '../../config/steps.js';
import type { ActionContext } from '../context.js';
import { keyChord } from '../keyboard.js';

export async function press(context: ActionContext, step: StepOf<'press'>): Promise<void> {
  await context.session.page.keyboard.press(keyChord(step.press));
  context.events.log({ type: 'key', key: step.press });
}
