import type { Point } from '@/components/mock-app/stage';
import { SheetSticker, type DragZone } from './sheet-sticker';
import { STICKERS, type Sticker, type StickerKey } from './sticker-data';
import type { Flight } from './stuck-sticker';

interface StickerSheetProps {
  readonly stuckKey: StickerKey | undefined;
  readonly dragging: boolean;
  readonly isOverWindow: (point: Point) => boolean;
  readonly onDragZone: (zone: DragZone) => void;
  readonly onStick: (sticker: Sticker, from: Flight, tapped: boolean) => void;
}

export function StickerSheet({
  stuckKey,
  dragging,
  isOverWindow,
  onDragZone,
  onStick,
}: StickerSheetProps) {
  return (
    <div
      className={`relative order-2 w-full max-w-100 px-4 pt-5 pb-7.5 min-[940px]:order-none min-[940px]:flex-[0_0_400px] ${dragging ? 'z-20' : ''}`}
    >
      <span
        aria-hidden="true"
        className="sticker-shadow absolute inset-0 rotate-[-1.2deg] rounded-[32px] bg-white"
      >
        <span className="absolute right-0 bottom-0 size-12.5 rounded-[26px_0_32px_0] bg-brand-tint shadow-[-3px_-3px_0_#fff]" />
      </span>
      <p
        aria-hidden="true"
        className="relative mx-2 mb-4 flex items-center justify-between text-[13px] font-semibold text-muted"
      >
        <span>Sticker sheet</span>
        <span>Peel one off</span>
      </p>
      <ul
        aria-label="Stickers"
        className="relative flex flex-wrap items-center justify-center gap-x-3.5 gap-y-4.5"
      >
        {STICKERS.map((sticker) => (
          <li key={sticker.key}>
            <SheetSticker
              sticker={sticker}
              peeled={sticker.key === stuckKey}
              isOverWindow={isOverWindow}
              onDragZone={onDragZone}
              onStick={onStick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
