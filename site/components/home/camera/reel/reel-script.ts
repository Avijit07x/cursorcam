import { framedOrigin, type Point, type Stage } from '@/components/mock-app/stage';
import { MOCK_APP } from '@/lib/mock-app';
import { ZOOM, zoomScale } from '../settings';
import { REEL_TITLE } from './issue-modal';

export interface ReelFlags {
  readonly typed: number;
  readonly fit: number;
}

export const FREE_ZOOM = 3;

type ReelStage = Stage<ReelFlags>;

const FOCUSED = 1;
const WIDE = 0;
const CENTER: Point = { x: 0.5, y: 0.5 };
const TITLE_SPOT = 0.12;
const ROW_SPOT = 0.62;
const FIT_MARGIN = 0.9;
const DEEPEST = zoomScale(ZOOM.max);
const TIMING = {
  start: 700,
  toButton: 1000,
  open: 240,
  toTitle: 800,
  perChar: 55,
  typed: 500,
  toCreate: 750,
  close: 260,
  back: 1000,
  linger: 1400,
  toRest: 900,
  rest: 1400,
} as const;

function reset(stage: ReelStage, rest: Point) {
  stage.set({ typed: 0, fit: FREE_ZOOM });
  return Promise.all([
    stage.fadeOut('modal', 0),
    stage.fadeOut('new-row', 0),
    stage.fadeOut('toast', 0),
    stage.zoomTo(WIDE, CENTER, 0),
    stage.glide(rest, 0),
  ]);
}

async function typeTitle(stage: ReelStage) {
  for (let count = 1; count <= REEL_TITLE.length; count += 1) {
    stage.set({ typed: count });
    await stage.wait(TIMING.perChar);
  }
}

async function createIssue(stage: ReelStage) {
  const button = stage.pointOn('new-button');
  await Promise.all([
    stage.glide(button, TIMING.toButton),
    stage.zoomTo(FOCUSED, framedOrigin(button, DEEPEST), TIMING.toButton),
  ]);
  await stage.click(button, 'new-button');
  stage.fadeIn('modal', TIMING.open);
  stage.popIn('modal-card');
  const left = stage.pointOn('modal-card', 0);
  const right = stage.pointOn('modal-card', 1);
  stage.set({ fit: FIT_MARGIN / (right.x - left.x) });
  const title = stage.pointOn('title', TITLE_SPOT);
  await Promise.all([
    stage.glide(title, TIMING.toTitle),
    stage.panTo(framedOrigin(stage.pointOn('modal-card'), DEEPEST), TIMING.toTitle),
  ]);
  await stage.click(title);
  await typeTitle(stage);
  await stage.wait(TIMING.typed);
  const create = stage.pointOn('create-button');
  await stage.glide(create, TIMING.toCreate);
  await stage.click(create, 'create-button');
  await stage.fadeOut('modal', TIMING.close);
  stage.addRow();
  stage.showToast(MOCK_APP.issueCreated);
  await Promise.all([
    stage.zoomTo(WIDE, null, TIMING.back),
    stage.glide(stage.pointOn('new-row', ROW_SPOT), TIMING.back),
  ]);
  stage.set({ fit: FREE_ZOOM });
}

export async function playReel(stage: ReelStage, rest: Point, onLoop: () => void) {
  for (;;) {
    await reset(stage, rest);
    onLoop();
    await stage.wait(TIMING.start);
    await createIssue(stage);
    await stage.wait(TIMING.linger);
    await stage.glide(rest, TIMING.toRest);
    await stage.wait(TIMING.rest);
  }
}
