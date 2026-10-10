import { part } from '@/components/mock-app/stage';
import { CHIP, CHIP_ICON } from '@/components/mock-app/styles';
import { Toast } from '@/components/mock-app/toast';
import { FastForwardArt, MagnifierArt } from '../art';

export function SceneChips({ toast }: { readonly toast: string }) {
  return (
    <>
      <Toast text={toast} />
      <div {...part('zoom-chip')} className={`${CHIP} bottom-[4cqh] left-[4cqh] bg-white text-ink`}>
        <MagnifierArt className={CHIP_ICON} />
        2× zoom
      </div>
      <div {...part('ff-chip')} className={`${CHIP} top-[17cqh] right-[4cqh] bg-brand text-white`}>
        <FastForwardArt className={CHIP_ICON} color="#fff" />
        Sped up
      </div>
    </>
  );
}
