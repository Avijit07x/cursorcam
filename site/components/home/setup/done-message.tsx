import { PhotoArt, PlayArt, SmileArt } from '@/components/brand/sticker-art';

const FILES = [
  { name: 'video.mp4', detail: '1080p, 60 fps', Art: PlayArt },
  { name: 'poster.jpg', detail: 'a thumbnail', Art: PhotoArt },
] as const;

export function DoneMessage() {
  return (
    <div className="flex items-start gap-2">
      <span className="size-7.5 shrink-0">
        <SmileArt />
      </span>
      <div className="min-w-0 rounded-[6px_20px_20px_20px] bg-brand-tint px-4 py-3 text-[15px] text-ink">
        <p>
          Done! Your files are in <b className="font-semibold">cursorcam-output/</b>.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {FILES.map(({ name, detail, Art }) => (
            <li
              key={name}
              className="inline-flex items-center gap-2 rounded-[14px] bg-white py-1.5 pr-3 pl-1.5 leading-tight ring-1 ring-ink/10 ring-inset"
            >
              <span className="size-7 shrink-0">
                <Art />
              </span>
              <span>
                <b className="block text-sm font-semibold">{name}</b>
                <small className="block text-xs text-muted">{detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
