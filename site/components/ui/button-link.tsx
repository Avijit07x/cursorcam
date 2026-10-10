import Link from 'next/link';
import { ButtonMotion } from './button-base';
import { type ButtonLookProps, buttonClass } from './button-styles';

interface ButtonLinkProps extends ButtonLookProps {
  readonly href: string;
}

export function ButtonLink({ href, children, variant, size }: ButtonLinkProps) {
  return (
    <ButtonMotion>
      <Link href={href} className={buttonClass(variant, size)}>
        {children}
      </Link>
    </ButtonMotion>
  );
}
