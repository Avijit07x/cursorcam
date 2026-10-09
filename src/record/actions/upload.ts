import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FileChooser } from 'playwright-core';
import type { StepOf } from '../../config/steps.js';
import { CursorCamError } from '../../shared/errors.js';
import { ExitCode } from '../../shared/exit-codes.js';
import { moveToTarget, prepareTarget } from '../actionable.js';
import type { ActionContext } from '../context.js';
import { describeTarget, locate, stepFailed } from '../locate.js';

const FILE_CHOOSER_TIMEOUT_MS = 5_000;

export async function upload(context: ActionContext, step: StepOf<'upload'>): Promise<void> {
  const names = typeof step.upload === 'string' ? [step.upload] : step.upload;
  const files = names.map((name) => resolve(context.plan.dir, name));
  await assertFilesExist(files);

  const { page } = context.session;
  const locator = await locate(page, step.into, {
    timeoutMs: context.timeoutMs,
    visibleOnly: false,
  });
  const isFileInput = await locator.evaluate(
    (element) => element instanceof HTMLInputElement && element.type === 'file',
  );
  if (isFileInput && !(await locator.isVisible())) {
    await locator.setInputFiles(files);
    return;
  }

  const prepared = await prepareTarget(context, step.into, { enabled: true });
  const ready = await moveToTarget(context, step.into, prepared);
  context.handlers.expectingFileChooser = true;
  try {
    const chooser = page.waitForEvent('filechooser', { timeout: FILE_CHOOSER_TIMEOUT_MS }).then(
      (opened: FileChooser) => opened,
      () => undefined,
    );
    await context.pointer.click(ready.box);
    const opened = await chooser;
    if (opened) await opened.setFiles(files);
    else if (isFileInput) await locator.setInputFiles(files);
    else throw stepFailed(`Clicking ${describeTarget(step.into)} did not open a file picker.`);
  } finally {
    context.handlers.expectingFileChooser = false;
  }
}

async function assertFilesExist(files: readonly string[]): Promise<void> {
  for (const file of files) {
    const found = await access(file).then(
      () => true,
      () => false,
    );
    if (!found) {
      throw new CursorCamError(`The upload file ${file} does not exist.`, {
        exitCode: ExitCode.BadInput,
        hint: 'Upload paths are relative to the steps file.',
      });
    }
  }
}
