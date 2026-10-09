import { join } from 'node:path';
import { z } from 'zod';
import { CursorCamError } from '../shared/errors.js';
import { ExitCode } from '../shared/exit-codes.js';
import { META_FILE } from './dirs.js';
import { readJson, writeJsonAtomic } from './files.js';

const RecordingMetaSchema = z.object({
  version: z.literal(1),
  identity: z.enum(['desktop', 'phone']),
  viewport: z.object({ width: z.number(), height: z.number() }),
  scale: z.number(),
  frames: z.int(),
  durationMs: z.number(),
  startedAt: z.string(),
  browser: z.string(),
  url: z.string(),
});

export type RecordingMeta = z.output<typeof RecordingMetaSchema>;

export async function writeRecordingMeta(cacheDir: string, meta: RecordingMeta): Promise<void> {
  await writeJsonAtomic(join(cacheDir, META_FILE), meta);
}

export async function readRecordingMeta(cacheDir: string): Promise<RecordingMeta> {
  const parsed = RecordingMetaSchema.safeParse(
    await readJson(join(cacheDir, META_FILE), 'the recording'),
  );
  if (!parsed.success) {
    throw new CursorCamError(`The recording in ${cacheDir} is incomplete.`, {
      exitCode: ExitCode.BadInput,
      hint: 'Record the steps again.',
    });
  }
  return parsed.data;
}
