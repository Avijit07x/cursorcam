import { part } from '@/components/mock-app/stage';
import { CARD, FIELD } from '@/components/mock-app/styles';
import { MOCK_APP } from '@/lib/mock-app';

export const REEL_TITLE = MOCK_APP.newIssueTitle;

export function IssueModal({ typed }: { readonly typed: number }) {
  return (
    <div
      {...part('modal')}
      className="absolute inset-x-0 top-0 grid h-(--app-h) place-items-center bg-ink/25 opacity-0"
    >
      <div {...part('modal-card')} className={`${CARD} w-[min(88%,100cqh)]`}>
        <p className="text-[3.6cqh] leading-[1.2] font-semibold text-muted">{MOCK_APP.formTitle}</p>
        <p
          {...part('title')}
          className={`${FIELD} mt-[2.4cqh] rounded-[2.4cqh] px-[3cqh] py-[2cqh] text-[4.4cqh] leading-[1.3] font-semibold`}
        >
          {REEL_TITLE.slice(0, typed)}
          <span className="mx-[0.3cqh] inline-block h-[4.4cqh] w-[0.5cqh] bg-brand motion-safe:animate-blink align-[-0.7cqh]" />
          {typed === 0 ? <span className="text-muted">{MOCK_APP.titlePlaceholder}</span> : null}
        </p>
        <div className="mt-[3.2cqh] flex justify-end gap-[2cqh] text-[3.8cqh] leading-[1.2] font-semibold">
          <span className="rounded-full px-[3cqh] py-[1.6cqh] text-muted">{MOCK_APP.cancel}</span>
          <span
            {...part('create-button')}
            className="rounded-full bg-brand px-[3.6cqh] py-[1.6cqh] text-white"
          >
            {MOCK_APP.create}
          </span>
        </div>
      </div>
    </div>
  );
}
