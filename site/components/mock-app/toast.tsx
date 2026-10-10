import { CheckIcon } from '@/components/ui/icons';
import { part } from './stage';
import { CHIP } from './styles';

export function Toast({ text }: { readonly text: string }) {
  return (
    <div
      {...part('toast')}
      className={`${CHIP} inset-x-0 top-[3.6cqh] mx-auto w-max bg-white text-ink`}
    >
      <span className="grid size-[4.6cqh] place-items-center rounded-full bg-mint text-ink">
        <CheckIcon className="size-[3.2cqh]" />
      </span>
      {text}
    </div>
  );
}
