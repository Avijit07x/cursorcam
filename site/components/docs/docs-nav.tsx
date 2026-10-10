'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_HOME, guidePath } from '@/lib/doc-links';
import type { GuideGroup } from '@/lib/docs';

interface NavItem {
  readonly href: string;
  readonly title: string;
}

interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const OVERVIEW: NavItem = { href: DOCS_HOME, title: 'Overview' };
const ITEM = 'block rounded-full px-4 py-2 font-semibold transition-colors focus-ring';
const ACTIVE = 'bg-brand text-white';
const IDLE = 'text-body hover:bg-brand-tint hover:text-ink';

function navGroups(groups: readonly GuideGroup[]): NavGroup[] {
  return groups.map((group, index) => {
    const items = group.guides.map(({ slug, title }) => ({ href: guidePath(slug), title }));
    return { title: group.title, items: index === 0 ? [OVERVIEW, ...items] : items };
  });
}

function NavGroups({
  groups,
  current,
}: {
  readonly groups: readonly NavGroup[];
  readonly current: string;
}) {
  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-4 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            {group.title}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${ITEM} ${active ? ACTIVE : IDLE}`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function DocsNav({ groups }: { readonly groups: readonly GuideGroup[] }) {
  const pathname = usePathname();
  const nav = navGroups(groups);
  const page = nav.flatMap((group) => group.items).find((item) => item.href === pathname);
  const list = <NavGroups groups={nav} current={pathname} />;
  return (
    <nav aria-label="Docs" className="lg:sticky lg:top-24 lg:self-start">
      <details key={pathname} className="group sticker-box rounded-[22px] bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[22px] px-5 py-3.5 font-semibold text-ink focus-ring [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted">Docs: </span>
            {(page ?? OVERVIEW).title}
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4 text-brand transition-transform group-open:rotate-180"
          >
            <path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="px-2 pt-1 pb-3">{list}</div>
      </details>
      <div className="hidden lg:block">{list}</div>
    </nav>
  );
}
