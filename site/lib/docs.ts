import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

export interface Guide {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
}

export interface GuideGroup {
  readonly title: string;
  readonly guides: readonly Guide[];
}

export interface PlacedGuide extends Guide {
  readonly group: string;
}

const DOCS_DIR = path.join(process.cwd(), '..', 'docs');
const README = 'README';
const INTRO = /^# (?<title>.+)\n+(?<lede>.+)$/m;
const GROUP_HEADING = /^## (?<title>.+)$/gm;
const GUIDE_ROW = /^\| \[(?<title>[^\]]+)\]\((?<slug>[\w-]+)\.md\) \| (?<summary>[^|]+?) \|$/gm;

const readDoc = (slug: string) => readFile(path.join(DOCS_DIR, `${slug}.md`), 'utf8');

function guideOf({ groups }: RegExpMatchArray): Guide[] {
  const { title, slug, summary } = groups ?? {};
  return title && slug && summary ? [{ slug, title, summary }] : [];
}

function groupsOf(readme: string): GuideGroup[] {
  const headings = [...readme.matchAll(GROUP_HEADING)];
  return headings.flatMap((heading, index) => {
    const body = readme.slice(heading.index, headings[index + 1]?.index);
    const guides = [...body.matchAll(GUIDE_ROW)].flatMap(guideOf);
    const title = heading.groups?.title;
    return title && guides.length > 0 ? [{ title, guides }] : [];
  });
}

export const getDocsIndex = cache(async () => {
  const readme = await readDoc(README);
  const groups = groupsOf(readme);
  const intro = INTRO.exec(readme)?.groups;
  if (!intro?.title || !intro.lede || groups.length === 0) {
    throw new Error(
      'docs/README.md needs a title, an intro line and a table of guides under each group.',
    );
  }
  return { title: intro.title, lede: intro.lede, groups };
});

export const readGuide = cache(readDoc);

export const getGuides = cache(async (): Promise<readonly PlacedGuide[]> =>
  (await getDocsIndex()).groups.flatMap((group) =>
    group.guides.map((guide) => ({ ...guide, group: group.title })),
  ),
);

export const getGuide = cache(async (slug: string) =>
  (await getGuides()).find((guide) => guide.slug === slug),
);
