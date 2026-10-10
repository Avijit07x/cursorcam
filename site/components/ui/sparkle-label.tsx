import type { ReactNode } from 'react';

const SPARKLE_PATH =
  'M12 1c.8 6.4 4.6 10.2 11 11-6.4.8-10.2 4.6-11 11-.8-6.4-4.6-10.2-11-11 6.4-.8 10.2-4.6 11-11Z';
const SECOND_SPARKLE_DELAY = '0.9s';

function Sparkle({ delay }: { readonly delay?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-3.5 shrink-0 motion-safe:animate-twinkle"
      style={delay ? { animationDelay: delay } : undefined}
    >
      <path d={SPARKLE_PATH} fill="currentColor" />
    </svg>
  );
}

export function SparkleLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-brand">
      <Sparkle />
      {children}
      <Sparkle delay={SECOND_SPARKLE_DELAY} />
    </span>
  );
}
