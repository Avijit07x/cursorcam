import { PALETTE_NAMES, PALETTES, type PaletteName } from '@cursorcam/scenes';

interface PalettePickerProps {
  readonly value: PaletteName;
  readonly onChange: (palette: PaletteName) => void;
}

export function PalettePicker({ value, onChange }: PalettePickerProps) {
  return (
    <div
      role="group"
      aria-label="Palette"
      className="sticker-box sticky top-16 z-10 sm:top-20 flex gap-2 overflow-x-auto rounded-[22px] bg-page p-2 [scrollbar-width:none] sm:flex-wrap"
    >
      {PALETTE_NAMES.map((name) => {
        const [deep, light] = PALETTES[name];
        const pressed = name === value;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(name)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[15px] font-semibold capitalize transition-colors focus-ring ${pressed ? 'bg-brand text-white' : 'bg-white text-ink ring-1 ring-ink/10 hover:bg-brand-tint'}`}
          >
            <span
              aria-hidden="true"
              className="size-6 rounded-full ring-2 ring-white"
              style={{ background: `linear-gradient(135deg, ${deep} 50%, ${light} 50%)` }}
            />
            {name}
          </button>
        );
      })}
    </div>
  );
}
