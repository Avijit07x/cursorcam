import { Backdrop } from '@/components/ui/backdrop';
import { ScrollButton } from '@/components/ui/scroll-button';
import { SiteFooter } from '@/components/ui/site-footer';
import { SiteHeader } from '@/components/ui/site-header';
import { SECTION_IDS } from '@/lib/sections';
import { CameraSection } from './camera/camera-section';
import { Hero } from './hero';
import { SetupSection } from './setup/setup-section';
import { StickerSection } from './stickers/sticker-section';
import { VideoSection } from './video/video-section';
import { WrapUp } from './wrap/wrap-up';

export function HomePage() {
  return (
    <div className="relative isolate overflow-x-clip">
      <Backdrop />
      <SiteHeader
        action={
          <ScrollButton to={SECTION_IDS.setup} size="sm">
            Install
          </ScrollButton>
        }
      />
      <main>
        <Hero />
        <VideoSection />
        <CameraSection />
        <StickerSection />
        <SetupSection />
      </main>
      <SiteFooter>
        <WrapUp />
      </SiteFooter>
    </div>
  );
}
