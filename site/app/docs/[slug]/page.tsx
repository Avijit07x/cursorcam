import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AllScenes } from '@/components/docs/backgrounds/all-scenes';
import { BackgroundsCallout } from '@/components/docs/backgrounds/backgrounds-callout';
import { DocsPager } from '@/components/docs/docs-pager';
import { Markdown } from '@/components/docs/markdown';
import { SparkleLabel } from '@/components/ui/sparkle-label';
import { BACKGROUNDS_GUIDE, docsTitle } from '@/lib/doc-links';
import { getGuide, getGuides, readGuide, splitAfterSection } from '@/lib/docs';

interface Insert {
  readonly after: string;
  readonly node: ReactNode;
}

interface GuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

const INSERTS: Readonly<Record<string, Insert>> = {
  style: { after: '#### Scenes', node: <BackgroundsCallout /> },
  [BACKGROUNDS_GUIDE]: { after: '## Every scene', node: <AllScenes /> },
};

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
  const source = await readGuide(slug);
  const insert = INSERTS[slug];
  const [before, after] = insert ? splitAfterSection(source, insert.after) : [source, ''];
  return (
    <article>
      <p className="mb-3 text-base sm:text-lg">
        <SparkleLabel>{guide.group}</SparkleLabel>
      </p>
      <Markdown source={before} />
      {insert?.node}
      {after ? <Markdown source={after} /> : null}
      <DocsPager slug={slug} />
    </article>
  );
}
