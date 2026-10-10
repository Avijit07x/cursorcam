'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { POP } from '@/lib/motion';
import { CheckIcon, CopyIcon } from './icons';

type CopyState = 'idle' | 'copied' | 'failed';

const RESET_MS = 1800;
const TIP: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'Copied',
  failed: 'Select it to copy',
};

interface CopyButtonProps {
  readonly text: string;
  readonly label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = 'failed';
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), RESET_MS);
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={copy}
        aria-label={label}
        className="relative grid size-8.5 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-brand focus-ring"
        whileHover={{ rotate: -8, scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        transition={POP}
      >
        {state === 'copied' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        <AnimatePresence>
          {state === 'idle' ? null : (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -right-0.5 bottom-[calc(100%+8px)] origin-[80%_100%] rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white"
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={POP}
            >
              {TIP[state]}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className="sr-only" role="status">
        {state === 'idle' ? '' : TIP[state]}
      </span>
    </>
  );
}
