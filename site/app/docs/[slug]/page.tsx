import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsPager } from '@/components/docs/docs-pager';
import { Markdown } from '@/components/docs/markdown';
import { SparkleLabel } from '@/components/ui/sparkle-label';
import { docsTitle } from '@/lib/doc-links';
import { getGuide, getGuides, readGuide } from '@/lib/docs';

interface GuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getGuides()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const guide = await getGuide((await params).slug);
  return guide ? { title: docsTitle(guide.title), description: guide.summary } : {};
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();
  return (
    <article>
      <p className="mb-3 text-base sm:text-lg">
        <SparkleLabel>{guide.group}</SparkleLabel>
      </p>
      <Markdown source={await readGuide(slug)} />
      <DocsPager slug={slug} />
    </article>
  );
}
