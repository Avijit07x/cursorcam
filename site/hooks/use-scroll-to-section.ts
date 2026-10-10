import { useCallback } from 'react';
import type { SectionId } from '@/lib/sections';
import { useScrollIntoView } from './use-scroll-into-view';

export function useScrollToSection() {
  const scrollIntoView = useScrollIntoView();
  return useCallback(
    (id: SectionId) => {
      const section = document.getElementById(id);
      if (!section) return;
      scrollIntoView(section);
      section.focus({ preventScroll: true });
    },
    [scrollIntoView],
  );
}
