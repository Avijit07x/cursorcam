import { parseLocator } from '../config/locator-syntax.js';
import type { Step, Target } from '../config/steps.js';
import { suggestions } from '../inspect/inspect.js';
import { maskUrlSecrets } from '../shared/redact.js';
import type { MatchKind, PageEvent, PickedElement, SecretKind } from './page.js';

export type FlowEvent =
  | (PageEvent & { readonly frame: string | null })
  | {
      readonly kind: 'goto';
      readonly at: number;
      readonly url: string;
      readonly byHand: boolean | null;
    };

type ElementEvent = Exclude<FlowEvent, { readonly kind: 'goto' | 'press' }>;

export interface CapturedSteps {
  readonly file: {
    readonly url: string;
    readonly allowOrigins?: readonly string[];
    readonly steps: readonly Step[];
  };
  readonly secrets: readonly string[];
}

interface Secret {
  readonly kind: SecretKind;
  readonly value: string;
}

interface Draft {
  readonly step: Step;
  readonly ref?: string;
  readonly secret?: Secret;
}

const START_PAUSE_MS = 600;
const END_PAUSE_MS = 1_500;
// When the browser does not say who opened a page, one that opens this soon after a click, a key
// or typing came from it, and a later one was opened by hand.
const CAUSED_BY_ACTION_MS = 2_000;
const SECRET_NAMES: Readonly<Record<SecretKind, string>> = {
  password: 'PASSWORD',
  email: 'EMAIL',
  username: 'USERNAME',
};
const EXACT_KINDS: ReadonlySet<MatchKind> = new Set(['role', 'label', 'placeholder', 'text']);

export function pickTarget(element: PickedElement, frame: string | null): Target | undefined {
  const scope = frame === null ? {} : { frame };
  const finds = suggestions(element.raw);
  for (const find of finds) {
    const kind = parseLocator(find).kind;
    const match = element.matches[kind];
    if (match?.unique) return frame === null ? find : { find, ...scope };
    if (match?.uniqueExact && EXACT_KINDS.has(kind)) return { find, exact: true, ...scope };
  }
  for (const find of finds) {
    const match = element.matches[parseLocator(find).kind];
    if (match && match.nth >= 0) return { find, nth: match.nth, ...scope };
  }
  return undefined;
}

export function buildSteps(url: string, events: readonly FlowEvent[]): CapturedSteps {
  const origin = new URL(url).origin;
  const origins = new Set<string>();
  const drafts: Draft[] = [];
  let lastActionAt: number | undefined;
  for (const event of events.toSorted((a, b) => a.at - b.at)) {
    if (event.kind === 'goto') {
      const late = lastActionAt !== undefined && event.at - lastActionAt >= CAUSED_BY_ACTION_MS;
      if (event.byHand ?? late)
        drafts.push({ step: { goto: gotoValue(event.url, origin, origins) } });
      continue;
    }
    lastActionAt = event.at;
    if (event.kind === 'press') {
      drafts.push({ step: { press: event.chord } });
      continue;
    }
    const target = pickTarget(event.element, event.frame);
    if (target) addStep(drafts, event, target);
  }

  const names = new Map<string, string>();
  const steps = drafts.flatMap((draft) => finish(draft, names));
  const last = steps.at(-1);
  if (last) steps[steps.length - 1] = { ...last, pauseAfter: END_PAUSE_MS };
  return {
    file: {
      url,
      ...(origins.size > 0 ? { allowOrigins: [...origins] } : {}),
      steps: steps.length > 0 ? [{ pause: START_PAUSE_MS }, ...steps] : [],
    },
    secrets: [...new Set(names.values())],
  };
}

function addStep(drafts: Draft[], event: ElementEvent, target: Target): void {
  const { ref } = event.element;
  const last = drafts.at(-1);
  // A step on the element the last step used replaces it: typing replaces the click into the field.
  const same = last?.ref === ref ? last : undefined;
  switch (event.kind) {
    case 'click':
      drafts.push({ step: { click: target }, ref });
      return;
    case 'dblclick': {
      const clicked = same && 'click' in same.step ? same.step.click : undefined;
      if (clicked !== undefined) drafts.pop();
      drafts.push({ step: { dblclick: clicked ?? target }, ref });
      return;
    }
    case 'upload':
      // The click before it opened the file picker, which an upload step does itself.
      if (last && 'click' in last.step) drafts.pop();
      drafts.push({ step: { upload: oneOrMore(event.files), into: target }, ref });
      return;
    case 'select':
      if (same) drafts.pop();
      drafts.push({ step: { select: oneOrMore(event.labels), in: target }, ref });
      return;
    case 'type':
      if (same) drafts.pop();
      drafts.push(typeDraft(event, target));
      return;
  }
}

function typeDraft(event: Extract<ElementEvent, { kind: 'type' }>, target: Target): Draft {
  const { ref } = event.element;
  if (event.ask !== null) return { step: { ask: event.ask, into: target }, ref };
  if (event.secret === null) return { step: { type: event.value, into: target }, ref };
  return {
    step: { type: '', into: target },
    ref,
    secret: { kind: event.secret, value: event.value },
  };
}

function finish(draft: Draft, names: Map<string, string>): Step[] {
  const { step, secret } = draft;
  if (!secret || !('type' in step)) return [step];
  if (secret.value === '') return [];
  return [{ ...step, type: `$secret:${secretName(secret, names)}` }];
}

// The same value typed twice, like a password and its confirmation, shares one name.
function secretName(secret: Secret, names: Map<string, string>): string {
  const key = `${secret.kind}\n${secret.value}`;
  const known = names.get(key);
  if (known) return known;
  const base = SECRET_NAMES[secret.kind];
  const used = new Set(names.values());
  let name = base;
  for (let count = 2; used.has(name); count += 1) name = `${base}_${count}`;
  names.set(key, name);
  return name;
}

function gotoValue(url: string, origin: string, origins: Set<string>): string {
  const target = maskUrlSecrets(new URL(url));
  if (target.origin === origin) return readable(`${target.pathname}${target.search}${target.hash}`);
  origins.add(target.origin);
  return readable(target.href);
}

// decodeURI keeps the characters that give a URL its parts, like / ? & and #, encoded.
function readable(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

function oneOrMore(values: readonly string[]): string | string[] {
  const [first] = values;
  return values.length === 1 && first !== undefined ? first : [...values];
}
