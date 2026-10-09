import { join } from 'node:path';
import { afterEach, expect } from 'vitest';
import { parseSteps } from '../../src/config/load-steps.js';
import type { LoggedEvent } from '../../src/record/events.js';
import { FRAMES_INDEX_FILE, type FrameRecord } from '../../src/record/frames.js';
import { recordSteps, type Recording, type RecordMode } from '../../src/record/recorder.js';
import { createRunDirs, EVENTS_FILE, type RunDirs } from '../../src/runs/dirs.js';
import { readJsonLines } from '../../src/runs/files.js';
import { StatusFile } from '../../src/runs/status.js';
import { CursorCamError } from '../../src/shared/errors.js';
import { Lifecycle } from '../../src/system/lifecycle.js';
import { useTempDir } from '../helpers/temp-dir.js';
import { useTempCache } from './helpers.js';

export const FIXTURE_DIR = join(import.meta.dirname, '..', 'fixtures', 'app');

export interface FixtureRun {
  readonly recording: Recording;
  readonly dirs: RunDirs;
  readonly status: StatusFile;
  readonly events: readonly LoggedEvent[];
  readonly frames: readonly FrameRecord[];
}

export interface RecordOptions {
  readonly mode?: RecordMode;
  readonly env?: NodeJS.ProcessEnv;
  readonly onStatus?: (status: StatusFile) => void;
}

export function useRecorder(): {
  record(steps: object, options?: RecordOptions): Promise<FixtureRun>;
  fail(steps: object, options?: RecordOptions): Promise<CursorCamError>;
  outDir(): string;
} {
  const cache = useTempCache();
  const out = useTempDir('each');
  const lifecycles: Lifecycle[] = [];

  afterEach(async () => {
    await Promise.all(lifecycles.splice(0).map((lifecycle) => lifecycle.dispose()));
  });

  const record = async (steps: object, options: RecordOptions = {}): Promise<FixtureRun> => {
    const mode = options.mode ?? 'record';
    const env = options.env ?? {};
    const plan = parseSteps(steps, join(FIXTURE_DIR, 'steps.json'), env);
    const paths = cache.paths();
    const dirs = await createRunDirs('test', out.path(), paths.cache, mode === 'record');
    const status = new StatusFile(dirs.outDir);
    options.onStatus?.(status);
    const lifecycle = new Lifecycle();
    lifecycles.push(lifecycle);
    const recording = await recordSteps({ plan, paths, dirs, mode, lifecycle, status, env });
    if (mode === 'check') return { recording, dirs, status, events: [], frames: [] };
    return {
      recording,
      dirs,
      status,
      events: await readJsonLines<LoggedEvent>(join(dirs.cacheDir, EVENTS_FILE)),
      frames: await readJsonLines<FrameRecord>(join(dirs.cacheDir, FRAMES_INDEX_FILE)),
    };
  };

  return {
    record,
    fail: async (steps, options) => {
      const error = await record(steps, options).then(
        () => undefined,
        (failure: unknown) => failure,
      );
      expect(error).toBeInstanceOf(CursorCamError);
      return error as CursorCamError;
    },
    outDir: () => out.path(),
  };
}

export function eventsOf<Type extends LoggedEvent['type']>(
  events: readonly LoggedEvent[],
  type: Type,
): Extract<LoggedEvent, { type: Type }>[] {
  return events.filter(
    (event): event is Extract<LoggedEvent, { type: Type }> => event.type === type,
  );
}
