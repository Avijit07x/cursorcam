import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunStatus, StatusFile } from '../runs/status.js';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { withTimeout } from '../shared/time.js';
import type { AnswerSource } from './context.js';

const ASK_TIMEOUT_MS = 5 * 60 * 1000;
const SOCKET_ID_BYTES = 6;
const MAX_ANSWER_BYTES = 4096;
const SEND_TIMEOUT_MS = 10_000;
const ACCEPTED_REPLY = 'ok';
const LINE_END = '\n';
const TRAILING_NEWLINE = /\r?\n$/;

export function answerSocketPath(platform: NodeJS.Platform = process.platform): string {
  const id = randomBytes(SOCKET_ID_BYTES).toString('hex');
  return platform === 'win32'
    ? `\\\\.\\pipe\\cursorcam-${id}`
    : join(tmpdir(), `cursorcam-${id}.sock`);
}

export class AnswerChannel implements AnswerSource {
  readonly #status: StatusFile;
  readonly #timeoutMs: number;

  constructor(status: StatusFile, timeoutMs: number = ASK_TIMEOUT_MS) {
    this.#status = status;
    this.#timeoutMs = timeoutMs;
  }

  async waitForAnswer(label: string): Promise<string> {
    const socketPath = answerSocketPath();
    const previous = this.#status.current;
    const answer = Promise.withResolvers<string>();
    const server = createServer((socket) => receive(socket, answer.resolve));
    await listen(server, socketPath);
    try {
      await this.#status.update({
        ...previous,
        state: 'waiting',
        ask: label,
        answerSocket: socketPath,
      });
      return await withTimeout(
        answer.promise,
        this.#timeoutMs,
        () =>
          new CursorCamError(
            `Nobody answered "${label}" within ${this.#timeoutMs / 60_000} minutes.`,
            {
              exitCode: ExitCode.Timeout,
              hint: 'Run the steps again and answer sooner with cursorcam answer.',
            },
          ),
      );
    } finally {
      server.close();
      if (process.platform !== 'win32') await rm(socketPath, { force: true });
      await this.#status.update(withoutAsk(previous));
    }
  }
}

function withoutAsk(status: RunStatus): RunStatus {
  const { ask: _ask, answerSocket: _socket, ...rest } = status;
  return rest;
}

function listen(server: Server, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(path, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function receive(socket: Socket, onAnswer: (answer: string) => void): void {
  let received = '';
  let answered = false;
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    if (answered) return;
    received += chunk;
    if (Buffer.byteLength(received) > MAX_ANSWER_BYTES) {
      socket.destroy();
      return;
    }
    const end = received.indexOf(LINE_END);
    if (end === -1) return;
    const answer = parseAnswer(received.slice(0, end));
    if (answer === undefined) {
      socket.destroy();
      return;
    }
    answered = true;
    socket.end(ACCEPTED_REPLY);
    if (answer !== '') onAnswer(answer);
  });
  socket.on('error', () => socket.destroy());
}

function parseAnswer(line: string): string | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function sendAnswer(socketPath: string, answer: string): Promise<void> {
  const line = `${JSON.stringify(answer.replace(TRAILING_NEWLINE, ''))}${LINE_END}`;
  const reply = new Promise<void>((resolve, reject) => {
    const socket = createConnection(socketPath);
    let response = '';
    socket.setEncoding('utf8');
    socket.on('connect', () => socket.write(line));
    socket.on('data', (chunk: string) => {
      response += chunk;
    });
    socket.on('close', () => {
      if (response === ACCEPTED_REPLY) resolve();
      else reject(new Error('The run did not accept the answer.'));
    });
    socket.on('error', reject);
  });
  return withTimeout(reply, SEND_TIMEOUT_MS, () => new Error('The run did not reply.'));
}
