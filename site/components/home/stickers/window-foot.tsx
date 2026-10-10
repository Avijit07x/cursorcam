import { Button } from '@/components/ui/button';
import { BroomArt } from './art';

interface WindowFootProps {
  readonly line: string;
  readonly canPeel: boolean;
  readonly onPeel: () => void;
}

export function WindowFoot({ line, canPeel, onPeel }: WindowFootProps) {
  return (
    <div className="mt-8.5 flex flex-col items-center gap-2.5 text-center">
      <p aria-live="polite" className="min-h-[3.1em] max-w-[30em] text-body">
        {line}
      </p>
      <div className={canPeel ? undefined : 'invisible'}>
        <Button variant="soft" size="sm" onClick={onPeel}>
          <BroomArt className="size-5.5" />
          Peel off
        </Button>
      </div>
    </div>
  );
}
