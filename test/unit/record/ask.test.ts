import { describe, expect, it } from 'vitest';
import { AnswerChannel, answerSocketPath, sendAnswer } from '../../../src/record/ask.js';
import { StatusFile } from '../../../src/runs/status.js';
import { ExitCode } from '../../../src/shared/exit-codes.js';
import { useTempDir } from '../../helpers/temp-dir.js';

describe('AnswerChannel', () => {
  const dir = useTempDir();

  const waitUntilAsked = async (status: StatusFile) => {
    while (status.current.state !== 'waiting')
      await new Promise((resolve) => setTimeout(resolve, 5));
    return status.current.answerSocket ?? '';
  };

  it('shows what it waits for, takes one answer, then restores the status', async () => {
    const status = new StatusFile(dir.path());
    await status.update({ state: 'recording', step: 3 });
    const channel = new AnswerChannel(status);
    const answer = channel.waitForAnswer('2FA code');

    const socket = await waitUntilAsked(status);
    expect(status.current).toMatchObject({ state: 'waiting', ask: '2FA code', step: 3 });
    await sendAnswer(socket, '123456\n');

    await expect(answer).resolves.toBe('123456');
    expect(status.current).toEqual({ state: 'recording', step: 3 });
  });

  it('keeps an answer with line breaks whole', async () => {
    const status = new StatusFile(dir.path());
    const answer = new AnswerChannel(status).waitForAnswer('note');

    await sendAnswer(await waitUntilAsked(status), 'first line\nsecond line\n');

    await expect(answer).resolves.toBe('first line\nsecond line');
  });

  it('gives up with exit 6 when nobody answers', async () => {
    const channel = new AnswerChannel(new StatusFile(dir.path()), 30);

    await expect(channel.waitForAnswer('code')).rejects.toMatchObject({
      exitCode: ExitCode.Timeout,
    });
  });

  it('uses a named pipe on Windows and a socket file elsewhere', () => {
    expect(answerSocketPath('win32')).toMatch(/^\\\\\.\\pipe\\cursorcam-[0-9a-f]{12}$/);
    expect(answerSocketPath('linux')).toMatch(/cursorcam-[0-9a-f]{12}\.sock$/);
  });

  it('fails to send when no run is listening', async () => {
    await expect(sendAnswer(answerSocketPath(), 'x')).rejects.toThrow();
  });
});
