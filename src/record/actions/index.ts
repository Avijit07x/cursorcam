import { actionOf } from '../../config/load-steps.js';
import type { ActionName, Step, StepOf } from '../../config/steps.js';
import type { ActionContext } from '../context.js';
import { ask } from './ask.js';
import { click, dblclick } from './click.js';
import { drag } from './drag.js';
import { goto } from './goto.js';
import { hover } from './hover.js';
import { pause } from './pause.js';
import { press } from './press.js';
import { scroll } from './scroll.js';
import { select } from './select.js';
import { type } from './type.js';
import { upload } from './upload.js';
import { waitFor } from './wait-for.js';

type ActionHandlers = {
  readonly [Name in ActionName]: (context: ActionContext, step: StepOf<Name>) => Promise<void>;
};

const ACTIONS: ActionHandlers = {
  goto,
  click,
  dblclick,
  hover,
  type,
  press,
  select,
  upload,
  scroll,
  drag,
  waitFor,
  pause,
  ask,
};

export function performStep(context: ActionContext, step: Step): Promise<void> {
  const handler = ACTIONS[actionOf(step)] as (context: ActionContext, step: Step) => Promise<void>;
  return handler(context, step);
}
