import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PROC_DIR = '/proc';
const PID_PATTERN = /^\d+$/;
const CORE_LIMIT_PATTERN = /^Max core file size\s+(\S+)/m;
const UNLIMITED = 'unlimited';

async function readProcFile(pid: string, file: string): Promise<string | undefined> {
  return readFile(join(PROC_DIR, pid, file), 'utf8').catch(() => undefined);
}

async function coreLimitOf(pid: string, marker: string): Promise<number | undefined> {
  const cmdline = await readProcFile(pid, 'cmdline');
  if (!cmdline?.includes(marker)) return undefined;
  const limit = CORE_LIMIT_PATTERN.exec((await readProcFile(pid, 'limits')) ?? '')?.[1];
  if (limit === undefined) return undefined;
  return limit === UNLIMITED ? Number.POSITIVE_INFINITY : Number(limit);
}

export async function coreLimitsOfProcessesWith(marker: string): Promise<number[]> {
  const pids = (await readdir(PROC_DIR)).filter((name) => PID_PATTERN.test(name));
  const limits = await Promise.all(pids.map((pid) => coreLimitOf(pid, marker)));
  return limits.filter((limit): limit is number => limit !== undefined);
}
