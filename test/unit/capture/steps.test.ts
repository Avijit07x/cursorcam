import { describe, expect, it } from 'vitest';
import type { Match, PickedElement } from '../../../src/capture/page.js';
import { buildSteps, pickTarget, type FlowEvent } from '../../../src/capture/steps.js';
import { parseSteps } from '../../../src/config/load-steps.js';
import type { RawTarget } from '../../../src/inspect/collect.js';

const START = 'http://localhost:3000/app';
const ONE: Match = { unique: true, uniqueExact: true, nth: 0 };
const ONLY_EXACT: Match = { unique: false, uniqueExact: true, nth: 1 };
const MANY: Match = { unique: false, uniqueExact: false, nth: 2 };

function element(
  ref: string,
  raw: Partial<RawTarget>,
  matches: PickedElement['matches'] = {},
): PickedElement {
  const base: RawTarget = {
    tag: 'button',
    role: '',
    name: '',
    label: '',
    placeholder: '',
    testId: '',
    text: '',
    css: '',
    box: { x: 0, y: 0, width: 80, height: 30 },
    disabled: false,
    password: false,
    warning: null,
  };
  return { ref, raw: { ...base, ...raw }, matches };
}

const save = element('save', { role: 'button', name: 'Save', css: '#save' }, { role: ONE });
const title = element(
  'title',
  { tag: 'input', role: 'textbox', name: 'Title', label: 'Title' },
  { role: ONE },
);
const password = element('password', { tag: 'input', label: 'Password' }, { label: ONE });
const confirm = element('confirm', { tag: 'input', label: 'Confirm' }, { label: ONE });
const plan = element('plan', { tag: 'select', role: 'combobox', name: 'Plan' }, { role: ONE });
const file = element('file', { tag: 'input', css: '#file' }, { css: ONE });

const click = (at: number, on = save, kind: 'click' | 'dblclick' = 'click'): FlowEvent => ({
  kind,
  at,
  element: on,
  frame: null,
});
const typed = (at: number, on: PickedElement, value: string, secret: 'password' | null = null) =>
  ({ kind: 'type', at, element: on, value, secret, ask: null, frame: null }) as const;

describe('picking a target', () => {
  it('takes the first target that matches only this element, like inspect', () => {
    const both = element(
      'b',
      { testId: 'save-button', role: 'button', name: 'Save' },
      { testid: ONE, role: ONE },
    );
    expect(pickTarget(both, null)).toBe('testid=save-button');
    expect(pickTarget(save, null)).toBe("role=button[name='Save']");
  });

  it('makes a target exact, then picks one match, when the page has more than one', () => {
    const exact = element('e', { role: 'button', name: 'Save' }, { role: ONLY_EXACT });
    expect(pickTarget(exact, null)).toEqual({ find: "role=button[name='Save']", exact: true });

    const many = element(
      'm',
      { role: 'button', name: 'Save', css: '.save' },
      { role: MANY, css: MANY },
    );
    expect(pickTarget(many, null)).toEqual({ find: "role=button[name='Save']", nth: 2 });
    expect(pickTarget(element('none', { tag: 'div' }), null)).toBeUndefined();
  });

  it('names the frame of a target inside an iframe', () => {
    expect(pickTarget(save, '#payment')).toEqual({
      find: "role=button[name='Save']",
      frame: '#payment',
    });
  });
});

describe('building the steps', () => {
  it('starts with a pause, ends on a long one, and keeps one step per typed field', () => {
    const built = buildSteps(START, [
      click(10, title),
      typed(20, title, 'A'),
      typed(30, title, 'Add'),
      { kind: 'press', at: 40, chord: 'Enter', frame: null },
      click(50),
    ]);

    expect(built.file).toEqual({
      url: START,
      steps: [
        { pause: 600 },
        { type: 'Add', into: "role=textbox[name='Title']" },
        { press: 'Enter' },
        { click: "role=button[name='Save']", pauseAfter: 1500 },
      ],
    });
    expect(built.secrets).toEqual([]);
    expect(() => parseSteps(built.file, 'capture.json')).not.toThrow();
  });

  it('turns a click and a double click on one element into a double click', () => {
    const built = buildSteps(START, [click(10), click(20, save, 'dblclick')]);
    expect(built.file.steps).toEqual([
      { pause: 600 },
      { dblclick: "role=button[name='Save']", pauseAfter: 1500 },
    ]);
  });

  it('keeps the picked option, and the files without the click that opened the picker', () => {
    const built = buildSteps(START, [
      click(10, plan),
      { kind: 'select', at: 20, element: plan, labels: ['Pro'], frame: null },
      click(30),
      { kind: 'upload', at: 40, element: file, files: ['a.png', 'b.png'], frame: null },
    ]);
    expect(built.file.steps).toEqual([
      { pause: 600 },
      { select: 'Pro', in: "role=combobox[name='Plan']" },
      { upload: ['a.png', 'b.png'], into: '#file', pauseAfter: 1500 },
    ]);
  });

  it('never saves what goes into a password field, and asks for one-time codes', () => {
    const code = element(
      'code',
      { tag: 'input', name: 'Verification code', label: 'Code' },
      { label: ONE },
    );
    const built = buildSteps(START, [
      typed(10, password, 'hunter2', 'password'),
      typed(20, confirm, 'hunter2', 'password'),
      typed(
        30,
        element('new', { tag: 'input', label: 'New' }, { label: ONE }),
        'other',
        'password',
      ),
      typed(40, element('empty', { tag: 'input', label: 'Old' }, { label: ONE }), '', 'password'),
      {
        kind: 'type',
        at: 50,
        element: code,
        value: '123456',
        secret: null,
        ask: 'Verification code',
        frame: null,
      },
    ]);

    expect(built.file.steps).toEqual([
      { pause: 600 },
      { type: '$secret:PASSWORD', into: 'label=Password' },
      { type: '$secret:PASSWORD', into: 'label=Confirm' },
      { type: '$secret:PASSWORD_2', into: 'label=New' },
      { ask: 'Verification code', into: 'label=Code', pauseAfter: 1500 },
    ]);
    expect(built.secrets).toEqual(['PASSWORD', 'PASSWORD_2']);
    expect(JSON.stringify(built)).not.toMatch(/hunter2|other|123456/);
  });

  it('adds a goto only for pages opened by hand', () => {
    const goto = (at: number, path: string, byHand: boolean | null): FlowEvent => ({
      kind: 'goto',
      at,
      url: new URL(path, START).href,
      byHand,
    });
    const built = buildSteps(START, [
      goto(5, '/login', null),
      click(10),
      goto(500, '/saved', null),
      goto(4_000, '/later', false),
      goto(9_000, '/settings?tab=team#members', null),
      goto(9_100, 'https://docs.example.com/guide?token=abc', true),
      click(13_000),
    ]);

    expect(built.file).toEqual({
      url: START,
      allowOrigins: ['https://docs.example.com'],
      steps: [
        { pause: 600 },
        { click: "role=button[name='Save']" },
        { goto: '/settings?tab=team#members' },
        { goto: 'https://docs.example.com/guide?token=•••' },
        { click: "role=button[name='Save']", pauseAfter: 1500 },
      ],
    });
    expect(() => parseSteps(built.file, 'capture.json')).not.toThrow();
  });

  it('orders events by time and saves nothing for an empty capture', () => {
    const built = buildSteps(START, [click(30), typed(10, title, 'First')]);
    expect(built.file.steps.slice(1)).toEqual([
      { type: 'First', into: "role=textbox[name='Title']" },
      { click: "role=button[name='Save']", pauseAfter: 1500 },
    ]);
    expect(buildSteps(START, []).file.steps).toEqual([]);
  });
});
