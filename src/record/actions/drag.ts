import type { StepOf } from '../../config/steps.js';
import { sleep } from '../../shared/time.js';
import { aimPoint, moveToTarget, prepareTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';
import { describeTarget, locate, stepFailed } from '../locate.js';

const DRAG_SPEED = 0.6;
const GRAB_PAUSE_MS = 120;
const DROP_PAUSE_MS = 150;

export async function drag(context: ActionContext, step: StepOf<'drag'>): Promise<void> {
  const source = await prepareTarget(context, step.drag, { enabled: true });
  const grabbed = await moveToTarget(context, step.drag, source);
  await context.pointer.down();
  context.events.log({ type: 'drag', phase: 'start', ...grabbed.point });
  await sleep(GRAB_PAUSE_MS);

  const destination = await locate(context.session.page, step.to, { timeoutMs: context.timeoutMs });
  const box = await destination.boundingBox();
  if (!box)
    throw stepFailed(`${describeTarget(step.to)} is not visible, so nothing can be dropped on it.`);
  const drop = aimPoint(box, context.session.identity.viewport);
  await context.pointer.moveTo(drop, context.speed * DRAG_SPEED);
  await sleep(DROP_PAUSE_MS);
  await context.pointer.up();
  context.events.log({ type: 'drag', phase: 'end', ...drop });
}
