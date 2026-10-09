import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const APP_DIR = join(import.meta.dirname, 'app');
const PORT = 4310;
const HOST = '127.0.0.1';
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', `http://${HOST}`).pathname;
  const file = normalize(join(APP_DIR, path === '/' ? 'index.html' : path));
  const type = CONTENT_TYPES[extname(file)];
  if (!file.startsWith(APP_DIR) || !type) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});

server.listen(PORT, HOST, () => console.log(`Demo app on http://${HOST}:${PORT}`));
