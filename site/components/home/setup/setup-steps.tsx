import { CameraArt, ClapperArt, LightArt, PhotoArt, PlayArt } from '@/components/brand/sticker-art';
import { CommandPill } from '@/components/ui/command-pill';
import { TextLink } from '@/components/ui/text-link';
import { MCP_COMMAND, SHORT_REQUEST } from '@/lib/commands';
import { guidePath } from '@/lib/doc-links';
import { SetupStep } from './setup-step';

const NOTE = 'ml-1 text-sm text-muted';
const FILES = [
  { name: 'video.mp4', detail: '1080p, 60 fps', Art: PlayArt },
  { name: 'poster.jpg', detail: 'a thumbnail', Art: PhotoArt },
] as const;

// Each step holds one pill and one short line, so the three cards stay even.
export function SetupSteps() {
  return (
    <ol className="grid gap-12 pt-6">
      <SetupStep
        number={1}
        scene="lights"
        cue="Lights."
        title="Add it to your AI agent"
        art={<LightArt />}
        tilt={-0.8}
        turn={-8}
      >
        <CommandPill text={MCP_COMMAND} />
        <p className={NOTE}>
          Any MCP app. <TextLink href={guidePath('agents')}>Pick your agent →</TextLink>
        </p>
      </SetupStep>
      <SetupStep
        number={2}
        scene="camera"
        cue="Camera."
        title="Ask for a video"
        art={<CameraArt />}
        tilt={0.6}
        turn={6}
      >
        <CommandPill text={SHORT_REQUEST} words />
        <p className={NOTE}>Say the page, the flow and the length.</p>
      </SetupStep>
      <SetupStep
        number={3}
        scene="action"
        cue="Action!"
        title="Get the video"
        art={<ClapperArt />}
        tilt={-0.4}
        turn={-4}
      >
        <ul className="flex flex-wrap gap-2">
          {FILES.map(({ name, detail, Art }) => (
            <li
              key={name}
              className="inline-flex items-center gap-2 rounded-[16px] bg-white py-1.5 pr-3.5 pl-2 leading-tight ring-1 ring-ink/10 ring-inset"
            >
              <span className="size-7.5 shrink-0">
                <Art />
              </span>
              <span>
                <b className="block text-[15px] font-semibold text-ink">{name}</b>
                <small className="block text-xs text-muted">{detail}</small>
              </span>
            </li>
          ))}
        </ul>
        <p className={NOTE}>
          Both in <b className="font-semibold text-ink">cursorcam-output/</b>, ready to post.
        </p>
      </SetupStep>
    </ol>
  );
}
