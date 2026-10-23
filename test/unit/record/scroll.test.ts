import { describe, expect, it } from 'vitest';
import type { ActionContext } from '../../../src/record/context.js';
import { wheel } from '../../../src/record/scroll.js';

const UNSEEN_PX = 120;
const DISTANCE_PX = 300;

// Plays a scroll with a fake browser. `framesFollow` says whether a video frame comes after each
// wheel step. The log lists each step's size, and a 0 where the scroll waited for a frame.
async function playScroll(framesFollow: boolean): Promise<number[]> {
  const log: number[] = [];
  let received = 0;
  const context = {
    speed: 1,
    frames: {
      get received() {
        return received;
      },
      waitForFrame: () => {
        log.push(0);
        return Promise.resolve(false);
      },
    },
    session: {
      page: {
        mouse: {
          wheel: (_dx: number, dy: number) => {
            log.push(dy);
            if (framesFollow) received += 1;
            return Promise.resolve();
          },
        },
      },
    },
  } as unknown as ActionContext;
  await wheel(context, { x: 0, y: DISTANCE_PX });
  return log;
}

describe('wheel scrolling', () => {
  it('scrolls the whole way without waiting while frames keep coming', async () => {
    const log = await playScroll(true);

    expect(log).not.toContain(0);
    expect(log.reduce((sum, step) => sum + step, 0)).toBe(DISTANCE_PX);
  });

  it('waits for a frame once the page is far past the last one, then goes on', async () => {
    const log = await playScroll(false);
    const runs = log
      .join(',')
      .split(',0,')
      .map((run) => run.split(',').reduce((sum, step) => sum + Number(step), 0));

    expect(log.filter((step) => step === 0).length).toBeGreaterThan(1);
    expect(Math.max(...runs)).toBeLessThanOrEqual(UNSEEN_PX);
    expect(runs.reduce((sum, run) => sum + run, 0)).toBe(DISTANCE_PX);
  });
});
