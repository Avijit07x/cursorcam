import { SITE } from './site';

const GUIDE_LINK = /^(?<slug>[\w-]+)\.md(?<hash>#[\w-]+)?$/;
const EXTERNAL = /^[a-z][a-z+.-]*:/i;

export const DOCS_HOME = '/docs';
export const INSTALL_GUIDE = 'getting-started';

export const guidePath = (slug: string) => `${DOCS_HOME}/${slug}`;

export const docsTitle = (title: string) => `${title} · ${SITE.name} docs`;

export const isInternal = (href: string) => href.startsWith('/');

export function docHref(href: string): string {
  if (EXTERNAL.test(href)) return href;
  const guide = GUIDE_LINK.exec(href)?.groups;
  if (guide?.slug) return `${guidePath(guide.slug)}${guide.hash ?? ''}`;
  return new URL(href, `${SITE.docs}/`).href;
}
