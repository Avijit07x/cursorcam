import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { ExitCode } from '../shared/exit-codes.js';
import { writeJsonAtomic } from './files.js';

export const STATUS_FILE = 'status.json';
export const RESULT_FILE = 'result.json';

const RUN_STATES = [
  'starting',
  'recording',
  'checking',
  'waiting',
  'rendering',
  'done',
  'failed',
] as const;

export type RunState = (typeof RUN_STATES)[number];

export interface RunStatus {
  readonly state: RunState;
  readonly step?: number;
  readonly steps?: number;
  readonly action?: string;
  readonly ask?: string;
  readonly answerSocket?: string;
  readonly progress?: number;
  readonly message?: string;
}

export interface RunResult {
  readonly ok: boolean;
  readonly exitCode: ExitCode;
  readonly error?: string;
  readonly hint?: string;
  readonly failedStep?: number;
  readonly frame?: string;
  readonly video?: string;
  readonly poster?: string;
  readonly sizeBytes?: number;
  readonly durationSeconds?: number;
  readonly stills?: readonly string[];
  readonly warnings?: readonly string[];
}

const SavedStatusSchema = z.object({
  state: z.enum(RUN_STATES),
  step: z.number().optional(),
  steps: z.number().optional(),
  action: z.string().optional(),
  ask: z.string().optional(),
  progress: z.number().optional(),
  message: z.string().optional(),
  pid: z.int().optional(),
  updatedAt: z.string().optional(),
});

export type SavedStatus = z.output<typeof SavedStatusSchema>;

const SavedResultSchema = z.object({
  ok: z.boolean(),
  exitCode: z.int(),
  error: z.string().optional(),
  hint: z.string().optional(),
  failedStep: z.int().optional(),
  frame: z.string().optional(),
  video: z.string().optional(),
  poster: z.string().optional(),
  sizeBytes: z.number().optional(),
  durationSeconds: z.number().optional(),
  warnings: z.array(z.string()).optional(),
});

export type SavedResult = z.output<typeof SavedResultSchema>;

export class StatusFile {
  readonly #file: string;
  #current: RunStatus = { state: 'starting' };
  #writing: Promise<void> = Promise.resolve();

  constructor(outDir: string) {
    this.#file = join(outDir, STATUS_FILE);
  }

  get current(): RunStatus {
    return this.#current;
  }

  update(status: RunStatus): Promise<void> {
    this.#current = status;
    const snapshot = { ...status, pid: process.pid, updatedAt: new Date().toISOString() };
    this.#writing = this.#writing
      .then(() => writeJsonAtomic(this.#file, snapshot))
      .catch(() => undefined);
    return this.#writing;
  }

  flush(): Promise<void> {
    return this.#writing;
  }
}

export async function writeResult(outDir: string, result: RunResult): Promise<void> {
  await writeJsonAtomic(join(outDir, RESULT_FILE), result);
}

export async function readStatus(outDir: string): Promise<SavedStatus | undefined> {
  return readSaved(join(outDir, STATUS_FILE), SavedStatusSchema);
}

export async function readResult(outDir: string): Promise<SavedResult | undefined> {
  return readSaved(join(outDir, RESULT_FILE), SavedResultSchema);
}

async function readSaved<T>(file: string, schema: z.ZodType<T>): Promise<T | undefined> {
  const text = await readFile(file, 'utf8').catch(() => undefined);
  if (text === undefined) return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
