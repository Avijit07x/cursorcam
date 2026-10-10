import Link from 'next/link';
import type { ReactNode } from 'react';
import { isInternal } from '@/lib/doc-links';

interface SiteLinkProps {
  readonly href: string;
  readonly className: string;
  readonly children: ReactNode;
}

export function SiteLink({ href, className, children }: SiteLinkProps) {
  if (isInternal(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
