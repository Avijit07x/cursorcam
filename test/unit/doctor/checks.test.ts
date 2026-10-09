import { describe, expect, it } from 'vitest';
import { checkDisk, checkFonts, checkNode, failedCheck } from '../../../src/doctor/checks.js';
import { CursorCamError } from '../../../src/shared/errors.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('checkNode', () => {
  it.each(['22.13.0', '22.20.1', '24.11.0'])('accepts %s', (version) => {
    expect(checkNode(version).status).toBe('ok');
  });

  it.each(['20.19.0', '22.12.0'])('rejects %s with a fix', (version) => {
    const result = checkNode(version);

    expect(result.status).toBe('fail');
    expect(result.fix).toMatch(/22\.13/);
  });
});

describe('checkFonts', () => {
  it('passes when both font kinds are installed', async () => {
    const result = await checkFonts(() => Promise.resolve('Noto Sans\n'));

    expect(result.status).toBe('ok');
  });

  it('names each missing font and how to install it', async () => {
    const result = await checkFonts((_, args) =>
      Promise.resolve(args[0] === ':lang=zh' ? '' : 'Noto Color Emoji\n'),
    );

    expect(result).toMatchObject({ status: 'warn', detail: 'No CJK font found' });
    expect(result.fix).toContain('fonts-noto-cjk');
    expect(result.fix).not.toContain('fonts-noto-color-emoji');
  });

  it('warns when fonts cannot be checked', async () => {
    const result = await checkFonts(() => Promise.reject(new Error('ENOENT')));

    expect(result.status).toBe('warn');
    expect(result.fix).toMatch(/fontconfig/);
  });
});

describe('checkDisk', () => {
  const temp = useTempDir();

  it('reports free space for the folder', async () => {
    const result = await checkDisk(temp.path());

    expect(result.name).toBe('Disk');
    expect(result.detail).toContain(temp.path());
  });
});

describe('failedCheck', () => {
  it('uses the hint of a CursorCamError as the fix', () => {
    const error = new CursorCamError('No browser', {
      exitCode: ExitCode.NoBrowser,
      hint: 'Install Chrome',
    });

    expect(failedCheck('Browser', error)).toEqual({
      name: 'Browser',
      status: 'fail',
      detail: 'No browser',
      fix: 'Install Chrome',
    });
  });

  it('leaves out the fix for plain errors', () => {
    expect(failedCheck('Encoder', new Error('boom'))).toEqual({
      name: 'Encoder',
      status: 'fail',
      detail: 'boom',
    });
  });
});
