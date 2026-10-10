'use client';

import { motion } from 'motion/react';
import { part } from '@/components/mock-app/stage';
import { CARD_SHADOW } from '@/components/mock-app/styles';

export function WaitCard() {
  return (
    <div
      {...part('wait')}
      className={`absolute top-[56%] left-1/2 flex w-[min(76cqh,86cqw)] -translate-1/2 items-center gap-[3cqh] rounded-[4.4cqh] bg-white px-[4.4cqh] py-[3.6cqh] opacity-0 ${CARD_SHADOW}`}
    >
      <span
        {...part('spinner')}
        className="size-[8cqh] shrink-0 rounded-full border-[1.6cqh] border-brand-tint border-t-brand"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[4cqh] leading-[1.2] font-semibold whitespace-nowrap text-ink">
          Saving the issue…
        </div>
        <div className="mt-[1.6cqh] h-[2.2cqh] overflow-hidden rounded-full bg-brand-tint">
          <motion.div
            {...part('wait-bar')}
            className="size-full origin-left rounded-[inherit] bg-brand"
            style={{ scaleX: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
