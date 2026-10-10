import type { ReactNode } from 'react';
import { Blur } from '@/components/mock-app/blur';
import { part } from '@/components/mock-app/stage';
import { CARD, FIELD } from '@/components/mock-app/styles';
import { MOCK_APP } from '@/lib/mock-app';
import { PASSWORD_DOTS } from './acts';
import { Overlay, OverlayButton, OverlayTitle } from './overlay';

const DOTS = Array.from({ length: PASSWORD_DOTS }, (_, index) => index);

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="mt-[2.6cqh]">
      <div className="text-[3.4cqh] leading-[1.2] font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}

const FIELD_BOX = `mt-[1cqh] flex h-[8.4cqh] items-center gap-[1.2cqh] overflow-hidden rounded-[2.6cqh] px-[2.8cqh] text-[3.8cqh] whitespace-nowrap ${FIELD}`;

export function LoginOverlay({ secret }: { readonly secret: boolean }) {
  return (
    <Overlay name="login">
      <div {...part('login-card')} className={`w-[min(78cqh,88cqw)] ${CARD}`}>
        <OverlayTitle>Sign in</OverlayTitle>
        <Field label="Email">
          <div className={FIELD_BOX}>
            <Blur on={secret}>{MOCK_APP.user}</Blur>
          </div>
        </Field>
        <Field label="Password">
          <div {...part('password')} className={FIELD_BOX}>
            {DOTS.map((dot) => (
              <span
                key={dot}
                {...part('password-dot')}
                className="size-[2.2cqh] shrink-0 rounded-full bg-ink opacity-0"
              />
            ))}
          </div>
        </Field>
        <OverlayButton name="login-go">Sign in</OverlayButton>
      </div>
    </Overlay>
  );
}
