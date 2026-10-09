import { mkdir, statfs } from 'node:fs/promises';

export async function freeBytes(dir: string): Promise<number> {
  await mkdir(dir, { recursive: true });
  const stats = await statfs(dir);
  return stats.bavail * stats.bsize;
}
