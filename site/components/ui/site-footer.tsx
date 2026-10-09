import { GitHubMark } from '@/components/brand/github-mark';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="relative z-10 flex flex-col items-center gap-3 px-4 pt-6 pb-8 text-sm text-muted sm:flex-row sm:justify-center sm:gap-4">
      <span>
        Designed &amp; built by{' '}
        <a
          href={SITE.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          {SITE.handle}
        </a>
      </span>
      <a
        href={SITE.repo}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md transition-colors outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-soft"
      >
        <GitHubMark className="size-4" />
        Follow on GitHub
      </a>
    </footer>
  );
}
