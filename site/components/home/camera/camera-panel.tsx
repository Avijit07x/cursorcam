'use client';

import { motion } from 'motion/react';
import { HeartArt } from '@/components/brand/sticker-art';
import { StickerTag } from '@/components/ui/sticker-tag';
import { POP } from '@/lib/motion';
import { PresetDial } from './preset-dial';
import { PresetLcd } from './preset-lcd';
import { type CameraSettings, type ShapeKey, TIPS } from './settings';
import { ShapeSwitch } from './shape-switch';
import { ZoomKnob } from './zoom-knob';

interface CameraPanelProps {
  readonly settings: CameraSettings;
  readonly tip: number;
  readonly onPreset: (preset: number) => void;
  readonly onShape: (shape: ShapeKey) => void;
  readonly onZoom: (zoom: number) => void;
}

export function CameraPanel({ settings, tip, onPreset, onShape, onZoom }: CameraPanelProps) {
  return (
    <div className="grid min-w-0 grid-cols-2 content-center items-start gap-x-3 gap-y-4.5 rounded-[clamp(22px,3vw,34px)] bg-brand-strong px-3.5 pt-4.5 pb-5 [grid-template-areas:'tip_tip'_'dial_dial'_'lcd_lcd'_'shape_zoom'] sm:max-lg:grid-cols-[minmax(232px,1fr)_minmax(0,1fr)] sm:max-lg:[grid-template-areas:'tip_tip'_'dial_lcd'_'shape_zoom']">
      <motion.p
        key={tip}
        aria-hidden="true"
        className="justify-self-center [grid-area:tip]"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={POP}
      >
        <StickerTag>
          <span className="size-5">
            <HeartArt />
          </span>
          {TIPS[tip]}
        </StickerTag>
      </motion.p>
      <PresetDial preset={settings.preset} onChange={onPreset} />
      <PresetLcd preset={settings.preset} />
      <ShapeSwitch shape={settings.shape} onChange={onShape} />
      <ZoomKnob zoom={settings.zoom} onChange={onZoom} />
    </div>
  );
}
