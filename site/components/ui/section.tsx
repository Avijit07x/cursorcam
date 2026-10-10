import type { ReactNode } from 'react';
import { CONTAINER } from '@/lib/layout';
import type { SectionId } from '@/lib/sections';

interface SectionProps {
  readonly id: SectionId;
  readonly labelledBy: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Section({ id, labelledBy, className = '', children }: SectionProps) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={labelledBy}
      className={`${CONTAINER} scroll-mt-6 py-16 outline-none sm:py-20 ${className}`}
    >
      {children}
    </section>
  );
}
