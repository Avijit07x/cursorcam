import type { PageHandlers } from '../browser/handlers.js';
import type { BrowserSession } from '../browser/session.js';
import type { StepsPlan } from '../config/load-steps.js';
import type { EventLog } from './events.js';
import type { Pointer } from './mouse.js';

export interface AnswerSource {
  waitForAnswer(label: string): Promise<string>;
}

export interface ActionContext {
  readonly session: BrowserSession;
  readonly plan: StepsPlan;
  readonly events: EventLog;
  readonly pointer: Pointer;
  readonly handlers: PageHandlers;
  readonly timeoutMs: number;
  readonly speed: number;
  readonly env: NodeJS.ProcessEnv;
  readonly answers: AnswerSource;
}
