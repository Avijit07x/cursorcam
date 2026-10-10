import type { PaletteName, SceneName } from '@cursorcam/scenes';
import Image from 'next/image';
import { WINDOW_DOTS } from '@/components/ui/browser-window';
import { backgroundUrl } from '@/lib/backgrounds';

interface ScenePreviewProps {
  readonly scene: SceneName;
  readonly palette: PaletteName;
}

export function ScenePreview({ scene, palette }: ScenePreviewProps) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-brand-tint @container">
      <Image src={backgroundUrl(scene, palette)} alt="" fill unoptimized className="object-cover" />
      <div className="absolute top-[6.02%] left-[12.24%] h-[87.96%] w-[75.57%] overflow-hidden rounded-[0.73cqw] bg-white shadow-[0_1.4cqw_3cqw_-1cqw_rgb(15_23_42/0.45)]">
        <div className="flex h-[4.53%] items-center gap-[0.5cqw] bg-[#f4f3ff] px-[1cqw]">
          {WINDOW_DOTS.map((color) => (
            <span
              key={color}
              className="size-[0.7cqw] rounded-full"
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
