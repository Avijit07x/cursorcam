import type { ReactNode } from 'react';

export function StickerTag({ children }: { readonly children: ReactNode }) {
  return (
    <span className="sticker-shadow inline-flex -rotate-4 items-center gap-1.5 rounded-[14px] border-3 border-white bg-brand px-3 py-0.5 text-sm font-bold tracking-wide text-white motion-safe:animate-wiggle">
      {children}
    </span>
  );
}
