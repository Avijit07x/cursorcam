import { BuddyCursorArt } from '@/components/brand/sticker-art';
import { StickerMark } from '@/components/brand/sticker-mark';
import { Backdrop } from '@/components/ui/backdrop';
import { ButtonLink } from '@/components/ui/button-link';

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <Backdrop />
      <StickerMark className="size-28 sm:size-32" />
      <h1 className="sticker-text relative mt-6 text-6xl font-bold text-ink sm:text-7xl">
        oops!
        <span
          aria-hidden="true"
          className="sticker-shadow absolute -top-3 -right-11 size-10 rotate-12 motion-safe:animate-bob sm:-right-13 sm:size-12"
        >
          <BuddyCursorArt />
        </span>
      </h1>
      <p className="mt-4 text-lg text-body">Buddy looked everywhere. This page is out of frame.</p>
      <div className="mt-8">
        <ButtonLink href="/">Back to the home page</ButtonLink>
      </div>
    </main>
  );
}
