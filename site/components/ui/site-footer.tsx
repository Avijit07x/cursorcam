import type { ReactNode } from 'react';
import { GitHubMark } from '@/components/brand/github-mark';
import { DOCS_HOME } from '@/lib/doc-links';
import { SITE } from '@/lib/site';
import { SiteLink } from './site-link';
import { TextLink } from './text-link';

const LINKS = [
  { label: 'Docs', href: DOCS_HOME },
  { label: 'Changelog', href: SITE.changelog },
  { label: 'npm', href: SITE.npm },
  { label: 'Report an issue', href: SITE.issues },
  { label: 'License', href: SITE.license },
] as const;

interface SiteFooterProps {
  readonly children?: ReactNode;
  readonly links?: boolean;
}

export function SiteFooter({ children, links = true }: SiteFooterProps) {
  return (
    <footer className="relative z-10 grid justify-items-center gap-14 px-4 pt-6 pb-8 text-sm text-muted">
      {children}
      <div className="grid justify-items-center gap-5">
        {links ? (
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-semibold"
          >
            {LINKS.map((link) => (
              <SiteLink
                key={link.label}
                href={link.href}
                className="rounded-md text-ink transition-colors hover:text-brand focus-ring"
              >
                {link.label}
              </SiteLink>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <span>
            Designed &amp; built by <TextLink href={SITE.authorUrl}>{SITE.handle}</TextLink>
          </span>
          <a
            href={SITE.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md transition-colors focus-ring hover:text-ink"
          >
            <GitHubMark className="size-4" />
            Follow on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
