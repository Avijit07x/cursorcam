import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'browser',
    background_color: '#faf9ff',
    theme_color: '#faf9ff',
    icons: [{ src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' }],
  };
}
