import type { Locator } from 'playwright-core';
import type { StepOf } from '../../config/steps.js';
import type { ActionContext } from '../context.js';
import { locate } from '../locate.js';
import { revealTarget, scrollContainer } from '../scroll.js';

const DOCUMENT_SELECTOR = 'html';

export async function scroll(context: ActionContext, step: StepOf<'scroll'>): Promise<void> {
  const { page } = context.session;
  const options = { timeoutMs: context.timeoutMs };
  const container = (): Promise<Locator> =>
    step.in ? locate(page, step.in, options) : Promise.resolve(page.locator(DOCUMENT_SELECTOR));
  const how = step.scroll;
  if ('by' in how) {
    await scrollContainer(context, await container(), how.by);
    return;
  }
  if (how.to === 'top' || how.to === 'bottom') {
    await scrollContainer(context, await container(), how.to);
    return;
  }
  await revealTarget(context, await locate(page, how.to, options), 'center');
}
