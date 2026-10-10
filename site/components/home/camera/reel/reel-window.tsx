import type { ReactNode } from 'react';
import { WINDOW_DOTS } from '@/components/ui/browser-window';
import { MOCK_APP } from '@/lib/mock-app';

interface ReelWindowProps {
  readonly className: string;
  readonly children: ReactNode;
}

export function ReelWindow({ className, children }: ReelWindowProps) {
  return (
    <div
      className={`absolute top-1/2 left-1/2 flex -translate-1/2 flex-col overflow-hidden rounded-[1.3cqmin] bg-white shadow-[0_1.2cqmin_3.2cqmin_-0.8cqmin_rgb(15_23_42/0.5)] @container-size ${className}`}
    >
      <div className="flex h-[4.5cqh] shrink-0 items-center gap-[0.9cqh] bg-[#f4f3ff] px-[1.6cqh]">
        {WINDOW_DOTS.map((color) => (
          <span
            key={color}
            className="size-[1.2cqh] shrink-0 rounded-full"
            style={{ background: color }}
          />
        ))}
        <span className="mx-auto w-[46%] truncate rounded-full bg-white text-center text-[1.6cqh] leading-[2.6cqh] text-muted">
          {MOCK_APP.address}
        </span>
        <span className="w-[3.6cqh] shrink-0" />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
