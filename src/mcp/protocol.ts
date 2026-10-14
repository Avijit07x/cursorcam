import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { Readable, Writable } from 'node:stream';
import { z } from 'zod';
import { messageOf } from '../shared/errors.js';
import type { Lifecycle } from '../system/lifecycle.js';

export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

const RpcCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  Internal: -32603,
} as const;

export type Content =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly data: string; readonly mimeType: string };

export interface ToolResult {
  readonly content: readonly Content[];
  readonly isError?: boolean;
}

export interface ToolContext {
  /** The first folder the client has open, from MCP roots, when it shares them. */
  workspace(): Promise<string | undefined>;
}

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  call(
    args: Record<string, unknown>,
    signal: AbortSignal,
    context: ToolContext,
  ): Promise<ToolResult>;
}

export interface ServerInfo {
  readonly name: string;
  readonly version: string;
  readonly instructions: string;
}

export interface ServerIo {
  readonly input: Readable;
  readonly output: Writable;
}

type RequestId = string | number;

const ROOTS_TIMEOUT_MS = 3_000;
const SERVER_REQUEST_PREFIX = 'cursorcam-';

const Message = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
});

const InitializeParams = z.looseObject({
  protocolVersion: z.string().optional(),
  capabilities: z.looseObject({ roots: z.unknown().optional() }).optional(),
});
const RootsResult = z.looseObject({ roots: z.array(z.looseObject({ uri: z.string() })) });
const CallParams = z.looseObject({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
});
const CancelParams = z.looseObject({ requestId: z.union([z.string(), z.number()]) });

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

export function toolError(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function negotiateVersion(requested: string | undefined): string {
  const known = PROTOCOL_VERSIONS.find((version) => version === requested);
  return known ?? PROTOCOL_VERSIONS[0];
}

export function firstFolder(result: unknown): string | undefined {
  const parsed = RootsResult.safeParse(result);
  const uri = parsed.data?.roots.find((root) => root.uri.startsWith('file:'))?.uri;
  if (!uri) return undefined;
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

export async function serveMcp(
  tools: readonly Tool[],
  info: ServerInfo,
  io: ServerIo,
  lifecycle: Lifecycle,
): Promise<void> {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const running = new Map<RequestId, AbortController>();
  const cancelled = new Set<RequestId>();
  const pending = new Set<Promise<void>>();
  const lines = createInterface({ input: io.input, crlfDelay: Infinity });
  const replies = new Map<string, (result: unknown) => void>();
  let closed = false;
  let clientHasRoots = false;
  let requestCount = 0;
  let workspace: Promise<string | undefined> = Promise.resolve(undefined);

  const send = (message: object): void => {
    if (!closed) io.output.write(`${JSON.stringify(message)}\n`);
  };
  const sendError = (id: RequestId | null, code: number, message: string): void =>
    send({ jsonrpc: '2.0', id, error: { code, message } });

  const askClient = (method: string): Promise<unknown> =>
    new Promise((resolve) => {
      const id = `${SERVER_REQUEST_PREFIX}${++requestCount}`;
      const timer = setTimeout(() => settle(undefined), ROOTS_TIMEOUT_MS);
      const settle = (result: unknown): void => {
        clearTimeout(timer);
        replies.delete(id);
        resolve(result);
      };
      replies.set(id, settle);
      send({ jsonrpc: '2.0', id, method });
    });

  const refreshWorkspace = (): void => {
    if (clientHasRoots) workspace = askClient('roots/list').then(firstFolder);
  };
  const context: ToolContext = { workspace: () => workspace };

  const callTool = async (id: RequestId, params: unknown): Promise<ToolResult> => {
    const parsed = CallParams.safeParse(params);
    if (!parsed.success) throw new RpcError(RpcCode.InvalidParams, 'tools/call needs a tool name.');
    const tool = byName.get(parsed.data.name);
    if (!tool) throw new RpcError(RpcCode.InvalidParams, `Unknown tool: ${parsed.data.name}`);
    const controller = new AbortController();
    running.set(id, controller);
    try {
      return await tool.call(parsed.data.arguments ?? {}, controller.signal, context);
    } catch (error) {
      return toolError(messageOf(error));
    } finally {
      running.delete(id);
    }
  };

  const answer = async (id: RequestId, method: string, params: unknown): Promise<unknown> => {
    switch (method) {
      case 'initialize': {
        const init = InitializeParams.safeParse(params).data;
        clientHasRoots = init?.capabilities?.roots !== undefined;
        return {
          protocolVersion: negotiateVersion(init?.protocolVersion),
          capabilities: { tools: {} },
          serverInfo: { name: info.name, version: info.version },
          instructions: info.instructions,
        };
      }
      case 'ping':
        return {};
      case 'tools/list':
        return {
          tools: tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
        };
      case 'tools/call':
        return callTool(id, params);
      default:
        throw new RpcError(RpcCode.MethodNotFound, `Method not found: ${method}`);
    }
  };

  const handleRequest = async (id: RequestId, method: string, params: unknown): Promise<void> => {
    let reply: object;
    try {
      reply = { jsonrpc: '2.0', id, result: await answer(id, method, params) };
    } catch (error) {
      const code = error instanceof RpcError ? error.code : RpcCode.Internal;
      reply = { jsonrpc: '2.0', id, error: { code, message: messageOf(error) } };
    }
    if (!cancelled.delete(id)) send(reply);
  };

  const cancel = (params: unknown): void => {
    const parsed = CancelParams.safeParse(params);
    const controller = parsed.success ? running.get(parsed.data.requestId) : undefined;
    if (!parsed.success || !controller) return;
    cancelled.add(parsed.data.requestId);
    controller.abort();
  };

  const handleLine = (line: string): void => {
    if (line.trim() === '') return;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      sendError(null, RpcCode.ParseError, 'Parse error');
      return;
    }
    const message = Message.safeParse(raw);
    if (!message.success) {
      sendError(null, RpcCode.InvalidRequest, 'Invalid request');
      return;
    }
    const { id, method, params, result } = message.data;
    if (method === undefined) {
      if (typeof id === 'string') replies.get(id)?.(result);
      return;
    }
    if (id === undefined) {
      if (method === 'notifications/cancelled') cancel(params);
      if (method === 'notifications/initialized' || method === 'notifications/roots/list_changed') {
        refreshWorkspace();
      }
      return;
    }
    const work = handleRequest(id, method, params);
    pending.add(work);
    void work.finally(() => pending.delete(work));
  };

  const stop = (): void => {
    closed = true;
    for (const controller of running.values()) controller.abort();
    for (const settle of [...replies.values()]) settle(undefined);
    io.output.off('error', stop);
    lines.close();
  };
  lifecycle.add(stop);
  io.output.on('error', stop);
  lines.on('line', handleLine);
  await new Promise<void>((resolve) => lines.once('close', resolve));
  await Promise.allSettled(pending);
}
