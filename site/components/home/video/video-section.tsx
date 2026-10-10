import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { SECTION_IDS } from '@/lib/sections';
import { DemoPlayer } from './demo-player';

export function VideoSection() {
  return (
    <Section id={SECTION_IDS.video} labelledBy="video-title">
      <SectionHeading id="video-title" kicker="Watch the demo" title="One ask. One finished video.">
        <p>The zoom, the smooth cursor and the click ripples all come from CursorCam.</p>
      </SectionHeading>
      <DemoPlayer />
    </Section>
  );
}
