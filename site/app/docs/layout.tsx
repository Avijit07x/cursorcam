import type { ReactNode } from 'react';
import { DocsNav } from '@/components/docs/docs-nav';
import { Backdrop } from '@/components/ui/backdrop';
import { ButtonLink } from '@/components/ui/button-link';
import { SiteFooter } from '@/components/ui/site-footer';
import { SiteHeader } from '@/components/ui/site-header';
import { guidePath, INSTALL_GUIDE } from '@/lib/doc-links';
import { getDocsNav } from '@/lib/docs';
import { CONTAINER } from '@/lib/layout';

export default async function DocsLayout({ children }: { readonly children: ReactNode }) {
  const groups = await getDocsNav();
  return (
    <div className="relative isolate overflow-x-clip">
      <Backdrop />
      <SiteHeader
        action={
          <ButtonLink href={guidePath(INSTALL_GUIDE)} size="sm">
            Install
          </ButtonLink>
        }
      />
      <div
        className={`${CONTAINER} relative z-10 grid gap-8 pt-10 pb-20 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14 lg:pt-14`}
      >
        <DocsNav groups={groups} />
        <main className="min-w-0">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
