import type { ReactNode } from 'react';

export const WINDOW_DOTS = ['#FCA5A5', '#FCD34D', '#86EFAC'];

export const WINDOW_FRAME = 'sticker-box rounded-[1.75rem] bg-white p-1.5';
export const ADDRESS_PILL =
  'mx-auto min-w-0 truncate rounded-full bg-white px-3 py-0.5 text-[11px] text-muted';

interface BrowserWindowProps {
  readonly address: ReactNode;
  readonly children: ReactNode;
}

export function BrowserWindow({ address, children }: BrowserWindowProps) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] ring-1 ring-ink/10">
      <div className="flex h-9 items-center gap-1.5 bg-[#f4f3ff] px-3.5">
        {WINDOW_DOTS.map((color) => (
          <span
            key={color}
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
        ))}
        {address}
        <span className="w-10 shrink-0" />
      </div>
      {children}
    </div>
  );
}
