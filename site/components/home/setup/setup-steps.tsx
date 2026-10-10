import { SparkleArt } from '@/components/brand/sticker-art';
import { CommandPill } from '@/components/ui/command-pill';
import { EXAMPLE_REQUEST, EXAMPLE_WORDS, INSTALL_COMMANDS } from '@/lib/commands';
import { DoneMessage } from './done-message';
import { SetupStep } from './setup-step';

export function SetupSteps() {
  return (
    <ol className="grid gap-12 pt-6">
      <SetupStep
        number={1}
        color="brand"
        tilt={-0.8}
        turn={-8}
        title="Install the plugin in Claude Code"
      >
        <div className="grid justify-items-start gap-2">
          {INSTALL_COMMANDS.map((command) => (
            <CommandPill key={command} text={command} />
          ))}
        </div>
      </SetupStep>
      <SetupStep number={2} color="rose" tilt={0.6} turn={6} title="Ask for a video">
        <div className="grid justify-items-start gap-2">
          <CommandPill text={EXAMPLE_REQUEST} />
          <p className="mt-0.5 ml-1 text-sm text-muted">or in your own words:</p>
          <CommandPill text={EXAMPLE_WORDS} words />
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span className="size-5 shrink-0">
            <SparkleArt />
          </span>
          Say the page, the flow, the length, where it goes and what to hide.
        </p>
      </SetupStep>
      <SetupStep number={3} color="mint" tilt={-0.4} turn={-4} title="Get the video">
        <DoneMessage />
      </SetupStep>
    </ol>
  );
}
