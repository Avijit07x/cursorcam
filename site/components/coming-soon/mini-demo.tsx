'use client';

import { motion, type Transition } from 'motion/react';
import { ADDRESS_PILL, BrowserWindow, WINDOW_FRAME } from '@/components/ui/browser-window';
import { ISSUE_ROWS, MOCK_APP } from '@/lib/mock-app';
import { SOFT } from '@/lib/motion';

const LOOP_SECONDS = 6;
const START_SECONDS = 1.6;
const EASE = 'easeInOut';
const loop = (times: number[]): Transition => ({
  duration: LOOP_SECONDS,
  times,
  repeat: Infinity,
  delay: START_SECONDS,
  ease: EASE,
});

const ROW_TOPS = ['30%', '47%', '64%'];
const MAX_WIDTH = '30rem';
const FRAME_HEIGHT = '3rem';
const FRAME_SIDES = '0.75rem';
const PAGE_GUTTERS = '2rem';
const WIDTH_TO_FIT_BOX = `min(${MAX_WIDTH}, 100cqw, calc((100cqh - ${FRAME_HEIGHT}) * 16 / 9 + ${FRAME_SIDES}))`;

export const MINI_DEMO_MAX_HEIGHT = `calc((min(${MAX_WIDTH}, 100vw - ${PAGE_GUTTERS}) - ${FRAME_SIDES}) * 9 / 16 + ${FRAME_HEIGHT})`;

function Cursor() {
  return (
    <svg viewBox="0 0 24 24" className="size-5.5" aria-hidden="true">
      <path
        d="M5 3.5v15.2l4.2-3.6 2.7 6 2.3-1.1-2.7-5.9h5.6Z"
        fill="#4F46E5"
        stroke="#fff"
        strokeWidth={2.4}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

function Row({ dot, width, avatar }: { dot: string; width: string; avatar: string }) {
  return (
    <>
      <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="h-1.5 rounded-full bg-ink/10" style={{ width }} />
      <span className="ml-auto size-4 shrink-0 rounded-full" style={{ background: avatar }} />
    </>
  );
}

export function MiniDemo() {
  return (
    <motion.figure
      aria-label="A tiny demo: a cursor clicks New issue, the view zooms in on the click, and the new issue appears"
      className={`${WINDOW_FRAME} m-0`}
      style={{ width: WIDTH_TO_FIT_BOX }}
      initial={{ opacity: 0, y: 40, rotate: 3 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ ...SOFT, delay: 0.9 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
    >
      <BrowserWindow address={<span className={ADDRESS_PILL}>your-app.com</span>}>
        <div className="relative aspect-video overflow-hidden bg-[#fcfcff]">
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: '86% 14%' }}
            animate={{ scale: [1, 1, 1.75, 1.75, 1, 1] }}
            transition={loop([0, 0.1, 0.27, 0.4, 0.55, 1])}
          >
            <span className="absolute top-[9%] left-[6%] text-[13px] font-semibold text-ink">
              {MOCK_APP.heading}
            </span>
            <motion.span
              className="absolute top-[7%] right-[5%] rounded-full bg-brand px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-white"
              animate={{ scale: [1, 1, 0.9, 1.06, 1, 1] }}
              transition={loop([0, 0.29, 0.31, 0.34, 0.38, 1])}
            >
              {MOCK_APP.newIssue}
            </motion.span>
            <motion.span
              className="absolute top-[12%] left-[84%] size-7 rounded-full border-2 border-brand"
              style={{ x: '-50%', y: '-50%' }}
              animate={{ scale: [0.3, 0.3, 0.3, 2.4, 2.4], opacity: [0, 0, 0.8, 0, 0] }}
              transition={loop([0, 0.299, 0.3, 0.42, 1])}
            />
            {ISSUE_ROWS.map((row, index) => (
              <div
                key={row.dot}
                className="absolute right-[6%] left-[6%] flex h-[13%] items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-ink/8"
                style={{ top: ROW_TOPS[index] }}
              >
                <Row dot={row.dot} width={row.width} avatar={row.avatar} />
              </div>
            ))}
            <motion.div
              className="absolute top-[81%] right-[6%] left-[6%] flex h-[13%] items-center gap-2 rounded-xl px-3 ring-1 ring-brand/30"
              animate={{
                opacity: [0, 0, 1, 1, 0, 0],
                y: [8, 8, 0, 0, 0, 8],
                backgroundColor: ['#E0E7FF', '#E0E7FF', '#E0E7FF', '#FFFFFF', '#FFFFFF', '#E0E7FF'],
              }}
              transition={loop([0, 0.35, 0.42, 0.7, 0.94, 1])}
            >
              <span className="size-2 shrink-0 rounded-full bg-rose" />
              <span className="truncate text-[11px] font-medium text-ink">
                {MOCK_APP.newIssueTitle}
              </span>
              <span className="ml-auto size-4 shrink-0 rounded-full bg-brand" />
            </motion.div>
            <motion.div
              className="pointer-events-none absolute inset-0"
              animate={{
                x: ['45%', '45%', '84%', '84%', '40%', '40%', '45%'],
                y: ['58%', '58%', '12%', '12%', '86%', '86%', '58%'],
              }}
              transition={loop([0, 0.08, 0.26, 0.36, 0.58, 0.78, 1])}
            >
              <div className="absolute top-0 left-0 -translate-x-[21%] -translate-y-[15%]">
                <motion.div
                  style={{ originX: 0.2, originY: 0.15 }}
                  animate={{ scale: [1, 1, 0.78, 1.08, 1, 1] }}
                  transition={loop([0, 0.28, 0.3, 0.33, 0.36, 1])}
                >
                  <Cursor />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute top-[5%] left-1/2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-ink shadow-[0_6px_16px_-6px_rgb(30_27_75/0.3)] ring-1 ring-ink/8"
            style={{ x: '-50%' }}
            animate={{ opacity: [0, 0, 1, 1, 0, 0], y: [-10, -10, 0, 0, -10, -10] }}
            transition={loop([0, 0.34, 0.39, 0.82, 0.88, 1])}
          >
            <span className="grid size-3.5 place-items-center rounded-full bg-emerald-500 text-[9px] text-white">
              ✓
            </span>
            {MOCK_APP.issueCreated}
          </motion.div>
        </div>
      </BrowserWindow>
    </motion.figure>
  );
}
