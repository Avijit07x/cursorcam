import { useCallback, useEffect, useRef } from 'react';
import { formatTimecode } from '@/lib/timecode';

const MS = 1000;

export function useReelClock(running: boolean, fps: number) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const restart = useCallback(() => {
    elapsed.current = 0;
  }, []);

  useEffect(() => {
    const label = timeRef.current;
    if (!label) return;
    const show = () => {
      label.textContent = formatTimecode(elapsed.current / MS, fps);
    };
    show();
    if (!running) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      elapsed.current += Math.max(0, now - last);
      last = now;
      show();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, fps]);

  return { timeRef, restart };
}
