import { useEffect, useRef, useState } from 'react';
import { useAutoplay } from '@/hooks/use-autoplay';
import { formatTimecode } from '@/lib/timecode';

export function useDemoVideo(fps: number) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const { active, toggle, refuse } = useAutoplay(videoRef);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(refuse);
    else video.pause();
  }, [active, refuse]);

  useEffect(() => {
    const video = videoRef.current;
    const label = timeRef.current;
    if (!video || !label) return;
    let frame = 0;
    const show = () => {
      label.textContent = formatTimecode(video.currentTime, fps);
    };
    const tick = () => {
      show();
      frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(frame);
      tick();
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      show();
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', show);
    if (video.paused) show();
    else frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', show);
    };
  }, [fps]);

  return { videoRef, timeRef, playing, toggle };
}
