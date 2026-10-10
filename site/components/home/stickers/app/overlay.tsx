import type { ReactNode } from 'react';
import { part, type Part } from '@/components/mock-app/stage';
import { LockArt } from '../art';

const BRAND = '#4F46E5';

interface PartProps {
  readonly name: Part;
  readonly children: ReactNode;
}

export function Overlay({ name, children }: PartProps) {
  return (
    <div {...part(name)} className="absolute inset-0 grid place-items-center bg-page/72 opacity-0">
      {children}
    </div>
  );
}

export function OverlayTitle({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex items-center gap-[1.6cqh] text-[5.4cqh] leading-[1.2] font-semibold text-ink">
      <LockArt className="size-[5cqh]" color={BRAND} />
      {children}
    </div>
  );
}

export function OverlayButton({ name, children }: PartProps) {
  return (
    <div
      {...part(name)}
      className="mt-[3.6cqh] grid h-[8.4cqh] place-items-center rounded-full bg-brand text-[4cqh] font-semibold text-white"
    >
      {children}
    </div>
  );
}
