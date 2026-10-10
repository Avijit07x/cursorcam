import type { Point } from '@/components/mock-app/stage';

export type ReelLayout = 'desktop' | 'phone';

interface LayoutLook {
  readonly frame: string;
  readonly unit: string;
  readonly rest: Point;
}

export const LAYOUTS: Readonly<Record<ReelLayout, LayoutLook>> = {
  desktop: {
    frame: 'aspect-[1280/838] w-[min(100cqw_-_12cqmin,(100cqh_-_12cqmin)*1.5274)]',
    unit: 'inset-0 [--app-h:100cqh]',
    rest: { x: 0.46, y: 0.8 },
  },
  phone: {
    frame: 'aspect-[390/882] w-[min(100cqw_-_12cqmin,(100cqh_-_12cqmin)*0.4422)]',
    unit: 'inset-x-0 top-0 aspect-[5/6] [--app-h:180.3cqh]',
    rest: { x: 0.56, y: 1.3 },
  },
};
