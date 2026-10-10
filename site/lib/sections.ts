export const SECTION_IDS = {
  video: 'video',
  camera: 'camera',
  stickers: 'stickers',
  setup: 'setup',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];
