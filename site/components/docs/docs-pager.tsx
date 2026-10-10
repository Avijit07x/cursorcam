import Link from 'next/link';
import { guidePath } from '@/lib/doc-links';
import { type Guide, getGuides } from '@/lib/docs';

const SIDES = {
  back: { label: 'Back', align: 'text-left' },
  next: { label: 'Next', align: 'text-right sm:col-start-2' },
} as const;

function PagerLink({ guide, side }: { readonly guide: Guide; readonly side: keyof typeof SIDES }) {
  const { label, align } = SIDES[side];
  return (
    <Link
      href={guidePath(guide.slug)}
      className={`group sticker-shadow rounded-2xl bg-white px-5 py-4 focus-ring ${align}`}
    >
      <span className="block text-sm font-medium text-muted">{label}</span>
      <span className="block font-semibold text-ink transition-colors group-hover:text-brand">
        {guide.title}
      </span>
    </Link>
  );
}

export async function DocsPager({ slug }: { readonly slug: string }) {
  const guides = await getGuides();
  const at = guides.findIndex((guide) => guide.slug === slug);
  const back = at > 0 ? guides[at - 1] : undefined;
  const next = at >= 0 ? guides[at + 1] : undefined;
  return (
    <nav aria-label="More guides" className="mt-16 grid gap-4 sm:grid-cols-2">
      {back ? <PagerLink guide={back} side="back" /> : null}
      {next ? <PagerLink guide={next} side="next" /> : null}
    </nav>
  );
}
