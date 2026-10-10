import type { PaletteName, SceneName } from '@cursorcam/scenes';
import Image from 'next/image';
import Link from 'next/link';
import { backgroundUrl } from '@/lib/backgrounds';
import { BACKGROUNDS_GUIDE, guidePath } from '@/lib/doc-links';

const PICKS: readonly (readonly [SceneName, PaletteName])[] = [
  ['dunes', 'indigo'],
  ['glow', 'ocean'],
  ['shapes', 'sunset'],
  ['aurora', 'plum'],
];

export function BackgroundsCallout() {
  return (
    <Link
      href={guidePath(BACKGROUNDS_GUIDE)}
      className="group sticker-box mt-6 flex flex-col gap-4 rounded-[22px] bg-white p-2.5 focus-ring sm:flex-row sm:items-center sm:pr-6"
    >
      <span className="grid shrink-0 grid-cols-4 gap-1.5 sm:w-72">
        {PICKS.map(([scene, palette]) => (
          <Image
            key={scene}
            src={backgroundUrl(scene, palette)}
            alt=""
            width={160}
            height={90}
            unoptimized
            className="aspect-video w-full rounded-lg object-cover"
          />
        ))}
      </span>
      <span className="px-2 pb-1.5 sm:p-0">
        <span className="block font-semibold text-ink transition-colors group-hover:text-brand">
          See every scene in every palette
        </span>
        <span className="block text-[15px] text-body">Pick one and copy its style.</span>
      </span>
    </Link>
  );
}
