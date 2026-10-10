import type { Metadata } from 'next';
import Link from 'next/link';
import { PAGE_TITLE, SECTION_TITLE } from '@/components/docs/styles';
import { SetupSteps } from '@/components/home/setup/setup-steps';
import { SparkleLabel } from '@/components/ui/sparkle-label';
import { guidePath } from '@/lib/doc-links';
import { type Guide, getDocsIndex } from '@/lib/docs';

export async function generateMetadata(): Promise<Metadata> {
  const { title, lede } = await getDocsIndex();
  return { title, description: lede };
}

const TILTS = [-0.8, 0.6, 0.5, -0.6];

function GuideCard({ guide, number }: { readonly guide: Guide; readonly number: number }) {
  return (
    <li>
      <Link
        href={guidePath(guide.slug)}
        className="group sticker-shadow flex h-full gap-4 rounded-[24px] bg-white p-5 focus-ring"
        style={{ rotate: `${TILTS[number % TILTS.length]}deg` }}
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint font-bold text-brand"
        >
          {number}
        </span>
        <span>
          <span className="block text-lg leading-snug font-semibold text-ink transition-colors group-hover:text-brand">
            {guide.title}
          </span>
          <span className="mt-1 block text-[15px] text-body">{guide.summary}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function DocsPage() {
  const { title, lede, groups } = await getDocsIndex();
  const firsts = groups.map((_, index) =>
    groups.slice(0, index).reduce((count, group) => count + group.guides.length, 1),
  );
  return (
    <>
      <p className="text-base sm:text-lg">
        <SparkleLabel>Docs</SparkleLabel>
      </p>
      <h1 className={`${PAGE_TITLE} mt-3`}>{title}</h1>
      <p className="mt-4 max-w-2xl text-[clamp(1rem,0.95rem+0.3vw,1.125rem)] text-body">{lede}</p>
      {groups.map((group, index) => (
        <section key={group.title} aria-labelledby={`group-${index}`} className="mt-14">
          <h2 id={`group-${index}`} className={SECTION_TITLE}>
            {group.title}
          </h2>
          {index === 0 ? (
            <div className="mt-4">
              <SetupSteps />
            </div>
          ) : null}
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {group.guides.map((guide, at) => (
              <GuideCard key={guide.slug} guide={guide} number={(firsts[index] ?? 1) + at} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
