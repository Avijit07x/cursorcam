import { CheckIcon } from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { SECTION_IDS } from '@/lib/sections';
import { SetupSteps } from './setup-steps';

const NEEDS = ['Claude Code', 'Node.js 22.13+', 'Chrome, Edge, Chromium or Brave 120+'];

export function SetupSection() {
  return (
    <Section
      id={SECTION_IDS.setup}
      labelledBy="setup-title"
      className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
    >
      <div className="lg:sticky lg:top-24">
        <SectionHeading
          id="setup-title"
          kicker="Get started"
          title="Set it up in 3 steps."
          align="start"
        >
          <p>Free and open source, under Apache-2.0.</p>
        </SectionHeading>
        <ul aria-label="What you need" className="mt-6 grid gap-2.5 font-medium text-ink">
          {NEEDS.map((need) => (
            <li key={need} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="sticker-shadow grid size-6 shrink-0 place-items-center rounded-full border-2 border-white bg-mint"
              >
                <CheckIcon className="size-3" />
              </span>
              {need}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[26rem] text-[15px] text-muted">
          It uses the browser you already have and downloads nothing.
        </p>
      </div>

      <SetupSteps />
    </Section>
  );
}
