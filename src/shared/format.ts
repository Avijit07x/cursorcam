const BYTES_PER_GB = 1e9;
const BYTES_PER_MB = 1e6;
const BYTES_PER_KB = 1e3;
const MS_PER_SECOND = 1000;

export function formatBytes(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(1)} GB`;
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} KB`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
}
