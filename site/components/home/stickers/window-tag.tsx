'use client';

import { useAnimate } from 'motion/react';
import { useEffect, useRef } from 'react';
import { POP } from '@/lib/motion';
import type { WindowTagInfo } from './sticker-data';

const POP_FROM = 0.7;

export function WindowTag({ tag }: { readonly tag: WindowTagInfo }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const shown = useRef(tag.label);

  useEffect(() => {
    if (shown.current === tag.label || !scope.current) return;
    shown.current = tag.label;
    animate(scope.current, { scale: [POP_FROM, 1] }, POP);
  }, [tag.label, animate, scope]);

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="sticker-shadow absolute bottom-0 left-1/2 z-3 flex -translate-x-1/2 translate-y-[55%] items-center gap-1.5 rounded-full bg-white py-1 pr-1.25 pl-3 text-xs leading-[1.3] font-semibold whitespace-nowrap text-ink ring-1 ring-ink/10 max-[400px]:gap-1 max-[400px]:py-0.75 max-[400px]:pr-1 max-[400px]:pl-2.5 max-[400px]:text-[11px]"
    >
      {tag.label}
      {tag.chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-brand-tint px-2.25 py-0.5 text-brand-strong max-[400px]:px-1.75"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
