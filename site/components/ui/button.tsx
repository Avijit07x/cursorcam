'use client';

import { ButtonMotion } from './button-base';
import { type ButtonLookProps, buttonClass } from './button-styles';

interface ButtonProps extends ButtonLookProps {
  readonly onClick: () => void;
}

export function Button({ onClick, children, variant, size }: ButtonProps) {
  return (
    <ButtonMotion>
      <button type="button" onClick={onClick} className={buttonClass(variant, size)}>
        {children}
      </button>
    </ButtonMotion>
  );
}
