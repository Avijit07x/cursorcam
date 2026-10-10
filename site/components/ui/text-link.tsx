import type { ReactNode } from 'react';
import { SiteLink } from './site-link';

interface TextLinkProps {
  readonly href: string;
  readonly children: ReactNode;
}

export function TextLink({ href, children }: TextLinkProps) {
  return (
    <SiteLink
      href={href}
      className="rounded-md font-semibold text-brand underline-offset-4 hover:underline focus-ring"
    >
      {children}
    </SiteLink>
  );
}
