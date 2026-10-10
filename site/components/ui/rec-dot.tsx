interface RecDotProps {
  readonly className: string;
  readonly paused?: boolean;
}

export function RecDot({ className, paused = false }: RecDotProps) {
  const state = paused ? 'opacity-35' : 'motion-safe:animate-blink';
  return <span aria-hidden="true" className={`rounded-full bg-rec ${state} ${className}`} />;
}
