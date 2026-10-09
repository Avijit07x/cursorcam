import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo, Socket } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RenderJob, RenderProgress } from './job.js';

const TOKEN_BYTES = 12;
const MAX_BODY_BYTES = 64 * 1024 ** 2;
const PAGE_FILE = /^[a-z-]+\.js$/;
const FRAME_NUMBER = /^\d+$/;
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE_DIR = join(PACKAGE_ROOT, 'dist', 'render', 'page');
const MEDIABUNNY_FILE = join(
  dirname(createRequire(import.meta.url).resolve('mediabunny')),
  'mediabunny.min.mjs',
);
const BACKGROUND_PATH = 'background';
const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  jpeg: 'image/jpeg',
  binary: 'application/octet-stream',
} as const;

export interface RenderServerOptions {
  readonly frameFile: (index: number) => string | undefined;
  readonly backgroundFile?: string | undefined;
  readonly onProgress?: (progress: RenderProgress) => void;
  readonly onStill?: (name: string, data: Buffer) => Promise<void>;
}

export interface RenderServer {
  readonly url: string;
  readonly backgroundUrl: string;
  useJob(job: RenderJob): void;
  writeTo(output: FileHandle | undefined): void;
  close(): Promise<void>;
  flushWrites(): Promise<void>;
  writeFailure(): unknown;
}

interface ServerState {
  readonly pending: Set<Promise<unknown>>;
  failure: unknown;
  job: RenderJob | undefined;
  output: FileHandle | undefined;
}

const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>CursorCam render</title>
<script type="importmap">{"imports":{"mediabunny":"./vendor/mediabunny.mjs"}}</script>
<script type="module" src="./page/main.js"></script>
</head><body></body></html>`;

export async function startRenderServer(options: RenderServerOptions): Promise<RenderServer> {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const prefix = `/${token}/`;
  const sockets = new Set<Socket>();
  const state: ServerState = {
    pending: new Set(),
    failure: undefined,
    job: undefined,
    output: undefined,
  };
  const server: Server = createServer((request, response) => {
    const work = route(request, response, prefix, options, state).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
    void work;
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}${prefix}`;
  return {
    url,
    backgroundUrl: `${url}${BACKGROUND_PATH}`,
    useJob: (job) => {
      state.job = job;
    },
    writeTo: (output) => {
      state.output = output;
    },
    flushWrites: async () => {
      await Promise.allSettled(state.pending);
    },
    writeFailure: () => state.failure,
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  prefix: string,
  options: RenderServerOptions,
  state: ServerState,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://render');
  if (!url.pathname.startsWith(prefix)) return send(response, 404);
  const path = url.pathname.slice(prefix.length);
  const [section, name = ''] = path.split('/');

  if (request.method === 'GET') {
    if (path === '') return send(response, 200, CONTENT_TYPES.html, PAGE_HTML);
    if (path === 'job') {
      return state.job
        ? send(response, 200, CONTENT_TYPES.json, JSON.stringify(state.job))
        : send(response, 503);
    }
    if (path === 'vendor/mediabunny.mjs')
      return stream(response, MEDIABUNNY_FILE, CONTENT_TYPES.js);
    if (section === 'page' && PAGE_FILE.test(name))
      return stream(response, join(PAGE_DIR, name), CONTENT_TYPES.js);
    if (section === 'frame' && FRAME_NUMBER.test(name)) {
      const file = options.frameFile(Number(name));
      return file ? stream(response, file, CONTENT_TYPES.jpeg) : send(response, 404);
    }
    if (path === BACKGROUND_PATH && options.backgroundFile) {
      return stream(response, options.backgroundFile, CONTENT_TYPES.binary);
    }
    return send(response, 404);
  }

  if (request.method !== 'POST') return send(response, 405);
  const body = await readBody(request);
  const output = state.output;
  if (path === 'output' && output) {
    const position = Number(url.searchParams.get('position'));
    if (!Number.isSafeInteger(position) || position < 0) return send(response, 400);
    const write = output.write(body, 0, body.length, position);
    state.pending.add(write);
    try {
      await write;
    } catch (error) {
      state.failure ??= error;
      throw error;
    } finally {
      state.pending.delete(write);
    }
    return send(response, 204);
  }
  if (path === 'progress') {
    options.onProgress?.(JSON.parse(body.toString('utf8')) as RenderProgress);
    return send(response, 204);
  }
  if (path === 'still' && options.onStill) {
    await options.onStill(url.searchParams.get('name') ?? 'still', body);
    return send(response, 204);
  }
  return send(response, 404);
}

function send(response: ServerResponse, status: number, type?: string, body?: string): void {
  response.writeHead(status, type ? { 'content-type': type, 'cache-control': 'no-store' } : {});
  response.end(body);
}

function stream(response: ServerResponse, file: string, type: string): Promise<void> {
  return new Promise((resolve) => {
    const source = createReadStream(file);
    source.once('open', () =>
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }),
    );
    source.once('error', () => {
      if (!response.headersSent) response.writeHead(404);
      response.end();
      resolve();
    });
    source.once('end', resolve);
    source.pipe(response);
  });
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('The request body is too large.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
