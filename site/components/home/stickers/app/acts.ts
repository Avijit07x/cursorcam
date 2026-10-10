import { framedOrigin, type Part, type Point, type Stage } from '@/components/mock-app/stage';
import { MOCK_APP } from '@/lib/mock-app';
import type { StickerKey } from '../sticker-data';
import { TIMING } from './timing';

export type ActKey = StickerKey | 'home';

export interface SceneFlags {
  readonly dark: boolean;
  readonly masked: boolean;
  readonly secret: boolean;
  readonly addressSet: boolean;
  readonly digits: number;
  readonly toast: string;
}

type ActStage = Stage<SceneFlags>;

export const HOME: Point = { x: 0.46, y: 0.66 };
export const PASSWORD_DOTS = 8;
export const CODE = '123456';

const ZOOM_LEVEL = 2;
const ZOOM_DRIFT = { x: -0.08, y: 0.06 };
const ROW_SPOT = { x: 0.6, y: 0.5 };
const CURSOR_ARC = 0.22;
const CURSOR_STOPS: readonly (readonly [Part, number])[] = [
  ['row-0', 0.3],
  ['row-2', 0.86],
  ['new-button', 0.5],
];
const FIELD_SPOT = 0.3;
const EMAIL_SPOT = 0.4;
const EMAIL_SQUISH = { low: 0.92, high: 1.06 };
const ADDRESS_SQUISH = { low: 0.8, high: 1.15 };
const SLOW_FILL = 0.28;
const FAST_SPIN = 5;
const CODE_BOX_FROM = 0.5;

const TOASTS = {
  created: MOCK_APP.issueCreated,
  signedIn: 'Signed in',
  hidden: 'Email hidden',
  address: 'Address bar set',
} as const;

function finishIssue(stage: ActStage) {
  stage.addRow();
  stage.showToast(TOASTS.created);
}

async function newIssue(stage: ActStage) {
  const point = stage.pointOn('new-button');
  await stage.glide(point, TIMING.newIssue.travel);
  await stage.click(point, 'new-button');
  finishIssue(stage);
}

async function zoom(stage: ActStage) {
  const time = TIMING.zoom;
  await stage.wait(time.start);
  const point = stage.pointOn('new-button');
  stage.popIn('zoom-chip');
  await Promise.all([
    stage.glide(point, time.travel),
    stage.zoomTo(ZOOM_LEVEL, framedOrigin(point, ZOOM_LEVEL), time.travel),
  ]);
  await stage.click(point, 'new-button');
  finishIssue(stage);
  await stage.wait(time.linger);
  await stage.glide({ x: point.x + ZOOM_DRIFT.x, y: point.y + ZOOM_DRIFT.y }, time.drift);
  await stage.wait(time.hold);
  stage.fadeOut('zoom-chip');
  await stage.zoomTo(1, null, time.back);
  await stage.glide(stage.pointOn('new-row', ROW_SPOT.x, ROW_SPOT.y), time.toRow);
}

async function cursor(stage: ActStage) {
  for (const [target, spot] of CURSOR_STOPS) {
    await stage.wait(TIMING.cursor.pause);
    const point = stage.pointOn(target, spot);
    await stage.glide(point, TIMING.cursor.travel, CURSOR_ARC);
    await stage.click(point, target);
  }
  finishIssue(stage);
}

async function logins(stage: ActStage) {
  const time = TIMING.logins;
  stage.fadeIn('login', time.overlay);
  stage.popIn('login-card');
  await stage.wait(time.open);
  stage.set({ secret: true });
  const field = stage.pointOn('password', FIELD_SPOT);
  await stage.glide(field, time.toField);
  await stage.click(field);
  await stage.typeDots(PASSWORD_DOTS, time.perDot);
  await stage.wait(time.typed);
  const go = stage.pointOn('login-go');
  await stage.glide(go, time.toButton);
  await stage.click(go, 'login-go');
  await stage.fadeOut('login', time.close);
  stage.showToast(TOASTS.signedIn);
}

async function hide(stage: ActStage) {
  const time = TIMING.hide;
  await stage.wait(time.start);
  await stage.glide(stage.pointOn('email', EMAIL_SPOT), time.travel);
  stage.set({ masked: true });
  stage.squish('email', EMAIL_SQUISH.low, EMAIL_SQUISH.high, time.squish);
  stage.showToast(TOASTS.hidden);
  await stage.wait(time.read);
  await newIssue(stage);
}

async function twofa(stage: ActStage) {
  const time = TIMING.twofa;
  stage.fadeIn('code', time.overlay);
  stage.popIn('code-card');
  await stage.wait(time.open);
  stage.popIn('code-ask');
  await stage.wait(time.ask);
  for (let index = 0; index < CODE.length; index += 1) {
    stage.set({ digits: index + 1 });
    stage.pop(`code-box-${index}`, CODE_BOX_FROM);
    await stage.wait(time.perDigit);
  }
  await stage.wait(time.entered);
  stage.fadeOut('code-ask');
  const go = stage.pointOn('code-go');
  await stage.glide(go, time.toButton);
  await stage.click(go, 'code-go');
  await stage.fadeOut('code', time.close);
  stage.showToast(TOASTS.signedIn);
}

async function dark(stage: ActStage) {
  await stage.wait(TIMING.dark.start);
  stage.set({ dark: true });
  await stage.wait(TIMING.dark.settle);
  await newIssue(stage);
}

async function url(stage: ActStage) {
  const time = TIMING.url;
  await stage.wait(time.start);
  stage.set({ addressSet: true });
  await stage.squish('address', ADDRESS_SQUISH.low, ADDRESS_SQUISH.high, time.squish);
  stage.showToast(TOASTS.address);
  await stage.wait(time.settle);
  await newIssue(stage);
}

async function ff(stage: ActStage) {
  const time = TIMING.ff;
  const point = stage.pointOn('new-button');
  await stage.glide(point, time.travel);
  await stage.click(point, 'new-button');
  stage.popIn('wait');
  const spinner = stage.spin();
  await stage.fill(0, SLOW_FILL, time.slow, 'linear');
  stage.popIn('ff-chip');
  spinner.speedUp(FAST_SPIN);
  await stage.fill(SLOW_FILL, 1, time.fast, 'easeIn');
  await stage.fadeOut('wait', time.close);
  spinner.stop();
  finishIssue(stage);
}

async function home(stage: ActStage) {
  await stage.glide(HOME, TIMING.home.travel);
}

export const ACTS: Record<ActKey, (stage: ActStage) => Promise<void>> = {
  zoom,
  cursor,
  logins,
  hide,
  twofa,
  dark,
  url,
  ff,
  home,
};
