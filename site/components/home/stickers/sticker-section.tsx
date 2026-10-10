import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { SECTION_IDS } from '@/lib/sections';
import { StickerBoard } from './sticker-board';

export function StickerSection() {
  return (
    <Section id={SECTION_IDS.stickers} labelledBy="stickers-title">
      <SectionHeading
        id="stickers-title"
        kicker="Peel & stick"
        title="Each sticker is something CursorCam does."
      >
        <p>Drag one onto the little app and watch it play. Or just tap it.</p>
      </SectionHeading>
      <StickerBoard />
    </Section>
  );
}
