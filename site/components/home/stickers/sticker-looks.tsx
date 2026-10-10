import type { ReactNode } from 'react';
import { BuddyCursorArt } from '@/components/brand/sticker-art';
import { AddressArt, FastForwardArt, HideArt, LockArt, MagnifierArt, MoonArt } from './art';
import type { Sticker, StickerKey } from './sticker-data';

interface StickerLook {
  readonly shape: string;
  readonly color: string;
  readonly art: ReactNode;
  readonly text?: ReactNode;
}

const PILL = 'h-13.5 flex-row gap-2 rounded-full pr-4.5 pl-3.5';
const ROUND = 'size-19.5 rounded-full';
const PILL_ART = 'size-5.5 shrink-0';

export const STICKER_BASE =
  'relative flex-col items-center justify-center gap-0.5 p-0 text-center text-sm leading-[1.1] font-semibold select-none *:pointer-events-none';
export const STICKER_EDGE = 'border-[3.5px] border-white';

const LOOKS: Record<StickerKey, StickerLook> = {
  zoom: {
    shape: 'size-22 rounded-full',
    color: 'bg-[#FCD34D] text-ink',
    art: <MagnifierArt plus className="size-8 shrink-0" />,
  },
  cursor: {
    shape: 'h-19 w-25 rounded-[22px]',
    color: 'bg-brand-tint text-ink',
    art: (
      <span className="size-8.5 shrink-0">
        <BuddyCursorArt />
      </span>
    ),
  },
  logins: {
    shape: PILL,
    color: 'bg-brand text-white',
    art: <LockArt className={PILL_ART} color="#fff" keyhole="#4F46E5" />,
  },
  hide: {
    shape: ROUND,
    color: 'bg-rose text-ink',
    art: <HideArt className="size-7.5 shrink-0" />,
  },
  twofa: {
    shape: ROUND,
    color: 'bg-[#38BDF8] text-ink',
    art: <b className="text-[22px] leading-none">2FA</b>,
    text: <small className="text-[11px] font-medium opacity-80">code</small>,
  },
  dark: {
    shape: 'size-19 rounded-[18px]',
    color: 'bg-ink text-white',
    art: <MoonArt className="size-7 shrink-0" />,
    text: <small className="text-xs font-medium">Dark</small>,
  },
  url: {
    shape: PILL,
    color: 'bg-mint text-ink',
    art: <AddressArt className={PILL_ART} />,
  },
  ff: {
    shape: PILL,
    color: 'bg-brand-soft text-ink',
    art: <FastForwardArt className={PILL_ART} color="#4F46E5" />,
  },
};

export const lookOf = (sticker: Sticker) => LOOKS[sticker.key];

export function StickerFace({ sticker }: { readonly sticker: Sticker }) {
  const look = lookOf(sticker);
  return (
    <>
      {look.art}
      {look.text ?? <span>{sticker.name}</span>}
    </>
  );
}
