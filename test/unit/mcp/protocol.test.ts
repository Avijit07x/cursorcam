import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import {
  firstFolder,
  negotiateVersion,
  PROTOCOL_VERSIONS,
  serveMcp,
  type Tool,
} from '../../../src/mcp/protocol.js';
import { Lifecycle } from '../../../src/system/lifecycle.js';

interface Reply {
  readonly id: number | string | null;
  readonly method?: string;
  readonly result?: Record<string, unknown>;
  readonly error?: { code: number; message: string };
}

const INFO = { name: 'cursorcam', version: '9.9.9', instructions: 'Do the thing.' };

const echo: Tool = {
  name: 'echo',
  description: 'Echo the text back',
  inputSchema: { type: 'object' },
  call: (args) => Promise.resolve({ content: [{ type: 'text', text: String(args.text) }] }),
};

const where: Tool = {
  name: 'where',
  description: 'Says which folder the client has open',
  inputSchema: { type: 'object' },
  call: async (_, __, context) => ({
    content: [{ type: 'text', text: String(await context.workspace()) }],
  }),
};

function hanging(onAbort: () => void): Tool {
  return {
    name: 'hang',
    description: 'Never answers until cancelled',
    inputSchema: { type: 'object' },
    call: (_, signal) =>
      new Promise((resolve) => {
        signal.addEventListener('abort', () => {
          onAbort();
          resolve({ content: [{ type: 'text', text: 'stopped' }] });
        });
      }),
  };
}

function throwing(): Tool {
  return {
    name: 'boom',
    description: 'Throws',
    inputSchema: { type: 'object' },
    call: () => Promise.reject(new Error('it broke')),
  };
}

const lifecycles: Lifecycle[] = [];

afterEach(async () => {
  await Promise.all(lifecycles.splice(0).map((lifecycle) => lifecycle.dispose()));
});

function startServer(tools: readonly Tool[]) {
  const input = new PassThrough();
  const output = new PassThrough();
  const lifecycle = new Lifecycle();
  lifecycles.push(lifecycle);
  const replies: Reply[] = [];
  const waiters: ((reply: Reply) => void)[] = [];
  createInterface({ input: output }).on('line', (line) => {
    const reply = JSON.parse(line) as Reply;
    const waiter = waiters.shift();
    if (waiter) waiter(reply);
    else replies.push(reply);
  });
  const done = serveMcp(tools, INFO, { input, output }, lifecycle);
  return {
    write: (message: unknown) => input.write(`${JSON.stringify(message)}\n`),
    writeRaw: (line: string) => input.write(`${line}\n`),
    next: (): Promise<Reply> => {
      const ready = replies.shift();
      return ready ? Promise.resolve(ready) : new Promise((resolve) => waiters.push(resolve));
    },
    end: () => input.end(),
    done,
    lifecycle,
    pending: () => replies.length,
  };
}

const request = (id: number, method: string, params?: unknown) => ({
  jsonrpc: '2.0',
  id,
  method,
  params,
});

describe('negotiateVersion', () => {
  it('keeps a version it knows and offers the newest otherwise', () => {
    expect(negotiateVersion('2025-03-26')).toBe('2025-03-26');
    expect(negotiateVersion('1999-01-01')).toBe(PROTOCOL_VERSIONS[0]);
    expect(negotiateVersion(undefined)).toBe(PROTOCOL_VERSIONS[0]);
  });
});

describe('firstFolder', () => {
  it('takes the first file root as a path', () => {
    const folder = pathToFileURL('/work/my app').href;

    expect(
      firstFolder({ roots: [{ uri: 'https://example.com' }, { uri: folder, name: 'app' }] }),
    ).toBe(resolve('/work/my app'));
  });

  it('is undefined without a file root or with a bad reply', () => {
    expect(firstFolder({ roots: [] })).toBeUndefined();
    expect(firstFolder({ roots: [{ uri: 'https://example.com' }] })).toBeUndefined();
    expect(firstFolder(undefined)).toBeUndefined();
  });
});

describe('serveMcp', () => {
  it('answers initialize with its name, version, tools capability and instructions', async () => {
    const server = startServer([echo]);
    server.write(request(1, 'initialize', { protocolVersion: '2025-06-18' }));

    expect(await server.next()).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'cursorcam', version: '9.9.9' },
        instructions: 'Do the thing.',
      },
    });
  });

  it('asks a client with roots for its folders and hands the first to tools', async () => {
    const server = startServer([where]);
    server.write(request(1, 'initialize', { capabilities: { roots: { listChanged: true } } }));
    await server.next();
    server.write({ jsonrpc: '2.0', method: 'notifications/initialized' });

    const ask = await server.next();
    expect(ask.method).toBe('roots/list');
    expect(typeof ask.id).toBe('string');
    server.write({
      jsonrpc: '2.0',
      id: ask.id,
      result: { roots: [{ uri: pathToFileURL('/work/app').href }] },
    });
    server.write(request(2, 'tools/call', { name: 'where' }));

    expect((await server.next()).result).toEqual({
      content: [{ type: 'text', text: resolve('/work/app') }],
    });
  });

  it('never asks a client without roots, and tools get no folder', async () => {
    const server = startServer([where]);
    server.write(request(1, 'initialize', { capabilities: {} }));
    await server.next();
    server.write({ jsonrpc: '2.0', method: 'notifications/initialized' });
    server.write(request(2, 'tools/call', { name: 'where' }));

    expect((await server.next()).result).toEqual({
      content: [{ type: 'text', text: 'undefined' }],
    });
    expect(server.pending()).toBe(0);
  });

  it('lists tools and answers ping', async () => {
    const server = startServer([echo]);
    server.write(request(1, 'tools/list'));
    server.write(request(2, 'ping'));

    expect((await server.next()).result).toEqual({
      tools: [{ name: 'echo', description: 'Echo the text back', inputSchema: { type: 'object' } }],
    });
    expect(await server.next()).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
  });

  it('calls a tool with its arguments', async () => {
    const server = startServer([echo]);
    server.write(request(7, 'tools/call', { name: 'echo', arguments: { text: 'hi' } }));

    expect((await server.next()).result).toEqual({ content: [{ type: 'text', text: 'hi' }] });
  });

  it('turns a tool that throws into a tool error the agent can read', async () => {
    const server = startServer([throwing()]);
    server.write(request(1, 'tools/call', { name: 'boom' }));

    expect((await server.next()).result).toEqual({
      content: [{ type: 'text', text: 'it broke' }],
      isError: true,
    });
  });

  it('rejects an unknown tool, an unknown method and a call without a name', async () => {
    const server = startServer([echo]);
    server.write(request(1, 'tools/call', { name: 'nope' }));
    server.write(request(2, 'resources/list'));
    server.write(request(3, 'tools/call', {}));

    const replies = [await server.next(), await server.next(), await server.next()];
    const byId = new Map(replies.map((reply) => [reply.id, reply.error]));

    expect(byId.get(1)).toEqual({ code: -32602, message: 'Unknown tool: nope' });
    expect(byId.get(2)).toEqual({ code: -32601, message: 'Method not found: resources/list' });
    expect(byId.get(3)?.code).toBe(-32602);
  });

  it('answers bad JSON and bad messages with errors, and ignores blank lines', async () => {
    const server = startServer([echo]);
    server.writeRaw('');
    server.writeRaw('{not json');
    server.write({ id: 1, method: 'ping' });

    expect(await server.next()).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
    expect((await server.next()).error).toEqual({ code: -32600, message: 'Invalid request' });
  });

  it('sends nothing for notifications or replies from the client', async () => {
    const server = startServer([echo]);
    server.write({ jsonrpc: '2.0', method: 'notifications/initialized' });
    server.write({ jsonrpc: '2.0', id: 99, result: {} });
    server.write(request(1, 'ping'));

    expect((await server.next()).id).toBe(1);
    expect(server.pending()).toBe(0);
  });

  it('stops a tool the client cancels, and sends no reply for it', async () => {
    let aborted = false;
    const server = startServer([hanging(() => (aborted = true))]);
    server.write(request(5, 'tools/call', { name: 'hang' }));
    await new Promise((resolve) => setImmediate(resolve));
    server.write({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 5 } });
    server.write(request(6, 'ping'));

    expect((await server.next()).id).toBe(6);
    expect(aborted).toBe(true);
    expect(server.pending()).toBe(0);
  });

  it('finishes calls in flight when the input closes, then resolves', async () => {
    const server = startServer([echo]);
    server.write(request(1, 'tools/call', { name: 'echo', arguments: { text: 'last' } }));
    server.end();

    expect((await server.next()).result).toEqual({ content: [{ type: 'text', text: 'last' }] });
    await expect(server.done).resolves.toBeUndefined();
  });

  it('cancels running tools when the lifecycle is disposed', async () => {
    let aborted = false;
    const server = startServer([hanging(() => (aborted = true))]);
    server.write(request(1, 'tools/call', { name: 'hang' }));
    await new Promise((resolve) => setImmediate(resolve));

    await server.lifecycle.dispose();

    await expect(server.done).resolves.toBeUndefined();
    expect(aborted).toBe(true);
  });
});
