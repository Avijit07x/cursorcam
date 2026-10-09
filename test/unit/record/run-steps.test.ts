import { describe, expect, it } from 'vitest';
import { parseSteps } from '../../../src/config/load-steps.js';
import {
  DEFAULT_PAUSE_AFTER_MS,
  describeStep,
  pauseAfterOf,
  stepBudget,
} from '../../../src/record/run-steps.js';

const stepsOf = (steps: object[]) =>
  parseSteps({ url: 'http://localhost', steps }, '/x/steps.json', {}).steps;

describe('step helpers', () => {
  it('describes steps without showing typed text', () => {
    const steps = stepsOf([
      { click: { find: 'text=Save', nth: 1 } },
      { type: 'my text', into: 'label=Name' },
      { press: 'Enter' },
      { goto: '/a' },
      { ask: 'code', into: 'label=Code' },
      { scroll: { by: 10 } },
    ]);

    expect(steps.map(describeStep)).toEqual([
      'click text=Save, nth 1',
      'type into label=Name',
      'press Enter',
      'goto /a',
      'ask for code',
      'scroll',
    ]);
  });

  it('gives every step a hard time limit', () => {
    const [click, pause, ask] = stepsOf([
      { click: 'a' },
      { pause: 2000 },
      { ask: 'code', into: 'b' },
    ]);

    expect(stepBudget(click!, 15_000)).toBe(55_000);
    expect(stepBudget(pause!, 15_000)).toBe(12_000);
    expect(stepBudget(ask!, 15_000)).toBe(355_000);
  });

  it('pauses after each action so viewers see what changed, unless told otherwise', () => {
    const steps = stepsOf([
      { click: 'a' },
      { type: 'hi', into: 'b' },
      { pause: 500 },
      { waitFor: 'c' },
      { click: 'a', pauseAfter: 0 },
      { click: 'a', pauseAfter: 1500 },
    ]);

    expect(steps.map(pauseAfterOf)).toEqual([
      DEFAULT_PAUSE_AFTER_MS,
      DEFAULT_PAUSE_AFTER_MS,
      0,
      0,
      0,
      1500,
    ]);
  });
});
