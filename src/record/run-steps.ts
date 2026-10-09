import { actionOf } from '../config/load-steps.js';
import type { ActionName, Step } from '../config/steps.js';
import { messageOf, CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { redact } from '../shared/redact.js';
import { sleep, withTimeout } from '../shared/time.js';
import { performStep } from './actions/index.js';
import type { ActionContext } from './context.js';
import { describeTarget, stepFailed } from './locate.js';
import type { NetworkTracker } from './network.js';
import { NavigationWatch } from './waits.js';

const STEP_SLACK_MS = 10_000;
const WAIT_PHASES_PER_STEP = 3;
const ASK_BUDGET_MS = 5 * 60 * 1000;
const MS_PER_SECOND = 1000;
export const DEFAULT_PAUSE_AFTER_MS = 700;
const NO_PAUSE_AFTER: ReadonlySet<ActionName> = new Set(['pause', 'waitFor']);

export class StepFailure extends CursorCamError {
  readonly stepIndex: number;

  constructor(stepIndex: number, step: Step, error: unknown) {
    const reason = error instanceof CursorCamError ? error.message : firstLine(messageOf(error));
    super(`Step ${stepIndex + 1} (${describeStep(step)}): ${redact(reason)}`, {
      exitCode: error instanceof CursorCamError ? error.exitCode : ExitCode.StepFailed,
      hint: error instanceof CursorCamError ? error.hint : undefined,
      cause: error instanceof CursorCamError ? error.cause : error,
    });
    this.stepIndex = stepIndex;
  }
}

export interface StepHooks {
  readonly onStart?: (index: number, step: Step) => Promise<void>;
  readonly onEnd?: (index: number, step: Step) => Promise<void>;
}

export function stepBudget(step: Step, timeoutMs: number): number {
  if ('pause' in step) return step.pause + STEP_SLACK_MS;
  const base = timeoutMs * WAIT_PHASES_PER_STEP + STEP_SLACK_MS;
  return 'ask' in step ? base + ASK_BUDGET_MS : base;
}

export function pauseAfterOf(step: Step): number {
  if (step.pauseAfter !== undefined) return step.pauseAfter;
  return NO_PAUSE_AFTER.has(actionOf(step)) ? 0 : DEFAULT_PAUSE_AFTER_MS;
}

export function describeStep(step: Step): string {
  const action = actionOf(step);
  if ('goto' in step) return `goto ${step.goto}`;
  if ('type' in step) return `type into ${describeTarget(step.into)}`;
  if ('press' in step) return `press ${step.press}`;
  if ('select' in step) return `select in ${describeTarget(step.in)}`;
  if ('upload' in step) return `upload into ${describeTarget(step.into)}`;
  if ('pause' in step) return `pause ${step.pause} ms`;
  if ('ask' in step) return `ask for ${step.ask}`;
  if ('scroll' in step) return 'scroll';
  if ('drag' in step) return `drag ${describeTarget(step.drag)}`;
  if ('waitFor' in step) return `waitFor ${describeTarget(step.waitFor)}`;
  if ('click' in step) return `click ${describeTarget(step.click)}`;
  if ('dblclick' in step) return `dblclick ${describeTarget(step.dblclick)}`;
  if ('hover' in step) return `hover ${describeTarget(step.hover)}`;
  return action;
}

export async function runSteps(
  context: ActionContext,
  network: NetworkTracker,
  hooks: StepHooks = {},
): Promise<void> {
  const { session, events, plan } = context;
  for (const [index, step] of plan.steps.entries()) {
    const action = actionOf(step);
    if (session.pageClosed) {
      throw new StepFailure(
        index,
        step,
        stepFailed('The page closed its own tab, so this step cannot run.'),
      );
    }
    await hooks.onStart?.(index, step);
    context.handlers.dialogPolicy = step.dialog ?? 'accept';
    const zoom = step.zoom === undefined ? {} : { zoom: step.zoom };
    events.log({ type: 'step', phase: 'start', index, action, ...zoom });
    const watch = new NavigationWatch(session, events);
    const pauseAfter = pauseAfterOf(step);
    try {
      const budget = stepBudget(step, context.timeoutMs);
      const work = performStep({ ...context, speed: step.speed ?? 1 }, step);
      await session.guard(withTimeout(work, budget, () => tooSlow(budget)));
      if (!session.pageClosed) await session.guard(watch.settle(network, context.timeoutMs));
      if (pauseAfter > 0) await session.guard(sleep(pauseAfter));
    } catch (error) {
      throw new StepFailure(index, step, error);
    } finally {
      watch.dispose();
    }
    const paused = pauseAfter > 0 ? { pauseAfter } : {};
    events.log({ type: 'step', phase: 'end', index, action, ...paused });
    await hooks.onEnd?.(index, step);
  }
}

function tooSlow(budgetMs: number): CursorCamError {
  return new CursorCamError(
    `The step did not finish within ${Math.round(budgetMs / MS_PER_SECOND)} s.`,
    {
      exitCode: ExitCode.Timeout,
    },
  );
}

function firstLine(text: string): string {
  return text.split('\n')[0] ?? text;
}
