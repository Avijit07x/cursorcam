import type { ReactNode } from 'react';
import { GitHubMark } from '@/components/brand/github-mark';
import { SITE } from '@/lib/site';
import { TextLink } from './text-link';

export function SiteFooter({ children }: { readonly children?: ReactNode }) {
  return (
    <footer className="relative z-10 grid justify-items-center gap-14 px-4 pt-6 pb-8 text-sm text-muted">
      {children}
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
    </footer>
  );
}
