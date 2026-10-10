import { useReducedMotion } from 'motion/react';
import { useCallback } from 'react';

export function useScrollIntoView() {
  const reduceMotion = useReducedMotion();
  return useCallback(
    (element: Element | null, block: ScrollLogicalPosition = 'start') => {
      element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block });
    },
    [reduceMotion],
  );
}
