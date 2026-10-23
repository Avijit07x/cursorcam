import type { LocatorQuery } from '../config/locator-syntax.js';
import { targetKit, type RawTarget, type TargetKit } from '../inspect/collect.js';

export type MatchKind = LocatorQuery['kind'];

export interface Match {
  readonly unique: boolean;
  readonly uniqueExact: boolean;
  readonly nth: number;
}

export interface PickedElement {
  readonly ref: string;
  readonly raw: RawTarget;
  readonly matches: Partial<Record<MatchKind, Match>>;
}

export type SecretKind = 'password' | 'email' | 'username';

interface OnElement {
  readonly at: number;
  readonly element: PickedElement;
}

export type PageEvent =
  | (OnElement & { readonly kind: 'click' | 'dblclick' })
  | (OnElement & {
      readonly kind: 'type';
      readonly value: string;
      readonly secret: SecretKind | null;
      readonly ask: string | null;
    })
  | (OnElement & { readonly kind: 'select'; readonly labels: readonly string[] })
  | (OnElement & { readonly kind: 'upload'; readonly files: readonly string[] })
  | { readonly kind: 'press'; readonly at: number; readonly chord: string };

export const CAPTURE_BINDING = '__cursorCamCapture';

// Runs in every frame. It measures each target the moment it is used, before the page reacts.
export function installCapture(kit: TargetKit, binding: string): void {
  const FLAG = '__cursorCamCaptureOn';
  const TEXT_INPUT_TYPES = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number']);
  const EDITING_KEYS = new Set(['A', 'C', 'V', 'X', 'Y', 'Z']);
  const MODIFIER_KEYS = new Set(['Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'Meta', 'Shift']);
  const ONE_TIME_CODE = 'one-time-code';
  const DEFAULT_ASK = 'Code';
  const IS_MAC = navigator.platform.startsWith('Mac');
  if (Object.hasOwn(window, FLAG)) return;
  Object.defineProperty(window, FLAG, { value: true });

  const documentRef = Math.random().toString(36).slice(2);
  const refs = new WeakMap<Element, string>();
  const fields = new WeakMap<Element, PickedElement>();
  let made = 0;
  let forwardedTo: Element | null = null;
  let afterEnter = false;

  const send = (event: PageEvent): void => {
    const call = Reflect.get(window, binding) as
      ((event: PageEvent) => Promise<unknown>) | undefined;
    void call?.(event).catch(() => undefined);
  };
  const later = (reset: () => void): void => {
    setTimeout(reset);
  };

  const refOf = (element: Element): string => {
    let ref = refs.get(element);
    if (ref === undefined) {
      made += 1;
      ref = `${documentRef}-${made}`;
      refs.set(element, ref);
    }
    return ref;
  };

  const visible = (element: Element): boolean => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  };
  const has = (text: string, part: string): boolean =>
    text.toLowerCase().includes(part.toLowerCase());
  const textOf = (element: Element): string => kit.clean(element.textContent);
  const ownsText =
    (test: (text: string) => boolean) =>
    (element: Element): boolean =>
      test(textOf(element)) && ![...element.children].some((child) => test(textOf(child)));
  const labelsOf = (element: Element): string[] => {
    const ids = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
    const labelledBy = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    return [
      kit.labelText(element),
      kit.clean(element.getAttribute('aria-label')),
      kit.clean(labelledBy),
    ].filter(Boolean);
  };
  const placeholderOf = (element: Element): string =>
    kit.clean(element.getAttribute('placeholder'));

  const rank = (element: Element, loose: Element[], exact: Element[]): Match => {
    const related = (other: Element): boolean => element.contains(other);
    return {
      unique: loose.length === 1 && loose.every(related),
      uniqueExact: exact.length === 1 && exact.every(related),
      nth: loose.findIndex(related),
    };
  };

  // Mirrors how Playwright reads each kind of target, close enough to tell one match from many.
  const measure = (
    element: Element,
    raw: RawTarget,
    visibleOnly: boolean,
  ): Partial<Record<MatchKind, Match>> => {
    const all = kit.allElements();
    const find = (test: (candidate: Element) => boolean): Element[] =>
      all.filter((candidate) => test(candidate) && (!visibleOnly || visible(candidate)));
    const matches: Partial<Record<MatchKind, Match>> = {};
    if (raw.testId) {
      const found = find((candidate) => candidate.getAttribute('data-testid') === raw.testId);
      matches.testid = rank(element, found, found);
    }
    if (raw.role && raw.name) {
      const found = find(
        (candidate) =>
          kit.implicitRole(candidate) === raw.role &&
          !candidate.closest('[aria-hidden="true"]') &&
          has(kit.accessibleName(candidate), raw.name),
      );
      const exact = found.filter((candidate) => kit.accessibleName(candidate) === raw.name);
      matches.role = rank(element, found, exact);
    }
    if (raw.label) {
      const found = find((candidate) => labelsOf(candidate).some((text) => has(text, raw.label)));
      const exact = found.filter((candidate) => labelsOf(candidate).includes(raw.label));
      matches.label = rank(element, found, exact);
    }
    if (raw.placeholder) {
      const found = find((candidate) => has(placeholderOf(candidate), raw.placeholder));
      const exact = found.filter((candidate) => placeholderOf(candidate) === raw.placeholder);
      matches.placeholder = rank(element, found, exact);
    }
    if (raw.text) {
      const found = find(ownsText((text) => has(text, raw.text)));
      matches.text = rank(element, found, find(ownsText((text) => text === raw.text)));
    }
    if (raw.css) {
      const found = [...document.querySelectorAll(raw.css)].filter(
        (candidate) => !visibleOnly || visible(candidate),
      );
      matches.css = rank(element, found, found);
    }
    return matches;
  };

  const pick = (element: Element, visibleOnly = true): PickedElement => {
    const raw = kit.describe(element);
    return { ref: refOf(element), raw, matches: measure(element, raw, visibleOnly) };
  };

  const pathOf = (event: Event): Element[] =>
    event.composedPath().filter((node): node is Element => node instanceof Element);
  const actionable = (path: readonly Element[]): Element | undefined =>
    path.find((element) => element.matches(kit.interactive)) ?? path[0];

  const fieldOf = (target: Element | undefined): HTMLElement | null => {
    if (target instanceof HTMLInputElement)
      return TEXT_INPUT_TYPES.has(target.type) ? target : null;
    if (target instanceof HTMLTextAreaElement) return target;
    if (!(target instanceof HTMLElement) || !target.isContentEditable) return null;
    let host = target;
    while (host.parentElement?.isContentEditable) host = host.parentElement;
    return host;
  };
  const valueOf = (field: HTMLElement): string =>
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.value
      : field.innerText;
  const autocompleteOf = (field: HTMLElement): string =>
    (field.getAttribute('autocomplete') ?? '').toLowerCase();
  const secretOf = (field: HTMLElement): SecretKind | null => {
    if (!(field instanceof HTMLInputElement)) return null;
    if (field.type === 'password') return 'password';
    const autocomplete = autocompleteOf(field);
    if (autocomplete.includes('username')) return 'username';
    const isEmail = field.type === 'email' || autocomplete.includes('email');
    const inLoginForm = Boolean(field.form?.querySelector('input[type="password"]'));
    return isEmail && inLoginForm ? 'email' : null;
  };
  const askOf = (field: HTMLElement, raw: RawTarget): string | null =>
    autocompleteOf(field).includes(ONE_TIME_CODE) ? raw.name || raw.label || DEFAULT_ASK : null;
  const remember = (field: HTMLElement): PickedElement => {
    const picked = pick(field);
    fields.set(field, picked);
    return picked;
  };

  const keyName = (event: KeyboardEvent): string => {
    if (/^Key[A-Z]$/.test(event.code)) return event.code.slice('Key'.length);
    if (/^Digit[0-9]$/.test(event.code)) return event.code.slice('Digit'.length);
    if (event.key === ' ') return 'Space';
    return event.key.length === 1 ? event.key.toUpperCase() : event.key;
  };
  const chordOf = (event: KeyboardEvent, field: HTMLElement | null): string | null => {
    if (event.getModifierState('AltGraph')) return null;
    const mod = IS_MAC ? event.metaKey : event.ctrlKey;
    const other = IS_MAC ? event.ctrlKey : event.metaKey;
    const name = keyName(event);
    if (mod || other || event.altKey) {
      if (mod && !event.altKey && EDITING_KEYS.has(name)) return null;
      if (!mod && !other && field) return null;
      const parts = [
        mod && 'Mod',
        other && (IS_MAC ? 'Control' : 'Meta'),
        event.altKey && 'Alt',
        event.shiftKey && 'Shift',
        name,
      ];
      return parts.filter((part): part is string => typeof part === 'string').join('+');
    }
    if (event.shiftKey) return null;
    if (event.key === 'Escape') return 'Escape';
    return event.key === 'Enter' && field instanceof HTMLInputElement ? 'Enter' : null;
  };

  window.addEventListener(
    'focusin',
    (event) => {
      const field = fieldOf(pathOf(event)[0]);
      if (field) remember(field);
    },
    true,
  );

  window.addEventListener(
    'input',
    (event) => {
      const field = fieldOf(pathOf(event)[0]);
      if (!event.isTrusted || !field) return;
      const element = fields.get(field) ?? remember(field);
      send({
        kind: 'type',
        at: Date.now(),
        element,
        value: valueOf(field),
        secret: secretOf(field),
        ask: askOf(field, element.raw),
      });
    },
    true,
  );

  window.addEventListener(
    'change',
    (event) => {
      const [target] = pathOf(event);
      if (target instanceof HTMLSelectElement && event.isTrusted) {
        const labels = [...target.selectedOptions].map((option) => kit.clean(option.label));
        if (labels.length > 0)
          send({ kind: 'select', at: Date.now(), element: pick(target), labels });
        return;
      }
      // Scripts cannot choose files, so a file input counts even when a test tool sets it.
      if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
      const files = [...(target.files ?? [])].map((file) => file.name);
      if (files.length > 0)
        send({ kind: 'upload', at: Date.now(), element: pick(target, false), files });
    },
    true,
  );

  window.addEventListener(
    'click',
    (event) => {
      if (!event.isTrusted || event.detail > 1) return;
      const path = pathOf(event);
      if (forwardedTo && path[0] === forwardedTo) {
        forwardedTo = null;
        return;
      }
      // Enter in a field also clicks the form's submit button. The Enter step covers it.
      if (event.detail === 0 && afterEnter) return;
      let element = actionable(path);
      const label = path.find((node): node is HTMLLabelElement => node instanceof HTMLLabelElement);
      const control = label?.control;
      if (label && control && !path.includes(control)) {
        forwardedTo = control;
        later(() => {
          forwardedTo = null;
        });
        element = visible(control) ? control : label;
      }
      if (element) send({ kind: 'click', at: Date.now(), element: pick(element) });
    },
    true,
  );

  window.addEventListener(
    'dblclick',
    (event) => {
      const element = actionable(pathOf(event));
      if (event.isTrusted && element)
        send({ kind: 'dblclick', at: Date.now(), element: pick(element) });
    },
    true,
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (!event.isTrusted || event.repeat || event.isComposing || MODIFIER_KEYS.has(event.key))
        return;
      const chord = chordOf(event, fieldOf(pathOf(event)[0]));
      if (!chord) return;
      send({ kind: 'press', at: Date.now(), chord });
      if (chord !== 'Enter') return;
      afterEnter = true;
      later(() => {
        afterEnter = false;
      });
    },
    true,
  );
}

export const CAPTURE_SCRIPT = `(${installCapture.toString()})((${targetKit.toString()})(), ${JSON.stringify(CAPTURE_BINDING)});`;
