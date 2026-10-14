import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { z } from 'zod';
import { CursorCamError, messageOf } from '../shared/errors.js';
import { redact, registerSecret } from '../shared/redact.js';
import { CHECK_NAME_PREFIX } from '../cli/run-flow.js';
import type { CliResult, RunCli } from './cli-call.js';
import {
  toolError,
  type Content,
  type Tool,
  type ToolContext,
  type ToolResult,
} from './protocol.js';
import { flags, outDir, secretEnv, stepsFile, styleArg, workDir } from './tool-args.js';

const IMAGE_BUDGET_BYTES = 4 * 1024 * 1024;
const WAIT_SECONDS = 45;
const MAX_WAIT_SECONDS = 55;
const KEY_STILL = /^still-/;
const IMAGE_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const JsonObject = z.looseObject({});
const RunFolder = z.string().min(1).describe('Run folder, as returned by check, record or run');
const RunArgs = {
  steps: z
    .union([z.string().min(1), JsonObject])
    .describe('The steps as a JSON object, or the path of a steps file'),
  secrets: z
    .record(z.string(), z.string())
    .optional()
    .describe('Values for $secret:NAME in the steps, like {"PASSWORD": "..."}. Never saved.'),
  profile: z.string().optional().describe('A login saved with cursorcam login'),
  out: z
    .string()
    .optional()
    .describe("Folder for run folders. Default: cursorcam-output in the user's project"),
};
const RenderArgs = {
  for: z
    .enum(['youtube', 'x', 'linkedin', 'discord'])
    .optional()
    .describe('Where the video will be posted'),
  maxSize: z.string().optional().describe('Keep the file under this size, like "10MB"'),
  style: z
    .union([z.string(), JsonObject])
    .optional()
    .describe('Look of the video, like {"zoom":{"max":1.4}}, or a style file path'),
  format: z.enum(['landscape', 'square', 'vertical']).optional(),
  clean: z.boolean().optional().describe('Delete the raw frames after rendering'),
};

interface Call {
  readonly signal: AbortSignal;
  readonly cwd: string;
}

interface ToolSpec<S extends z.ZodObject> {
  readonly name: string;
  readonly description: string;
  readonly args: S;
  run(args: z.output<S>, call: Call): Promise<ToolResult>;
}

function defineTool<S extends z.ZodObject>(spec: ToolSpec<S>): Tool {
  const inputSchema = z.toJSONSchema(spec.args, { io: 'input', unrepresentable: 'any' });
  delete inputSchema.$schema;
  return {
    name: spec.name,
    description: spec.description,
    inputSchema,
    async call(raw, signal, context: ToolContext) {
      const parsed = spec.args.safeParse(raw);
      if (!parsed.success) return toolError(z.prettifyError(parsed.error));
      try {
        return await spec.run(parsed.data, { signal, cwd: workDir(await context.workspace()) });
      } catch (error) {
        const hint = error instanceof CursorCamError && error.hint ? `\nFix: ${error.hint}` : '';
        return toolError(redact(`Error: ${messageOf(error)}${hint}`));
      }
    },
  };
}

function fromCli(result: CliResult, next?: string, images: readonly Content[] = []): ToolResult {
  const failed = result.exitCode !== 0;
  const parts = [result.stdout.trim(), result.stderr.trim()];
  parts.push(failed ? `Exit code: ${result.exitCode}` : (next ?? ''));
  const text = redact(parts.filter(Boolean).join('\n\n'));
  return { content: [{ type: 'text', text }, ...images], isError: failed };
}

function parseJson(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

async function imagesOf(files: readonly unknown[]): Promise<{ images: Content[]; left: number }> {
  const images: Content[] = [];
  let budget = IMAGE_BUDGET_BYTES;
  for (const file of files) {
    if (typeof file !== 'string') continue;
    const mimeType = IMAGE_TYPES[extname(file).toLowerCase()];
    const data = mimeType ? await readFile(file).catch(() => undefined) : undefined;
    if (!mimeType || !data || data.length > budget) break;
    budget -= data.length;
    images.push({ type: 'image', data: data.toString('base64'), mimeType });
  }
  return { images, left: files.length - images.length };
}

function renderFlags(args: z.output<z.ZodObject<typeof RenderArgs>>): string[] {
  return flags({
    '--for': args.for,
    '--max-size': args.maxSize,
    '--style': styleArg(args.style),
    '--format': args.format,
    '--clean': args.clean,
  });
}

const WAIT_NEXT: Readonly<Record<string, string>> = {
  running: 'Still going. Call wait again.',
  waiting: 'The run needs an answer. Ask the user, then call answer with their reply.',
  done: 'Done. Call stills to review the video before you hand it back.',
  stopped: 'The run stopped before it finished. Read the log and start it again.',
};
const CHECK_PASSED = 'The check passed. Call run with the same steps to make the video.';

function waitNext(state: string, run: unknown): string | undefined {
  const isCheck = typeof run === 'string' && basename(run).startsWith(CHECK_NAME_PREFIX);
  return state === 'done' && isCheck ? CHECK_PASSED : WAIT_NEXT[state];
}

export function createTools(run: RunCli): Tool[] {
  const startRun = async (
    command: 'check' | 'record' | 'run',
    args: z.output<z.ZodObject<typeof RunArgs>>,
    extra: readonly string[],
    { signal, cwd }: Call,
  ): Promise<ToolResult> => {
    const out = await outDir(cwd, args.out);
    const file = await stepsFile(args.steps, cwd, out);
    const env = secretEnv(args.secrets);
    const result = await run({
      args: [
        command,
        file,
        ...flags({ '--profile': args.profile, '--out': out }),
        ...extra,
        '--detach',
        '--json',
      ],
      env,
      cwd,
      signal,
    });
    const folder = parseJson(result.stdout)?.run;
    const next =
      typeof folder === 'string'
        ? `Steps: ${file}\nStarted in the background. Call wait with run "${folder}".`
        : undefined;
    return fromCli(result, next);
  };

  return [
    defineTool({
      name: 'doctor',
      description:
        'Check that this machine can record: Node.js, a Chrome-family browser, screen capture, the video encoder and disk space.',
      args: z.object({}),
      run: async (_, { signal, cwd }) =>
        fromCli(await run({ args: ['doctor', '--json'], cwd, signal })),
    }),
    defineTool({
      name: 'inspect',
      description:
        'Open a page and return its first video frame as an image, plus the targets that match exactly one element, for writing steps.',
      args: z.object({
        url: z.string().min(1).describe('Page address'),
        phone: z.boolean().optional().describe('Use the phone layout'),
        filter: z.string().optional().describe('Only list targets that contain this text'),
        limit: z.int().positive().optional().describe('List at most this many targets'),
        mask: z.array(z.string()).optional().describe('CSS selectors to blur'),
        profile: RunArgs.profile,
        out: RunArgs.out,
      }),
      run: async (args, { signal, cwd }) => {
        const result = await run({
          args: [
            'inspect',
            args.url,
            ...flags({
              '--phone': args.phone,
              '--filter': args.filter,
              '--limit': args.limit,
              '--profile': args.profile,
              '--out': await outDir(cwd, args.out),
              '--mask': args.mask,
            }),
            '--json',
          ],
          cwd,
          signal,
        });
        const { images } = await imagesOf([parseJson(result.stdout)?.frame]);
        return fromCli(result, undefined, images);
      },
    }),
    defineTool({
      name: 'check',
      description:
        'Dry-run the steps in the background and save one frame per step. Then call wait with the run folder.',
      args: z.object({
        ...RunArgs,
        until: z.int().positive().optional().describe('Stop after this step number'),
      }),
      run: (args, call) => startRun('check', args, flags({ '--until': args.until }), call),
    }),
    defineTool({
      name: 'record',
      description:
        'Record the steps in the background without rendering. Then call wait, and render.',
      args: z.object(RunArgs),
      run: (args, call) => startRun('record', args, [], call),
    }),
    defineTool({
      name: 'run',
      description:
        'Record the steps and render the MP4 in the background. Then call wait with the run folder until it is done.',
      args: z.object({ ...RunArgs, ...RenderArgs }),
      run: (args, call) => startRun('run', args, renderFlags(args), call),
    }),
    defineTool({
      name: 'render',
      description:
        'Render a recorded run again with a new size or look, in seconds, without recording again.',
      args: z.object({ run: RunFolder, ...RenderArgs }),
      run: async (args, { signal, cwd }) =>
        fromCli(
          await run({ args: ['render', args.run, ...renderFlags(args), '--json'], cwd, signal }),
        ),
    }),
    defineTool({
      name: 'stills',
      description:
        'Save key-moment stills of a run and return them as images, to review the video. A close-up crop per step is saved next to them.',
      args: z.object({
        run: RunFolder,
        count: z.int().positive().optional().describe('How many key moments. Default: 6'),
        for: RenderArgs.for,
        style: RenderArgs.style,
        format: RenderArgs.format,
      }),
      run: async (args, { signal, cwd }) => {
        const result = await run({
          args: [
            'stills',
            args.run,
            ...flags({
              '--count': args.count,
              '--for': args.for,
              '--style': styleArg(args.style),
              '--format': args.format,
            }),
            '--json',
          ],
          cwd,
          signal,
        });
        const files = parseJson(result.stdout)?.stills;
        const keyStills = Array.isArray(files)
          ? files.filter((file) => typeof file === 'string' && KEY_STILL.test(basename(file)))
          : [];
        const { images, left } = await imagesOf(keyStills);
        const more = left > 0 ? `${left} more stills are at the paths above.` : undefined;
        return fromCli(result, more, images);
      },
    }),
    defineTool({
      name: 'wait',
      description: `Wait up to ${WAIT_SECONDS} seconds for a run to finish, fail or ask for an answer. Call it again while the run is still going.`,
      args: z.object({
        run: RunFolder.optional(),
        timeout: z.int().min(1).max(MAX_WAIT_SECONDS).optional().describe('Seconds to wait'),
      }),
      run: async (args, { signal, cwd }) => {
        const result = await run({
          args: [
            'wait',
            ...(args.run ? [args.run] : []),
            '--timeout',
            String(args.timeout ?? WAIT_SECONDS),
            '--json',
          ],
          cwd,
          signal,
        });
        const check = parseJson(result.stdout);
        const state = typeof check?.state === 'string' ? check.state : '';
        const failure = check?.result as { frame?: unknown } | undefined;
        const { images } = state === 'failed' ? await imagesOf([failure?.frame]) : { images: [] };
        return fromCli(result, waitNext(state, check?.run), images);
      },
    }),
    defineTool({
      name: 'answer',
      description: "Send the user's reply, like a 2FA code, to a run waiting at an ask step.",
      args: z.object({ run: RunFolder, answer: z.string().min(1).describe("The user's reply") }),
      run: async (args, { signal, cwd }) => {
        registerSecret(args.answer);
        return fromCli(await run({ args: ['answer', args.run], input: args.answer, cwd, signal }));
      },
    }),
  ];
}
