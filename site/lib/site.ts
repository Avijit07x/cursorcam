const TAGLINE = 'Ask Claude for a demo video.';
const LEDE =
  'Claude clicks through your web app and hands back a polished MP4 that zooms in on each click.';

export const SITE = {
  name: 'CursorCam',
  url: 'https://cursorcam.vercel.app',
  title: 'CursorCam: ask Claude for a demo video',
  tagline: TAGLINE,
  lede: LEDE,
  description: `${TAGLINE} ${LEDE}`,
  author: 'Avijit Dey',
  handle: '@avijit07x',
  authorUrl: 'https://github.com/avijit07x',
  repo: 'https://github.com/Avijit07x/cursorcam',
  docs: 'https://github.com/Avijit07x/cursorcam/tree/main/docs',
  changelog: 'https://github.com/Avijit07x/cursorcam/blob/main/CHANGELOG.md',
} as const;
