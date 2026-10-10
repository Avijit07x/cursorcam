import { SmileArt } from '@/components/brand/sticker-art';
import { part } from '@/components/mock-app/stage';
import { CARD, FIELD } from '@/components/mock-app/styles';
import { CODE } from './acts';
import { Overlay, OverlayButton, OverlayTitle } from './overlay';

const DIGITS = [...CODE];

export function CodeOverlay({ digits }: { readonly digits: number }) {
  return (
    <Overlay name="code">
      <div {...part('code-card')} className={`w-[min(74cqh,84cqw)] opacity-0 ${CARD}`}>
        <OverlayTitle>Enter your code</OverlayTitle>
        <div className="mt-[3.4cqh] flex gap-[1.6cqh]">
          {DIGITS.map((digit, index) => (
            <span
              key={index}
              {...part(`code-box-${index}`)}
              className={`grid h-[9cqh] flex-1 place-items-center rounded-[2.4cqh] text-[4.6cqh] font-semibold ${FIELD}`}
            >
              {index < digits ? digit : ''}
            </span>
          ))}
        </div>
        <OverlayButton name="code-go">Verify</OverlayButton>
      </div>
      <div
        {...part('code-ask')}
        className="absolute bottom-[4cqh] left-[4cqh] flex items-center gap-[1.6cqh] rounded-full bg-brand py-[1.2cqh] pr-[3cqh] pl-[1.2cqh] text-[3.8cqh] leading-[1.2] font-semibold whitespace-nowrap text-white opacity-0 shadow-[0_1.8cqh_4cqh_-1.8cqh_rgb(30_27_75/0.4)]"
      >
        <span className="size-[6cqh] shrink-0">
          <SmileArt />
        </span>
        Claude asks you for the code
      </div>
    </Overlay>
  );
}
