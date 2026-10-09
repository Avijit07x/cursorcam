import { describe, expect, it } from 'vitest';
import { pickMoments } from '../../../src/render/moments.js';
import { buildTimeMap, correctFrameTimes, FramePicker } from '../../../src/render/timeline.js';
import { at, box, frameAt } from '../../helpers/events.js';

const VIEWPORT = { width: 1280, height: 800 };

function momentsFor(events: Parameters<typeof buildTimeMap>[0]) {
  const frames = correctFrameTimes([frameAt(1, 900), frameAt(2, 1_100), frameAt(3, 2_000)]);
  return pickMoments({
    events,
    timeMap: buildTimeMap(events, 0, 2_500, { trimIdle: false, dialogs: false }),
    picker: new FramePicker(frames, []),
    fps: 30,
    frameCount: 75,
    viewport: VIEWPORT,
    count: 2,
  });
}

describe('close-up crops', () => {
  it('shows a clicked target as it was at the click, before it can disappear', () => {
    const moments = momentsFor([
      at(500, { type: 'step', phase: 'start', index: 0, action: 'click' }),
      at(1_000, { type: 'click', x: 200, y: 200, count: 1, target: box(150, 180) }),
      at(1_500, { type: 'step', phase: 'end', index: 0, action: 'click' }),
    ]);

    expect(moments.crops).toEqual([
      {
        name: 'crop-01-step-01.png',
        source: 1,
        rect: { x: 102, y: 132, width: 196, height: 136 },
      },
    ]);
  });

  it('shows typed text after the typing ends', () => {
    const moments = momentsFor([
      at(500, { type: 'step', phase: 'start', index: 0, action: 'type' }),
      at(900, { type: 'typing', phase: 'end', target: box(150, 180), fast: false, chars: 5 }),
      at(1_500, { type: 'step', phase: 'end', index: 0, action: 'type' }),
    ]);

    expect(moments.crops[0]?.source).toBe(2);
  });
});
