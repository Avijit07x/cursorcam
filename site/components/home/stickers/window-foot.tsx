import { Button } from '@/components/ui/button';
import { BroomArt } from './art';

interface WindowFootProps {
  readonly line: string;
  readonly canPeel: boolean;
  readonly onPeel: () => void;
}

export function WindowFoot({ line, canPeel, onPeel }: WindowFootProps) {
  return (
    <div className="relative mt-8.5 flex flex-col items-center gap-2.5 text-center">
      <p aria-live="polite" className="min-h-[3.1em] max-w-[30em] text-body">
        {line}
      </p>
      {/* Wide screens float the button over the section gap, so the sheet beside it never moves */}
      <div
        className={`min-[940px]:absolute min-[940px]:top-full min-[940px]:left-1/2 min-[940px]:mt-2.5 min-[940px]:-translate-x-1/2 ${canPeel ? '' : 'invisible'}`}
      >
        <Button variant="soft" size="sm" onClick={onPeel}>
          <BroomArt className="size-5.5" />
          Peel off
        </Button>
      </div>
    </div>
  );
}
