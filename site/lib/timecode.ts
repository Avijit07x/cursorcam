const pad = (value: number) => String(value).padStart(2, '0');

export function formatTimecode(seconds: number, fps?: number) {
  const whole = Math.floor(seconds);
  const clock = `${pad(Math.floor(whole / 3600))}:${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`;
  if (fps === undefined) return clock;
  return `${clock}:${pad(Math.floor((seconds - whole) * fps))}`;
}
