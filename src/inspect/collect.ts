import type { Rect } from '../shared/geometry.js';

export type TargetWarning = 'picker' | 'select' | 'tooltip';

export interface RawTarget {
  readonly tag: string;
  readonly role: string;
  readonly name: string;
  readonly label: string;
  readonly placeholder: string;
  readonly testId: string;
  readonly text: string;
  readonly css: string;
  readonly box: Rect;
  readonly disabled: boolean;
  readonly password: boolean;
  readonly warning: TargetWarning | null;
}

export interface PageSummary {
  readonly targets: RawTarget[];
  readonly hasViewportMeta: boolean;
  readonly viewport: { readonly width: number; readonly height: number };
}

export function collectTargets(): PageSummary {
  const MAX_TEXT = 60;
  const MAX_NAME = 200;
  const MIN_OPACITY = 0.1;
  const CLICKABLE_PARENT = 'a[href],button,[role="button"],[role="link"]';
  const INTERACTIVE = [
    'a[href]',
    'button',
    'input:not([type=hidden])',
    'select',
    'textarea',
    'summary',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
    ...[
      'button',
      'link',
      'tab',
      'menuitem',
      'checkbox',
      'radio',
      'switch',
      'option',
      'combobox',
      'textbox',
      'searchbox',
      'slider',
    ].map((role) => `[role="${role}"]`),
  ].join(',');
  const INPUT_ROLES: Readonly<Record<string, string>> = {
    button: 'button',
    submit: 'button',
    reset: 'button',
    image: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    range: 'slider',
    search: 'searchbox',
    number: 'spinbutton',
    email: 'textbox',
    tel: 'textbox',
    text: 'textbox',
    url: 'textbox',
  };
  const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color']);

  const clean = (text: string | null | undefined): string =>
    (text ?? '').replace(/\s+/g, ' ').trim();
  const short = (text: string): string =>
    text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;

  const implicitRole = (element: Element): string => {
    const explicit = element.getAttribute('role');
    if (explicit) return explicit.split(' ')[0] ?? '';
    const tag = element.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button' || tag === 'summary') return 'button';
    if (tag === 'textarea') return 'textbox';
    if (element instanceof HTMLSelectElement)
      return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
    if (element instanceof HTMLInputElement) {
      if (element.type === 'text' && element.list) return 'combobox';
      return INPUT_ROLES[element.type] ?? '';
    }
    if (element instanceof HTMLElement && element.isContentEditable) return 'textbox';
    return '';
  };

  const labelText = (element: Element): string => {
    const labels = 'labels' in element ? (element as HTMLInputElement).labels : null;
    return clean([...(labels ?? [])].map((label) => label.textContent).join(' '));
  };

  const accessibleName = (element: Element): string => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = clean(
        labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      if (text) return text;
    }
    const ariaLabel = clean(element.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel;
    const label = labelText(element);
    if (label) return label;
    if (
      element instanceof HTMLInputElement &&
      ['button', 'submit', 'reset'].includes(element.type)
    ) {
      return clean(element.value);
    }
    const isField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    if (!isField) {
      const text = clean(element.textContent);
      if (text) return text;
      const image = element.querySelector('img[alt]');
      if (image) return clean(image.getAttribute('alt'));
    }
    return clean(element.getAttribute('title') ?? element.getAttribute('placeholder'));
  };

  const cssPath = (element: Element): string => {
    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
      return `#${CSS.escape(element.id)}`;
    }
    const parts: string[] = [];
    for (
      let node: Element | null = element;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const tag = node.tagName.toLowerCase();
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((child) => child.tagName === node?.tagName)
        : [];
      parts.unshift(
        siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag,
      );
    }
    return parts.join(' > ');
  };

  const isShown = (element: Element, box: DOMRect): boolean => {
    if (box.width <= 0 || box.height <= 0) return false;
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none') return false;
      opacity *= Number(style.opacity);
    }
    return getComputedStyle(element).visibility !== 'hidden' && opacity >= MIN_OPACITY;
  };

  const warningFor = (element: Element): TargetWarning | null => {
    if (element instanceof HTMLInputElement && PICKER_TYPES.has(element.type)) return 'picker';
    if (element instanceof HTMLSelectElement) return 'select';
    if (element.hasAttribute('title') && !clean(element.textContent)) return 'tooltip';
    return null;
  };

  const roots: (Document | ShadowRoot)[] = [document];
  const elements: Element[] = [];
  while (roots.length > 0) {
    const root = roots.shift();
    if (!root) break;
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) roots.push(element.shadowRoot);
      if (element.matches(INTERACTIVE)) elements.push(element);
    }
  }

  const targets: RawTarget[] = [];
  for (const element of elements) {
    const box = element.getBoundingClientRect();
    if (!isShown(element, box) || element.parentElement?.closest(CLICKABLE_PARENT)) continue;
    const name = accessibleName(element).slice(0, MAX_NAME);
    targets.push({
      tag: element.tagName.toLowerCase(),
      role: implicitRole(element),
      name,
      label: labelText(element).slice(0, MAX_NAME),
      placeholder: clean(element.getAttribute('placeholder')).slice(0, MAX_NAME),
      testId: clean(element.getAttribute('data-testid')),
      text: short(clean(element.textContent)),
      css: element.getRootNode() === document ? cssPath(element) : '',
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true',
      password: element instanceof HTMLInputElement && element.type === 'password',
      warning: warningFor(element),
    });
  }
  return {
    targets,
    hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}
