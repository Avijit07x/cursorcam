import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CliCall, CliResult } from '../../../src/mcp/cli-call.js';
import type { Tool, ToolResult } from '../../../src/mcp/protocol.js';
import { createTools } from '../../../src/mcp/tools.js';
import { clearSecrets } from '../../../src/shared/redact.js';
import { useTempDir } from '../../helpers/temp-dir.js';

const OK = { exitCode: 0, stdout: '', stderr: '' };
const MB = 1024 * 1024;
const WORKSPACE = tmpdir();
const WORK_OUT = join(WORKSPACE, 'cursorcam-output');

function setup(
  reply: (call: CliCall) => Partial<CliResult> = () => ({}),
  workspace: string | null = WORKSPACE,
) {
  const calls: CliCall[] = [];
  const tools = createTools((call) => {
    calls.push(call);
    return Promise.resolve({ ...OK, ...reply(call) });
  });
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const context = { workspace: () => Promise.resolve(workspace ?? undefined) };
  const call = (name: string, args: Record<string, unknown> = {}): Promise<ToolResult> =>
    (byName.get(name) as Tool).call(args, new AbortController().signal, context);
  return { tools, calls, call };
}

const textOf = (result: ToolResult): string =>
  result.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
const imageCount = (result: ToolResult): number =>
  result.content.filter((part) => part.type === 'image').length;

afterEach(() => clearSecrets());

describe('createTools', () => {
  const dir = useTempDir('each');

  it('offers one tool per command, each with a plain JSON object schema', () => {
    const { tools } = setup();

    expect(tools.map((tool) => tool.name)).toEqual([
      'doctor',
      'inspect',
      'check',
      'record',
      'run',
      'render',
      'stills',
      'wait',
      'answer',
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
      expect(tool.inputSchema).not.toHaveProperty('$schema');
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it('runs doctor with JSON output, in the folder the client has open', async () => {
    const { calls, call } = setup(() => ({ stdout: '[{"name":"Node.js"}]' }));

    const result = await call('doctor');

    expect(calls[0]).toMatchObject({ args: ['doctor', '--json'], cwd: WORKSPACE });
    expect(result.isError).toBe(false);
    expect(textOf(result)).toBe('[{"name":"Node.js"}]');
  });

  it('works in the server folder when the client shares no folder', async () => {
    const { calls, call } = setup(() => ({}), null);

    await call('doctor');

    expect(calls[0]?.cwd).toBe(process.cwd());
  });

  it('inspects a page and returns its first frame as an image', async () => {
    const frame = join(dir.path(), 'frame.jpg');
    await writeFile(frame, Buffer.from([0xff, 0xd8, 0xff]));
    const { calls, call } = setup(() => ({ stdout: JSON.stringify({ frame, targets: [] }) }));

    const result = await call('inspect', {
      url: 'http://localhost:3000',
      phone: true,
      limit: 5,
      mask: ['.email'],
    });

    expect(calls[0]?.args).toEqual([
      'inspect',
      'http://localhost:3000',
      '--phone',
      '--limit',
      '5',
      '--out',
      WORK_OUT,
      '--mask',
      '.email',
      '--json',
    ]);
    expect(result.content[1]).toEqual({
      type: 'image',
      data: Buffer.from([0xff, 0xd8, 0xff]).toString('base64'),
      mimeType: 'image/jpeg',
    });
  });

  it('saves inline steps and starts a check in the background with the secrets', async () => {
    const run = join(dir.path(), 'check-sign-up-1');
    const { calls, call } = setup(() => ({ stdout: JSON.stringify({ run, pid: 42 }) }));

    const result = await call('check', {
      steps: { name: 'sign-up', url: 'http://localhost:3000', steps: [{ pause: 600 }] },
      secrets: { PASSWORD: 'hunter2' },
      until: 3,
      out: dir.path(),
    });

    const steps = join(dir.path(), 'sign-up.json');
    expect(calls[0]?.args).toEqual([
      'check',
      steps,
      '--out',
      dir.path(),
      '--until',
      '3',
      '--detach',
      '--json',
    ]);
    expect(calls[0]?.env).toEqual({ CURSORCAM_SECRET_PASSWORD: 'hunter2' });
    expect(textOf(result)).toContain(`Steps: ${steps}`);
    expect(textOf(result)).toContain(`Call wait with run "${run}"`);
  });

  it('starts a run with the render options, from a steps path in the work folder', async () => {
    const { calls, call } = setup(() => ({ stdout: '{"run":"/tmp/demo-1"}' }));

    await call('run', {
      steps: 'flows/demo.json',
      for: 'x',
      maxSize: '10MB',
      style: { zoom: { max: 1.4 } },
      format: 'square',
      clean: true,
      profile: 'work',
    });

    expect(calls[0]?.args).toEqual([
      'run',
      join(WORKSPACE, 'flows', 'demo.json'),
      '--profile',
      'work',
      '--out',
      WORK_OUT,
      '--for',
      'x',
      '--max-size',
      '10MB',
      '--style',
      '{"zoom":{"max":1.4}}',
      '--format',
      'square',
      '--clean',
      '--detach',
      '--json',
    ]);
  });

  it('renders a run again in the foreground', async () => {
    const { calls, call } = setup();

    await call('render', { run: '/tmp/demo-1', for: 'linkedin' });

    expect(calls[0]?.args).toEqual(['render', '/tmp/demo-1', '--for', 'linkedin', '--json']);
  });

  it('returns key stills as images, within the size budget, and skips the crops', async () => {
    const stills = ['still-01-step-01.png', 'still-02-step-02.png', 'still-03-step-03.png'];
    const files = [...stills, 'crop-01-step-01.png'].map((name) => join(dir.path(), name));
    await Promise.all(files.map((file) => writeFile(file, Buffer.alloc(1.5 * MB))));
    const { calls, call } = setup(() => ({ stdout: JSON.stringify({ stills: files }) }));

    const result = await call('stills', { run: '/tmp/demo-1', count: 3 });

    expect(calls[0]?.args).toEqual(['stills', '/tmp/demo-1', '--count', '3', '--json']);
    expect(imageCount(result)).toBe(2);
    expect(textOf(result)).toContain('1 more stills are at the paths above.');
  });

  it('waits 45 seconds by default and says what to do next', async () => {
    const reply =
      (state: string, run = '/out/demo-1') =>
      () => ({
        stdout: JSON.stringify({ run, state }),
      });

    const running = setup(reply('running'));
    expect(textOf(await running.call('wait', { run: '/out/demo-1' }))).toContain('Call wait again');
    expect(running.calls[0]?.args).toEqual(['wait', '/out/demo-1', '--timeout', '45', '--json']);

    const checked = setup(reply('done', '/out/check-demo-1'));
    expect(textOf(await checked.call('wait'))).toContain('The check passed. Call run');
    expect(checked.calls[0]?.args).toEqual(['wait', '--timeout', '45', '--json']);

    const done = setup(reply('done'));
    expect(textOf(await done.call('wait', { timeout: 10 }))).toContain('Call stills');

    const asking = setup(reply('waiting'));
    expect(textOf(await asking.call('wait'))).toContain('then call answer');
  });

  it('marks a failed run as an error and shows the failure frame', async () => {
    const frame = join(dir.path(), 'failure.jpg');
    await writeFile(frame, Buffer.from([1, 2, 3]));
    const { call } = setup(() => ({
      exitCode: 4,
      stdout: JSON.stringify({ run: '/out/demo-1', state: 'failed', result: { frame } }),
    }));

    const result = await call('wait', { run: '/out/demo-1' });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Exit code: 4');
    expect(imageCount(result)).toBe(1);
  });

  it('sends an answer on stdin and never shows it in the output', async () => {
    const { calls, call } = setup(() => ({ stdout: 'Sent 123456 for "2FA code".' }));

    const result = await call('answer', { run: '/out/demo-1', answer: '123456' });

    expect(calls[0]).toMatchObject({ args: ['answer', '/out/demo-1'], input: '123456' });
    expect(textOf(result)).toBe('Sent ••• for "2FA code".');
  });

  it('reports bad arguments and bad secret names as tool errors', async () => {
    const { calls, call } = setup();

    const missing = await call('run', {});
    const badSecret = await call('check', { steps: 'a.json', secrets: { 'MY-PASS': 'x' } });

    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toContain('steps');
    expect(badSecret.isError).toBe(true);
    expect(textOf(badSecret)).toContain('Fix: Use letters, digits and underscores');
    expect(calls).toEqual([]);
  });

  it('passes the CLI error and exit code through', async () => {
    const { call } = setup(() => ({ exitCode: 2, stderr: 'Error: Bad steps\nFix: Add a url.' }));

    const result = await call('check', { steps: 'a.json', out: dir.path() });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('Error: Bad steps\nFix: Add a url.\n\nExit code: 2');
  });
});
