import Link from 'next/link';
import type { ReactNode } from 'react';
import { StickerMark } from '@/components/brand/sticker-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { DOCS_HOME } from '@/lib/doc-links';
import { CONTAINER } from '@/lib/layout';
import { SITE } from '@/lib/site';
import { SiteLink } from './site-link';

const NAV = [
  { label: 'Docs', href: DOCS_HOME },
  { label: 'Changelog', href: SITE.changelog },
  { label: 'GitHub', href: SITE.repo },
] as const;

export function SiteHeader({ action }: { readonly action: ReactNode }) {
  return (
    <header
      className={`${CONTAINER} relative z-10 flex flex-wrap items-center gap-x-7 gap-y-3.5 pt-14 sm:pt-18`}
    >
      <Link
        href="/"
        aria-label={`${SITE.name} home`}
        className="group inline-flex items-center gap-2.5 rounded-2xl focus-ring"
      >
        <StickerMark className="size-11 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-rotate-8 motion-safe:transition-transform motion-safe:duration-300" />
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="hidden gap-5.5 font-semibold md:ml-auto md:flex">
        {NAV.map((item) => (
          <SiteLink
            key={item.label}
            href={item.href}
            className="rounded-md text-ink transition-colors hover:text-brand focus-ring"
          >
            {item.label}
          </SiteLink>
        ))}
      </nav>
      <div className="ml-auto md:ml-0">{action}</div>
    </header>
  );
}
