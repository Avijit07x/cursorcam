'use client';

import { animate, motion, useAnimate, useMotionValue, useTransform } from 'motion/react';
import { memo, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/mock-app/app-header';
import { IssueList } from '@/components/mock-app/issue-list';
import { Ripple } from '@/components/mock-app/ripple';
import { SceneCursor } from '@/components/mock-app/scene-cursor';
import { createStage, type ZoomValues } from '@/components/mock-app/stage';
import { THEME } from '@/components/mock-app/theme';
import { Toast } from '@/components/mock-app/toast';
import { usePointValues } from '@/components/mock-app/use-point-values';
import { MOCK_APP } from '@/lib/mock-app';
import { SOFT } from '@/lib/motion';
import { zoomScale } from '../settings';
import { IssueModal } from './issue-modal';
import { LAYOUTS, type ReelLayout } from './layouts';
import { FREE_ZOOM, playReel, type ReelFlags } from './reel-script';
import { ReelWindow } from './reel-window';

const CENTER = { x: 0.5, y: 0.5 };
const START: ReelFlags = { typed: 0, fit: FREE_ZOOM };

interface ReelProps {
  readonly layout: ReelLayout;
  readonly zoom: number;
  readonly previewing: boolean;
  readonly running: boolean;
  readonly onLoop: () => void;
}

export const Reel = memo(function Reel({ layout, zoom, previewing, running, onLoop }: ReelProps) {
  const [scope, animateScene] = useAnimate<HTMLDivElement>();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState(START);
  const [toast, setToast] = useState<string>(MOCK_APP.issueCreated);
  const { frame, unit, rest } = LAYOUTS[layout];
  const cursor = usePointValues(rest);
  const ripple = usePointValues(CENTER);
  const origin = usePointValues(CENTER);
  const focus = useMotionValue(0);
  const preview = useMotionValue(0);
  const reach = useMotionValue(zoomScale(zoom));
  const fit = useMotionValue(FREE_ZOOM);
  const scale = useTransform(
    () => 1 + Math.max(focus.get(), preview.get()) * (Math.min(reach.get(), fit.get()) - 1),
  );
  const [camera] = useState<ZoomValues>(() => ({ scale: focus, origin }));

  useEffect(() => {
    const change = animate(reach, zoomScale(zoom), SOFT);
    return () => change.stop();
  }, [reach, zoom]);

  useEffect(() => {
    const change = animate(preview, previewing ? 1 : 0, SOFT);
    return () => change.stop();
  }, [preview, previewing]);

  useEffect(() => {
    const change = animate(fit, flags.fit, SOFT);
    return () => change.stop();
  }, [fit, flags.fit]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!running || !scene) return;
    const controller = new AbortController();
    const stage = createStage<ReelFlags>({
      animate: animateScene,
      scene,
      cursor,
      ripple,
      zoom: camera,
      instant: false,
      signal: controller.signal,
      update: (patch) => setFlags((current) => ({ ...current, ...patch })),
      toast: setToast,
    });
    playReel(stage, rest, onLoop).catch((error: unknown) => {
      if (!controller.signal.aborted) reportError(error);
    });
    return () => controller.abort();
  }, [running, animateScene, cursor, ripple, camera, rest, onLoop]);

  return (
    <div
      ref={scope}
      className="absolute inset-0 bg-[url(/backgrounds/dunes-indigo.svg)] bg-cover bg-center @container-size"
    >
      <ReelWindow className={frame}>
        <motion.div
          className="absolute inset-0 overflow-hidden"
          variants={THEME.view}
          initial={false}
          animate="light"
        >
          <motion.div
            ref={sceneRef}
            className={`absolute @container-size ${unit}`}
            style={{ scale, originX: origin.x, originY: origin.y }}
          >
            <AppHeader masked={false} />
            <IssueList />
            <IssueModal typed={flags.typed} />
            <Ripple point={ripple} />
            <SceneCursor point={cursor} />
          </motion.div>
          <div className={`pointer-events-none absolute @container-size ${unit}`}>
            <Toast text={toast} />
          </div>
        </motion.div>
      </ReelWindow>
    </div>
  );
});
