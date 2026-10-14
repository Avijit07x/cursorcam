import Link from 'next/link';
import type { ReactNode } from 'react';
import { isInternal } from '@/lib/doc-links';

const WEB_LINK = /^https?:/i;

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
  // App links, like Cursor's install link, open the app; a new tab would stay empty.
  if (!WEB_LINK.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
