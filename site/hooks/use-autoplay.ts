import { useInView, useReducedMotion } from 'motion/react';
import { type RefObject, useCallback, useState } from 'react';

const IN_VIEW_AMOUNT = 0.3;

export function useAutoplay(ref: RefObject<Element | null>) {
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { amount: IN_VIEW_AMOUNT });
  const [choice, setChoice] = useState<boolean | null>(null);
  const wanted = choice ?? !reduceMotion;
  const toggle = useCallback(() => setChoice(!wanted), [wanted]);
  const refuse = useCallback(() => setChoice(false), []);
  return { active: inView && wanted, toggle, refuse };
}
