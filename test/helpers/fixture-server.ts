import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { afterAll, beforeAll } from 'vitest';

const APP_DIR = join(import.meta.dirname, '..', 'fixtures', 'app');
const SSE_PING_MS = 1_000;
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

export interface FixtureServer {
  readonly url: string;
  readonly otherOrigin: string;
  close(): Promise<void>;
}

type Route = (request: IncomingMessage, response: ServerResponse, url: URL) => void;

const ROUTES: ReadonlyMap<string, Route> = new Map<string, Route>([
  ['/events', streamEvents],
  ['/poll', (_, response) => sendJson(response, { ok: true })],
  [
    '/slow',
    (_, response, url) =>
      setTimeout(
        () => sendJson(response, { slow: true }),
        Number(url.searchParams.get('ms') ?? 500),
      ),
  ],
  ['/slow-font', (_, response) => setTimeout(() => sendStatus(response, 404), 1_500)],
  [
    '/download.txt',
    (_, response) => {
      response.writeHead(200, {
        'content-type': 'text/plain',
        'content-disposition': 'attachment; filename="report.txt"',
      });
      response.end('downloaded');
    },
  ],
  ['/missing', (_, response) => sendStatus(response, 404)],
]);

export async function startFixtureServer(): Promise<FixtureServer> {
  const sockets = new Set<Socket>();
  const server: Server = createServer((request, response) => void handle(request, response));
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    otherOrigin: `http://localhost:${port}`,
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

export function useFixtureServer(): { url: (path?: string) => string; otherOrigin: () => string } {
  let server: FixtureServer | undefined;
  beforeAll(async () => {
    server = await startFixtureServer();
  });
  afterAll(async () => {
    await server?.close();
  });
  const current = () => {
    if (!server) throw new Error('useFixtureServer is only available inside a test');
    return server;
  };
  return {
    url: (path = '/') => `${current().url}${path}`,
    otherOrigin: () => current().otherOrigin,
  };
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://fixture');
  const route = ROUTES.get(url.pathname);
  if (route) {
    route(request, response, url);
    return;
  }
  const file = normalize(join(APP_DIR, url.pathname === '/' ? 'basics.html' : url.pathname));
  if (!file.startsWith(APP_DIR)) {
    sendStatus(response, 403);
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    sendStatus(response, 404);
  }
}

function streamEvents(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  response.write('data: hello\n\n');
  const timer = setInterval(() => response.write('data: ping\n\n'), SSE_PING_MS);
  request.on('close', () => clearInterval(timer));
}

function sendJson(response: ServerResponse, body: unknown): void {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function sendStatus(response: ServerResponse, status: number): void {
  response.writeHead(status, { 'content-type': 'text/plain' });
  response.end(String(status));
}
