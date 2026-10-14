import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { afterEach, describe, expect, it } from 'vitest';
import type { ToolResult } from '../../src/mcp/protocol.js';
import { useFixtureServer } from '../helpers/fixture-server.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { browserAvailable, CLI_PATH, useTempCache } from './helpers.js';

interface Reply {
  readonly id: number;
  readonly result?: Record<string, unknown>;
  readonly error?: { code: number; message: string };
}

const MAX_WAITS = 20;

function startClient(cwd: string, env: NodeJS.ProcessEnv) {
  const child: ChildProcessWithoutNullStreams = spawn(process.execPath, [CLI_PATH, 'mcp'], {
    cwd,
    env,
  });
  const waiting = new Map<number, (reply: Reply) => void>();
  const lines: string[] = [];
  createInterface({ input: child.stdout }).on('line', (line) => {
    lines.push(line);
    const reply = JSON.parse(line) as Reply;
    waiting.get(reply.id)?.(reply);
  });
  let nextId = 1;
  const request = (method: string, params: unknown = {}): Promise<Reply> =>
    new Promise((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  const tool = async (name: string, args: Record<string, unknown> = {}): Promise<ToolResult> =>
    (await request('tools/call', { name, arguments: args })).result as unknown as ToolResult;
  const close = (): Promise<number | null> =>
    new Promise((resolve) => {
      child.once('close', resolve);
      child.stdin.end();
    });
  return { request, tool, close, transcript: () => lines.join('\n'), child };
}

const textOf = (result: ToolResult): string =>
  result.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
const imagesOf = (result: ToolResult) => result.content.filter((part) => part.type === 'image');
const runFolderOf = (result: ToolResult): string => {
  const folder = /"run": "([^"]+)"/.exec(textOf(result))?.[1];
  if (!folder) throw new Error(`No run folder in: ${textOf(result)}`);
  return folder;
};

describe.skipIf(!browserAvailable())('cursorcam mcp', () => {
  const site = useFixtureServer();
  const cache = useTempCache();
  const work = useTempDir('each');
  let client: ReturnType<typeof startClient> | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  const waitUntilSettled = async (run: string): Promise<ToolResult> => {
    for (let attempt = 0; attempt < MAX_WAITS; attempt++) {
      const result = await client!.tool('wait', { run, timeout: 30 });
      if (!textOf(result).includes('"state": "running"')) return result;
    }
    throw new Error(`The run never settled: ${run}`);
  };

  it('starts, lists its tools and inspects a page with its first frame', async () => {
    client = startClient(work.path(), cache.env());

    const init = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'e2e', version: '0' },
    });
    expect(init.result).toMatchObject({
      protocolVersion: '2025-06-18',
      serverInfo: { name: 'cursorcam' },
    });
    const list = await client.request('tools/list');
    expect((list.result?.tools as { name: string }[]).map((tool) => tool.name)).toContain('run');

    const inspected = await client.tool('inspect', { url: site.url('/basics.html'), limit: 5 });

    expect(inspected.isError).toBe(false);
    expect(textOf(inspected)).toContain("role=button[name='Get started']");
    expect(imagesOf(inspected)).toEqual([
      expect.objectContaining({ type: 'image', mimeType: 'image/jpeg' }),
    ]);
  });

  it('checks, records with a secret and an answer, and returns stills', async () => {
    const secret = 'mcp-pa55word';
    const code = '424242';
    const steps = {
      name: 'mcp flow',
      url: site.url('/secrets.html'),
      steps: [
        { type: '$secret:TOKEN', into: 'label=API token' },
        { ask: 'Verification code', into: 'label=Verification code' },
        { click: 'text=Verify' },
        { waitFor: 'text=verified', pauseAfter: 300 },
      ],
    };
    client = startClient(work.path(), cache.env());

    const checked = await client.tool('check', { steps, secrets: { TOKEN: secret }, until: 1 });
    expect(checked.isError).toBe(false);
    const checkDone = await waitUntilSettled(runFolderOf(checked));
    expect(textOf(checkDone)).toContain('The check passed');

    const started = await client.tool('run', { steps, secrets: { TOKEN: secret } });
    const run = runFolderOf(started);
    const asked = await waitUntilSettled(run);
    expect(textOf(asked)).toContain('Verification code');
    expect(textOf(asked)).toContain('call answer');

    const answered = await client.tool('answer', { run, answer: code });
    expect(answered.isError).toBe(false);
    const done = await waitUntilSettled(run);
    expect(textOf(done)).toContain('Call stills');
    expect(textOf(done)).toContain('video.mp4');

    const stills = await client.tool('stills', { run, count: 2 });
    expect(stills.isError).toBe(false);
    expect(imagesOf(stills).length).toBeGreaterThan(0);
    expect(imagesOf(stills)[0]).toMatchObject({ mimeType: 'image/png' });

    expect(client.transcript()).not.toContain(secret);
    expect(client.transcript()).not.toContain(code);
    for (const name of await readdir(run)) {
      const content = await readFile(join(run, name), 'utf8').catch(() => '');
      expect(content).not.toContain(secret);
      expect(content).not.toContain(code);
    }
  });

  it('returns a failed check as an error with its failure frame', async () => {
    client = startClient(work.path(), cache.env());

    const checked = await client.tool('check', {
      steps: { url: site.url('/basics.html'), timeout: 1500, steps: [{ click: 'text=Nope' }] },
    });
    const failed = await waitUntilSettled(runFolderOf(checked));

    expect(failed.isError).toBe(true);
    expect(textOf(failed)).toContain('Exit code: 4');
    expect(imagesOf(failed)).toHaveLength(1);
  });

  it('exits cleanly when the client closes its input', async () => {
    client = startClient(work.path(), cache.env());
    await client.request('ping');

    const exitCode = await client.close();
    client = undefined;

    expect(exitCode).toBe(0);
  });
});
