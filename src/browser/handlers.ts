import { access, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { Dialog, Download, Page } from 'playwright-core';
import type { DialogPolicy } from '../config/steps.js';
import { redact } from '../shared/redact.js';
import type { BrowserSession } from './session.js';

export const MASK_BLUR = 'blur(14px)';
const MAX_FILE_NAME_LENGTH = 120;
const MAX_EXTENSION_LENGTH = 16;
const FIRST_PRINTABLE_CHAR_CODE = 32;
const UNSAFE_FILE_NAME_CHARS: ReadonlySet<string> = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);
const FALLBACK_DOWNLOAD_NAME = 'download';

export interface DialogInfo {
  readonly kind: string;
  readonly message: string;
  readonly accepted: boolean;
}

export interface HandlerListeners {
  readonly onDialog?: (info: DialogInfo) => void;
  readonly onDownload?: (file: string) => void;
  readonly onWarning?: (message: string) => void;
}

export interface HandlerOptions extends HandlerListeners {
  readonly downloadsDir?: string;
  readonly hideScrollbars?: boolean;
  readonly mask?: readonly string[];
}

export class PageHandlers {
  readonly #options: HandlerOptions;
  readonly #stop: () => void;
  #dialogPolicy: DialogPolicy = 'accept';
  #expectingFileChooser = false;

  private constructor(session: BrowserSession, options: HandlerOptions) {
    this.#options = options;
    this.#stop = session.forEachPage((page) => this.#attach(page));
  }

  static async install(
    session: BrowserSession,
    options: HandlerOptions = {},
  ): Promise<PageHandlers> {
    if (options.mask && options.mask.length > 0) {
      await session.context.addInitScript(installMask, {
        selectors: [...options.mask],
        filter: MASK_BLUR,
      });
      await Promise.all(
        session.context
          .pages()
          .map((page) =>
            page.evaluate(installMask, { selectors: [...(options.mask ?? [])], filter: MASK_BLUR }),
          ),
      );
    }
    return new PageHandlers(session, options);
  }

  set dialogPolicy(policy: DialogPolicy) {
    this.#dialogPolicy = policy;
  }

  set expectingFileChooser(expecting: boolean) {
    this.#expectingFileChooser = expecting;
  }

  dispose(): void {
    this.#stop();
  }

  #attach(page: Page): () => void {
    const onDialog = (dialog: Dialog) => void this.#answer(dialog);
    const onDownload = (download: Download) => void this.#save(download);
    const onFileChooser = () => {
      if (this.#expectingFileChooser) return;
      this.#options.onWarning?.('A file picker opened. Use an upload step to pick files.');
    };
    page.on('dialog', onDialog);
    page.on('download', onDownload);
    page.on('filechooser', onFileChooser);
    if (this.#options.hideScrollbars) void hideScrollbars(page);
    return () => {
      page.off('dialog', onDialog);
      page.off('download', onDownload);
      page.off('filechooser', onFileChooser);
    };
  }

  async #answer(dialog: Dialog): Promise<void> {
    const policy = this.#dialogPolicy;
    const accepted = policy === 'accept' || (typeof policy === 'object' && policy.accept);
    const text = typeof policy === 'object' ? policy.text : undefined;
    const kind = dialog.type();
    try {
      if (accepted)
        await dialog.accept(kind === 'prompt' ? (text ?? dialog.defaultValue()) : undefined);
      else await dialog.dismiss();
    } catch {
      return;
    }
    this.#options.onDialog?.({ kind, message: redact(dialog.message()), accepted });
  }

  async #save(download: Download): Promise<void> {
    const dir = this.#options.downloadsDir;
    if (!dir) {
      await download.cancel().catch(() => undefined);
      return;
    }
    try {
      await mkdir(dir, { recursive: true });
      const file = await uniquePath(dir, safeFileName(download.suggestedFilename()));
      await download.saveAs(file);
      this.#options.onDownload?.(file);
    } catch {
      this.#options.onWarning?.('A download could not be saved.');
    }
  }
}

export function safeFileName(name: string): string {
  const cleaned = [...basename(name.replaceAll('\\', '/'))]
    .map((char) =>
      char.charCodeAt(0) < FIRST_PRINTABLE_CHAR_CODE || UNSAFE_FILE_NAME_CHARS.has(char)
        ? '_'
        : char,
    )
    .join('')
    .replace(/^\.+/, '')
    .trim();
  if (cleaned === '') return FALLBACK_DOWNLOAD_NAME;
  if (cleaned.length <= MAX_FILE_NAME_LENGTH) return cleaned;
  const extension = extname(cleaned).length <= MAX_EXTENSION_LENGTH ? extname(cleaned) : '';
  return `${cleaned.slice(0, MAX_FILE_NAME_LENGTH - extension.length)}${extension}`;
}

async function uniquePath(dir: string, name: string): Promise<string> {
  const extension = extname(name);
  const stem = name.slice(0, name.length - extension.length);
  for (let attempt = 0; ; attempt += 1) {
    const candidate = join(dir, attempt === 0 ? name : `${stem} (${attempt})${extension}`);
    const exists = await access(candidate).then(
      () => true,
      () => false,
    );
    if (!exists) return candidate;
  }
}

async function hideScrollbars(page: Page): Promise<void> {
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setScrollbarsHidden', { hidden: true });
  } catch {
    return;
  }
}

function installMask({ selectors, filter }: { selectors: string[]; filter: string }): void {
  const sheet = new CSSStyleSheet();
  for (const selector of selectors) {
    try {
      sheet.insertRule(`${selector} { filter: ${filter} !important; }`, sheet.cssRules.length);
    } catch {
      continue;
    }
  }
  const apply = () => {
    if (!document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
}
