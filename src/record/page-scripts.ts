import type { Locator } from 'playwright-core';
import type { Point, Rect, Size } from '../shared/geometry.js';

export interface ScrollerInfo {
  readonly rect: Rect;
  readonly left: number;
  readonly top: number;
  readonly maxLeft: number;
  readonly maxTop: number;
  readonly isDocument: boolean;
}

export interface ScrollMeasure {
  readonly element: Rect;
  readonly viewport: Size;
  readonly scrollers: readonly ScrollerInfo[];
}

export interface ScrollPosition {
  readonly left: number;
  readonly top: number;
}

export interface FieldInfo {
  readonly kind: 'input' | 'textarea' | 'select' | 'editable' | 'other';
  readonly type: string;
  readonly value: string;
  readonly focused: boolean;
}

export interface PageHelpers {
  describe(element: Element): string;
  opacity(element: Element): number;
  checkable(element: Element): boolean;
  cover(element: Element): string | null;
  measureScrollers(element: Element, self: boolean): ScrollMeasure;
  scrollPosition(element: Element, self: boolean, index: number): ScrollPosition | null;
  wheelReaches(element: Element, self: boolean, index: number, point: Point): boolean;
  jumpScroll(element: Element, self: boolean, index: number, delta: Point): void;
  readField(element: Element): FieldInfo;
  blur(element: Element, filter: string): void;
}

export const PAGE_HELPERS_KEY = '__cursorCamHelpers';

export function installPageHelpers(): void {
  const KEY = '__cursorCamHelpers';
  const MAX_TEXT = 40;
  const MAX_CLASSES = 2;
  const SCROLLABLE = /(auto|scroll|overlay)/;
  const OVERFLOW_SLACK_PX = 1;
  if (Object.hasOwn(window, KEY)) return;

  const parentOf = (node: Element): Element | null => {
    const root = node.getRootNode();
    return node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  };
  const isInside = (node: Node | null, ancestor: Node): boolean => {
    for (let current = node; current;) {
      if (current === ancestor) return true;
      current = current.parentNode ?? (current instanceof ShadowRoot ? current.host : null);
    }
    return false;
  };
  const documentScroller = (): Element => document.scrollingElement ?? document.documentElement;
  const isScroller = (node: Element): boolean => {
    if (node === documentScroller() || node === document.body) return false;
    const style = getComputedStyle(node);
    const canY =
      SCROLLABLE.test(style.overflowY) && node.scrollHeight > node.clientHeight + OVERFLOW_SLACK_PX;
    const canX =
      SCROLLABLE.test(style.overflowX) && node.scrollWidth > node.clientWidth + OVERFLOW_SLACK_PX;
    return canX || canY;
  };
  const scrollersOf = (start: Element | null): Element[] => {
    const found: Element[] = [];
    for (let node = start; node; node = parentOf(node)) if (isScroller(node)) found.push(node);
    return found;
  };
  const chainOf = (element: Element, self: boolean): Element[] =>
    scrollersOf(self ? element : parentOf(element));
  const describe = (element: Element): string => {
    const id = element.id ? `#${element.id}` : '';
    const classes = [...element.classList]
      .slice(0, MAX_CLASSES)
      .map((name) => `.${name}`)
      .join('');
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const shown = text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
    return `${element.tagName.toLowerCase()}${id}${classes}${shown ? ` "${shown}"` : ''}`;
  };
  const deepElementAt = (x: number, y: number): Element | null => {
    let hit = document.elementFromPoint(x, y);
    while (hit?.shadowRoot) {
      const inner: Element | null = hit.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    return hit;
  };

  const helpers: PageHelpers = {
    describe,
    opacity(element) {
      let opacity = 1;
      for (let node: Element | null = element; node; node = parentOf(node)) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return opacity;
    },
    checkable(element) {
      return (
        element instanceof HTMLInputElement &&
        (element.type === 'checkbox' || element.type === 'radio')
      );
    },
    cover(element) {
      const rect = element.getBoundingClientRect();
      const left = Math.max(rect.left, 0);
      const top = Math.max(rect.top, 0);
      const right = Math.min(rect.right, window.innerWidth);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      if (right <= left || bottom <= top) return 'the edge of the view';
      const hit = deepElementAt((left + right) / 2, (top + bottom) / 2);
      if (!hit) return null;
      const labels = element instanceof HTMLInputElement ? [...(element.labels ?? [])] : [];
      const isOwnLabel = labels.some((label) => isInside(hit, label));
      if (isInside(hit, element) || isInside(element, hit) || isOwnLabel) return null;
      return describe(hit);
    },
    measureScrollers(element, self) {
      const scrollers: ScrollerInfo[] = chainOf(element, self).map((node) => {
        const box = node.getBoundingClientRect();
        return {
          rect: {
            x: box.x + node.clientLeft,
            y: box.y + node.clientTop,
            width: node.clientWidth,
            height: node.clientHeight,
          },
          left: node.scrollLeft,
          top: node.scrollTop,
          maxLeft: Math.max(node.scrollWidth - node.clientWidth, 0),
          maxTop: Math.max(node.scrollHeight - node.clientHeight, 0),
          isDocument: false,
        };
      });
      const root = documentScroller();
      scrollers.push({
        rect: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        left: window.scrollX,
        top: window.scrollY,
        maxLeft: Math.max(root.scrollWidth - window.innerWidth, 0),
        maxTop: Math.max(root.scrollHeight - window.innerHeight, 0),
        isDocument: true,
      });
      const box = element.getBoundingClientRect();
      return {
        element: { x: box.x, y: box.y, width: box.width, height: box.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollers,
      };
    },
    scrollPosition(element, self, index) {
      const scrollers = chainOf(element, self);
      const node = scrollers[index];
      if (node) return { left: node.scrollLeft, top: node.scrollTop };
      return index === scrollers.length ? { left: window.scrollX, top: window.scrollY } : null;
    },
    wheelReaches(element, self, index, point) {
      const wanted = chainOf(element, self)[index] ?? null;
      const hit = deepElementAt(point.x, point.y);
      if (!hit) return false;
      return (scrollersOf(hit)[0] ?? null) === wanted;
    },
    jumpScroll(element, self, index, delta) {
      const node = chainOf(element, self)[index];
      const options: ScrollToOptions = { left: delta.x, top: delta.y, behavior: 'instant' };
      if (node) node.scrollBy(options);
      else window.scrollBy(options);
    },
    readField(element) {
      const focused =
        element === document.activeElement || element.contains(document.activeElement);
      if (element instanceof HTMLInputElement) {
        return { kind: 'input', type: element.type, value: element.value, focused };
      }
      if (element instanceof HTMLTextAreaElement) {
        return { kind: 'textarea', type: 'textarea', value: element.value, focused };
      }
      if (element instanceof HTMLSelectElement) {
        return { kind: 'select', type: 'select', value: element.value, focused };
      }
      if (element instanceof HTMLElement && element.isContentEditable) {
        return { kind: 'editable', type: 'editable', value: element.innerText, focused };
      }
      return { kind: 'other', type: element.tagName.toLowerCase(), value: '', focused };
    },
    blur(element, filter) {
      if (element instanceof HTMLElement || element instanceof SVGElement) {
        element.style.setProperty('filter', filter, 'important');
      }
    },
  };
  Object.defineProperty(window, KEY, { value: helpers, enumerable: false });
}

type HelperName = keyof PageHelpers;
type HelperArgs<Name extends HelperName> = PageHelpers[Name] extends (
  element: Element,
  ...args: infer Args
) => unknown
  ? Args
  : never;
type HelperResult<Name extends HelperName> = ReturnType<PageHelpers[Name]>;
type HelperCall = { readonly missing: true } | { readonly missing: false; readonly value: unknown };

export async function callHelper<Name extends HelperName>(
  locator: Locator,
  name: Name,
  ...args: HelperArgs<Name>
): Promise<HelperResult<Name>> {
  const call = () =>
    locator.evaluate(
      (element, request): HelperCall => {
        const registry = window as unknown as Record<
          string,
          Record<string, (target: Element, ...rest: unknown[]) => unknown> | undefined
        >;
        const helpers = registry[request.key];
        if (!helpers) return { missing: true };
        return { missing: false, value: helpers[request.name]?.(element, ...request.args) };
      },
      { key: PAGE_HELPERS_KEY, name, args },
    );
  let result = await call();
  if (result.missing) {
    await locator.evaluate(installPageHelpers);
    result = await call();
  }
  if (result.missing) throw new Error('The page helpers could not be installed.');
  return result.value as HelperResult<Name>;
}
