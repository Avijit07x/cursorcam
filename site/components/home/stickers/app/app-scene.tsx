'use client';

import { motion, motionValue, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/mock-app/app-header';
import { IssueList } from '@/components/mock-app/issue-list';
import { Ripple } from '@/components/mock-app/ripple';
import { SceneCursor } from '@/components/mock-app/scene-cursor';
import { createStage, type PointValues, type ZoomValues } from '@/components/mock-app/stage';
import { THEME, toneOf } from '@/components/mock-app/theme';
import { usePointValues } from '@/components/mock-app/use-point-values';
import { BrowserWindow } from '@/components/ui/browser-window';
import { MOCK_APP } from '@/lib/mock-app';
import { ACTS, type ActKey, type SceneFlags } from './acts';
import { AddressPill } from './address-pill';
import { CodeOverlay } from './code-overlay';
import { LoginOverlay } from './login-overlay';
import { SceneChips } from './scene-chips';
import { WaitCard } from './wait-card';

const CENTER = { x: 0.5, y: 0.5 };

const IDLE: SceneFlags = {
  dark: false,
  masked: false,
  secret: false,
  addressSet: false,
  digits: 0,
  toast: MOCK_APP.issueCreated,
};

interface AppSceneProps {
  readonly act: ActKey | null;
  readonly cursor: PointValues;
}

export function AppScene({ act, cursor }: AppSceneProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [flags, setFlags] = useState(IDLE);
  const ripple = usePointValues(CENTER);
  const origin = usePointValues(CENTER);
  const [zoom] = useState<ZoomValues>(() => ({ scale: motionValue(1), origin }));

  useEffect(() => {
    const scene = sceneRef.current;
    if (!act || !scene) return;
    const controller = new AbortController();
    const stage = createStage({
      animate,
      scene,
      cursor,
      ripple,
      zoom,
      instant: reduceMotion === true,
      signal: controller.signal,
      update: (patch) => setFlags((current) => ({ ...current, ...patch })),
      toast: (toast) => setFlags((current) => ({ ...current, toast })),
    });
    ACTS[act](stage).catch((error: unknown) => {
      if (!controller.signal.aborted) reportError(error);
    });
    return () => controller.abort();
  }, [act, animate, cursor, ripple, zoom, reduceMotion]);

  return (
    <div ref={scope}>
      <BrowserWindow address={<AddressPill set={flags.addressSet} />}>
        <motion.div
          className="relative aspect-video overflow-hidden @container-size"
          variants={THEME.view}
          initial={false}
          animate={toneOf(flags.dark)}
        >
          <motion.div
            ref={sceneRef}
            className="absolute inset-0"
            style={{ scale: zoom.scale, originX: origin.x, originY: origin.y }}
          >
            <AppHeader masked={flags.masked} />
            <IssueList />
            <LoginOverlay secret={flags.secret} />
            <CodeOverlay digits={flags.digits} />
            <WaitCard />
            <Ripple point={ripple} />
            <SceneCursor point={cursor} />
          </motion.div>
          <SceneChips toast={flags.toast} />
        </motion.div>
      </BrowserWindow>
    </div>
  );
}
