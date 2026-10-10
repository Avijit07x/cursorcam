'use client';

import { DEFAULT_PALETTE, type PaletteName } from '@cursorcam/scenes';
import { useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { backgroundStyle } from '@/lib/backgrounds';
import type { SceneLook } from '@/lib/docs';
import { PalettePicker } from './palette-picker';
import { ScenePreview } from './scene-preview';

export function SceneGallery({ scenes }: { readonly scenes: readonly SceneLook[] }) {
  const [palette, setPalette] = useState<PaletteName>(DEFAULT_PALETTE);
  return (
    <div className="mt-6">
      <PalettePicker value={palette} onChange={setPalette} />
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {scenes.map(({ name, look }) => (
          <li key={name} className="sticker-box relative rounded-[22px] bg-white p-2">
            <ScenePreview scene={name} palette={palette} />
            <div className="absolute top-4 right-4">
              <CopyButton
                text={backgroundStyle(name, palette)}
                label={`Copy the ${name} background in ${palette}`}
              />
            </div>
            <div className="px-2.5 pt-3 pb-1.5">
              <h3 className="font-semibold text-ink">
                <code className="font-sans">{name}</code>
              </h3>
              <p className="text-[15px] leading-snug text-body">{look}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
