import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { SCENES, type SceneName } from '@cursorcam/scenes';
import { BACKGROUNDS_GUIDE } from './doc-links';

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

export interface SceneLook {
  readonly name: SceneName;
  readonly look: string;
}

const DOCS_DIR = path.join(process.cwd(), '..', 'docs');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const README = 'README';
const STYLE_GUIDE = 'style';
const INTRO = /^# (?<title>.+)\n+(?<lede>.+)$/m;
const GROUP_HEADING = /^## (?<title>.+)$/gm;
const GUIDE_ROW = /^\| \[(?<title>[^\]]+)\]\((?<slug>[\w-]+)\.md\) \| (?<summary>[^|]+?) \|$/gm;
const SCENE_ROW = /^\| `(?<name>[a-z]+)` \| (?<look>[^|]+?) \|$/gm;
const HEADING_LINE = /^#{1,6} /m;

const BACKGROUNDS: Guide = {
  slug: BACKGROUNDS_GUIDE,
  title: 'Backgrounds',
  summary: 'Every scene in every palette, and how to use them',
};

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

export const readGuide = cache((slug: string) =>
  slug === BACKGROUNDS_GUIDE
    ? readFile(path.join(CONTENT_DIR, `${slug}.md`), 'utf8')
    : readDoc(slug),
);

function withBackgrounds(guides: readonly Guide[]): readonly Guide[] {
  const at = guides.findIndex((guide) => guide.slug === STYLE_GUIDE);
  return guides.toSpliced(at < 0 ? guides.length : at + 1, 0, BACKGROUNDS);
}

export const getDocsNav = cache(async (): Promise<readonly GuideGroup[]> => {
  const { groups } = await getDocsIndex();
  const found = groups.findIndex((group) =>
    group.guides.some((guide) => guide.slug === STYLE_GUIDE),
  );
  const home = found < 0 ? groups.length - 1 : found;
  return groups.map((group, index) =>
    index === home ? { ...group, guides: withBackgrounds(group.guides) } : group,
  );
});

export const getGuides = cache(async (): Promise<readonly PlacedGuide[]> =>
  (await getDocsNav()).flatMap((group) =>
    group.guides.map((guide) => ({ ...guide, group: group.title })),
  ),
);

export const getGuide = cache(async (slug: string) =>
  (await getGuides()).find((guide) => guide.slug === slug),
);

export const getSceneLooks = cache(async (): Promise<readonly SceneLook[]> => {
  const rows = (await readDoc(STYLE_GUIDE)).matchAll(SCENE_ROW);
  const looks = new Map([...rows].map(({ groups }) => [groups?.name, groups?.look]));
  return SCENES.map((name) => {
    const look = looks.get(name);
    if (!look) throw new Error(`docs/style.md has no row for the ${name} scene.`);
    return { name, look };
  });
});

export function splitAfterSection(source: string, heading: string): readonly [string, string] {
  const start = source.indexOf(`\n${heading}\n`);
  if (start < 0) return [source, ''];
  const body = start + heading.length + 2;
  const next = source.slice(body).search(HEADING_LINE);
  const at = next < 0 ? source.length : body + next;
  return [source.slice(0, at), source.slice(at)];
}
