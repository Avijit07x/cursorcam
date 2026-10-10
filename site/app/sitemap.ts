import type { MetadataRoute } from 'next';
import { DOCS_HOME, guidePath } from '@/lib/doc-links';
import { getGuides } from '@/lib/docs';
import { SITE } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getGuides();
  const paths = ['', DOCS_HOME, ...guides.map(({ slug }) => guidePath(slug))];
  return paths.map((path) => ({ url: `${SITE.url}${path}` }));
}
