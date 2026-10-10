'use client';

import { type Transition, motion, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useBursts } from '@/components/brand/burst';
import { HeartArt, StarArt } from '@/components/brand/sticker-art';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { useScrollIntoView } from '@/hooks/use-scroll-into-view';
import { SECTION_BODY } from '@/lib/layout';
import { IN_VIEW, POP, SOFT } from '@/lib/motion';
import { SECTION_IDS } from '@/lib/sections';
import { CameraPanel } from './camera-panel';
import { CameraScreen } from './camera-screen';
import { CameraTop } from './camera-top';
import { type CameraSettings, START_SETTINGS, TIP_SNAPPED, TIP_TOUCHED } from './settings';
import { SnapCard } from './snap-card';
import { HOUSING } from './styles';

const ZOOM_HOLD_MS = 1400;
const STICKER_DELAY = 0.5;
const STICKER_STAGGER = 0.15;
const SNAP_STATUS = 'Snap! Your request is ready under the camera. Copy it into Claude Code.';
const FLASH = { opacity: [0, 0.95, 0] };
const FLASH_TIMING: Transition = { duration: 0.52, times: [0, 0.15, 1], ease: 'easeOut' };
const LENS = { scale: [1, 0.6, 1] };
const LENS_TIMING: Transition = { duration: 0.6, times: [0, 0.2, 1], ease: 'easeOut' };
const SQUISH = { scaleX: [1, 1.02, 1], scaleY: [1, 0.955, 1] };
const SQUISH_TIMING: Transition = { duration: 0.55, times: [0, 0.15, 1] };

export function CameraSection() {
  const [settings, setSettings] = useState<CameraSettings>(START_SETTINGS);
  const [tip, setTip] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [snaps, setSnaps] = useState(0);
  const [status, setStatus] = useState('');
  const [camera, animate] = useAnimate<HTMLDivElement>();
  const flashRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<SVGGElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduceMotion = useReducedMotion();
  const { fire, layer } = useBursts();
  const scrollIntoView = useScrollIntoView();

  useEffect(() => () => clearTimeout(previewTimer.current), []);

  const change = (patch: Partial<CameraSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setTip((stage) => Math.max(stage, TIP_TOUCHED));
  };

  const changeZoom = (zoom: number) => {
    change({ zoom });
    setPreviewing(true);
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewing(false), ZOOM_HOLD_MS);
  };

  const snap = () => {
    fire();
    setTip(TIP_SNAPPED);
    setTrayOpen(true);
    setSnaps((count) => count + 1);
    setStatus(SNAP_STATUS);
    if (reduceMotion) return;
    if (flashRef.current) animate(flashRef.current, FLASH, FLASH_TIMING);
    if (lensRef.current) animate(lensRef.current, LENS, LENS_TIMING);
    animate(camera.current, SQUISH, SQUISH_TIMING);
  };

  const closeTray = () => {
    setTrayOpen(false);
    const shutter = shutterRef.current;
    if (!shutter) return;
    shutter.focus({ preventScroll: true });
    scrollIntoView(shutter, 'nearest');
  };

  return (
    <Section id={SECTION_IDS.camera} labelledBy="camera-title">
      <SectionHeading id="camera-title" kicker="Try the camera" title="Set it up, then ask Claude.">
        <p>Turn the dial, pick a shape and set the zoom. The screen shows the video you get.</p>
      </SectionHeading>
      <motion.div
        className={SECTION_BODY}
        initial={{ opacity: 0, y: 40, rotate: 2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={IN_VIEW}
        transition={SOFT}
      >
        <div ref={camera} className="relative origin-bottom select-none">
          <CameraTop
            lensRef={lensRef}
            shutterRef={shutterRef}
            onShutter={snap}
            burst={layer}
            hint={tip < TIP_SNAPPED}
          />
          <div
            className={`${HOUSING} relative z-20 grid gap-4 rounded-[clamp(30px,4vw,48px)] p-[clamp(12px,1.8vw,22px)] lg:grid-cols-[minmax(0,1fr)_clamp(290px,27vw,330px)]`}
          >
            <motion.span
              aria-hidden="true"
              className="sticker-shadow pointer-events-none absolute -top-10 left-[45%] z-30 hidden size-12.5 sm:block"
              initial={{ scale: 0, rotate: 10 }}
              whileInView={{ scale: 1 }}
              viewport={IN_VIEW}
              transition={{ ...POP, delay: STICKER_DELAY + STICKER_STAGGER }}
            >
              <StarArt />
            </motion.span>
            <motion.span
              aria-hidden="true"
              className="sticker-shadow pointer-events-none absolute -bottom-4 -left-3 z-30 size-[clamp(40px,5vw,58px)]"
              initial={{ scale: 0, rotate: -14 }}
              whileInView={{ scale: 1 }}
              viewport={IN_VIEW}
              transition={{ ...POP, delay: STICKER_DELAY }}
            >
              <HeartArt />
            </motion.span>
            <CameraScreen settings={settings} previewing={previewing} flashRef={flashRef} />
            <CameraPanel
              settings={settings}
              tip={tip}
              onPreset={(preset) => change({ preset })}
              onShape={(shape) => change({ shape })}
              onZoom={changeZoom}
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-2.5 left-1/2 z-30 h-3.5 w-[min(44%,300px)] -translate-x-1/2 rounded-full border-4 border-white bg-ink"
            />
          </div>
        </div>
      </motion.div>
      <SnapCard open={trayOpen} snaps={snaps} settings={settings} onClose={closeTray} />
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </Section>
  );
}
