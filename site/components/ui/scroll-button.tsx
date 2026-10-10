'use client';

import { useScrollToSection } from '@/hooks/use-scroll-to-section';
import type { SectionId } from '@/lib/sections';
import { ButtonMotion } from './button-base';
import { type ButtonLookProps, buttonClass } from './button-styles';

interface ScrollButtonProps extends ButtonLookProps {
  readonly to: SectionId;
}

export function ScrollButton({ to, children, variant, size }: ScrollButtonProps) {
  const scrollToSection = useScrollToSection();
  return (
    <ButtonMotion>
      <button
        type="button"
        onClick={() => scrollToSection(to)}
        className={buttonClass(variant, size)}
      >
        {children}
      </button>
    </ButtonMotion>
  );
}
