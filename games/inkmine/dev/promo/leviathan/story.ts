import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { boilAt as kitBoilAt } from '../sprites';
import { said } from './words';

/**
 * "Never Drill Near This", narrated: every beat as a pure function of loop
 * time, cut on the words (words.ts). The file opens on the end of the chase
 * (the mouth, the tiny prospector): "NEVER drill near this thing", and on
 * "thing" the slam the game really does (its body hits you and throws you;
 * it never swallows anyone). "It's the Leviathan, asleep in a flooded cave"
 * is the sleeper close, pulling back to the shaft over its head; "Every block
 * you drill makes noise" and each "One more…" take a block and jump the bar.
 * "Its eye opens!" cuts in on the eye. "You can't hurt it" is the lights
 * coming up, "You can only RUN!" the charge, and "So, a little advice:" lands
 * on the frame-1 mouth with the CTA, the loop's first line finishing it.
 */
export const LOOP_S = 15;

/** Word indices in WORDS that beats are cut on. */
const W = { thing: 4, its: 5, block: 14, drill: 16, noise: 18, more1: 20, more2: 22, itsEye: 23, eye: 24, opens: 25, cant: 26, run: 30, so: 34 } as const;

/** The body meets the prospector on "thing". */
export const HIT_AT = said(W.thing);
export const SLAM_AT = HIT_AT - 0.22;
export const CAVE_AT = SLAM_AT + 0.85;
export const EYE_AT = said(W.itsEye);
export const WAKE_AT = said(W.cant);
export const CHARGE_AT = said(W.run);
/** "So, a little advice:": the charge has grown into the held mouth. */
export const CHASE_AT = said(W.so);

/** The five blocks: on "block", "drill" and "noise", then each "more…", the bar jumping with every one. */
export const BLOCKS_AT: readonly number[] = [said(W.block), said(W.drill), said(W.noise), said(W.more1), said(W.more2)];
/** The prospector starts work as the pull-back ends. */
export const DIG_FROM = said(W.block) - 0.55;
/** Two blocks are already dug when we arrive, so the bar starts part way (each adds the game's 0.14). */
export const NOISE_START = 0.28;
export const NOISE_PER_BLOCK = 0.144;

/** The upper lid: shut through "Its", a twitch on "eye", wide on "opens!". */
export const EYE_TWITCH_AT = said(W.eye);
export const EYE_OPEN_AT = said(W.opens);
export const EYE_OPEN_S = 0.3;

/** The CTA: the last 3.0 s, gone 0.6 s before the loop point. */
export const CTA_FROM = LOOP_S - 3;
export const CTA_TO = LOOP_S - 0.6;
export const CTA_FADE_S = 0.3;

/** The hook caption: up on frame 1 through the line it says, back only after the CTA has left. */
export const HOOK_OFF_AT = said(W.its) - 0.5;
export const HOOK_OFF_S = 0.2;
export const HOOK_BACK_AT = LOOP_S - 0.55;
export const HOOK_BACK_S = 0.3;

export type Scene = 'chase' | 'slam' | 'cave' | 'eye' | 'wake';

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => kitBoilAt(wrap(t));

export function sceneAt(time: number): Scene {
  const t = wrap(time);
  if (t < SLAM_AT) return 'chase';
  if (t < CAVE_AT) return 'slam';
  if (t < EYE_AT) return 'cave';
  if (t < WAKE_AT) return 'eye';
  if (t < CHARGE_AT) return 'wake';
  return 'chase';
}

/** The chase's own clock: it runs on past the loop's end into the file's first half second, so nothing jumps at the seam. */
export const chaseClock = (time: number): number => {
  const t = wrap(time);
  return t < SLAM_AT ? t + LOOP_S : t;
};

/** How far the chase runs past frame 1 before the cut to the slam. */
const OVERRUN = LOOP_S + SLAM_AT;

const HEAD_SCALE: readonly Key[] = [
  { t: CHARGE_AT, at: 0.3, rate: 0.2 }, { t: CHARGE_AT + 0.5, at: 0.52 }, { t: CHASE_AT, at: 0.88 }, { t: 14.2, at: 0.94 }, { t: LOOP_S, at: 1, rate: 0.09 }, { t: OVERRUN, at: 1.16, rate: 0.16 },
];
const HEAD_X: readonly Key[] = [
  { t: CHARGE_AT, at: 350, rate: 0 }, { t: CHARGE_AT + 0.5, at: 450 }, { t: CHASE_AT, at: 545 }, { t: 14.2, at: 525 }, { t: LOOP_S, at: 540, rate: 0 }, { t: OVERRUN, at: 540, rate: 0 },
];
const HEAD_Y: readonly Key[] = [
  { t: CHARGE_AT, at: 660, rate: 0 }, { t: CHARGE_AT + 0.5, at: 830 }, { t: CHASE_AT, at: 1030 }, { t: 14.2, at: 1050 }, { t: LOOP_S, at: 1060, rate: 0 }, { t: OVERRUN, at: 1066, rate: 0 },
];
const GAPE: readonly Key[] = [
  { t: CHARGE_AT, at: 0.1, rate: 0 }, { t: CHARGE_AT + 0.75, at: 0.8 }, { t: CHASE_AT + 0.1, at: 1, rate: 0 }, { t: LOOP_S, at: 1, rate: 0 }, { t: OVERRUN, at: 1, rate: 0 },
];

export interface HeadPose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** How far the mouth is open (0..1); frame 1 is 1. */
  readonly gape: number;
  /** How bright the lights and eyes are (0..1). */
  readonly lit: number;
}

/** A slow breath in the jaw while it holds wide, whole cycles of the loop so it closes. */
const breath = (c: number): number => 0.5 + 0.5 * Math.cos((c - LOOP_S) * ((2 * Math.PI) / 1.5));

export function headAt(time: number): HeadPose {
  const c = chaseClock(time);
  const gape = curveAt(GAPE, c).at;
  return {
    x: curveAt(HEAD_X, c).at,
    y: curveAt(HEAD_Y, c).at,
    scale: curveAt(HEAD_SCALE, c).at,
    gape: clamp01(gape) * (1 - 0.018 * (1 - breath(c))),
    lit: 0.72 + 0.28 * ramp(c, CHARGE_AT, CHASE_AT) * (0.82 + 0.18 * breath(c)),
  };
}

// Above y 1000 while the CTA is up, so the lines under them stay clear.
const FLEE_X: readonly Key[] = [
  { t: CHARGE_AT, at: 780, rate: -60 }, { t: CHASE_AT, at: 480 }, { t: 14.2, at: 640 }, { t: LOOP_S, at: 560, rate: -40 }, { t: OVERRUN, at: 640, rate: 120 },
];
const FLEE_Y: readonly Key[] = [
  { t: CHARGE_AT, at: 800, rate: 0 }, { t: CHASE_AT, at: 870 }, { t: 14.2, at: 830 }, { t: LOOP_S, at: 960, rate: 40 }, { t: OVERRUN, at: 990, rate: 20 },
];

export interface Flee {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly facing: 1 | -1;
}

/** The prospector running from it, the camera tracking them, so they stay one size while it grows behind them. */
export function fleeAt(time: number): Flee {
  const c = chaseClock(time);
  const x = curveAt(FLEE_X, c);
  const y = curveAt(FLEE_Y, c);
  const bob = Math.sin((c - LOOP_S) * ((2 * Math.PI) / 0.75)) * 5;
  return { x: x.at, y: y.at + bob, tilt: 0.34 + clampTilt(y.rate / 900) + clampTilt(x.rate / 2600), facing: 1 };
}

const clampTilt = (v: number): number => Math.max(-0.28, Math.min(0.28, v));

/** The camera shake while it charges (px). Everything is a function of the chase clock, so it carries over the seam. */
export function shakeAt(time: number): { x: number; y: number } {
  const s = sceneAt(time);
  if (s === 'eye' || s === 'cave') return { x: 0, y: 0 };
  const t = wrap(time);
  if (s === 'slam') {
    const k = 34 * Math.exp(-Math.max(0, t - HIT_AT) * 6) * ramp(t, HIT_AT - 0.02, HIT_AT);
    return { x: k * Math.sin(t * 91), y: k * Math.cos(t * 73) };
  }
  if (s === 'wake') {
    const k = 3 + 8 * ramp(t, WAKE_AT, CHARGE_AT);
    return { x: k * Math.sin(t * 57), y: k * Math.cos(t * 43) };
  }
  const c = chaseClock(time);
  // It steadies for the beat around the loop point, so frame 1 is sharp and the last frame lands on it.
  const steady = lerp(0.05, 1, ramp(Math.abs(c - LOOP_S), 0.04, 0.32));
  const k = steady * (7 + 12 * ramp(c, CHARGE_AT, CHASE_AT) * (0.75 + 0.25 * breath(c)) + 10 * ramp(c, LOOP_S, OVERRUN));
  return { x: k * Math.sin(c * 41), y: k * Math.cos(c * 53) };
}

/** The camera in the cave: close on the sleeper for "asleep in a flooded cave", back to the whole shot for the first block, a slow push from there. */
const CAVE_ZOOM: readonly Key[] = [
  { t: CAVE_AT, at: 1.58, rate: -0.03 }, { t: DIG_FROM - 0.7, at: 1.46 }, { t: DIG_FROM, at: 1, rate: 0 }, { t: WAKE_AT + 1.2, at: 1.05, rate: 0 },
];
export function caveCameraAt(time: number): { zoom: number; x: number; y: number } {
  const t = wrap(time);
  const zoom = curveAt(CAVE_ZOOM, t).at;
  const back = ramp(t, DIG_FROM - 0.7, DIG_FROM);
  return { zoom, x: lerp(640, 556, back), y: lerp(1078, 950, back) };
}

/** The noise bar comes up as the drill starts. */
export const barAt = (time: number): number => ramp(wrap(time), DIG_FROM - 0.15, DIG_FROM + 0.15);

/** Noise (0..1): the bar's fill, up a step with each block, as drill.ts's blocks are counted by the game. */
export const blockT = (at: number, t: number): number => ramp(t, at, at + 0.16);

export function noiseAt(time: number): number {
  const t = wrap(time);
  return NOISE_START + NOISE_PER_BLOCK * BLOCKS_AT.reduce((sum, at) => sum + blockT(at, t), 0);
}

/** How many of the five blocks are gone. */
export const blocksGone = (time: number): number => BLOCKS_AT.filter((at) => wrap(time) >= at).length;

/** The prospector's depth in the shaft (rows dug), dropping onto the next block as each gives; the drill's work on the block under them (0..1). */
export function digAt(time: number): { row: number; work: number } {
  const t = wrap(time);
  const row = BLOCKS_AT.reduce((sum, at) => sum + ramp(t, at + 0.02, at + 0.24), 0);
  const gone = BLOCKS_AT.filter((at) => t >= at).length;
  if (gone >= BLOCKS_AT.length) return { row, work: 0 };
  const from = gone === 0 ? DIG_FROM : BLOCKS_AT[gone - 1]! + 0.24;
  return { row, work: clamp01((t - from) / (BLOCKS_AT[gone]! - from)) };
}

/** After the last block: the drill stops, the prospector still. */
export const hushAt = (time: number): number => ramp(wrap(time), BLOCKS_AT[4]! + 0.05, BLOCKS_AT[4]! + 0.2);

/** How far open the eye is (0..1), lifted in a twitch and then wide. */
export function eyeOpenAt(time: number): number {
  const t = wrap(time);
  const twitch = 0.12 * window01(t, EYE_TWITCH_AT, EYE_TWITCH_AT + 0.16, 0.06);
  return Math.max(twitch, ramp(t, EYE_OPEN_AT, EYE_OPEN_AT + EYE_OPEN_S));
}

/** The slow push in on the eye. */
export const eyeZoomAt = (time: number): number => lerp(1, 1.1, smooth((wrap(time) - EYE_AT) / (WAKE_AT - EYE_AT)));

/** How far along the flank the lights have come, head to tail (0..1). */
export const lightsAt = (time: number): number => ramp(wrap(time), WAKE_AT, CHARGE_AT - 0.12);

/** The slam, seconds after the hit: the body's nose (px on screen), and the thrown prospector. */
export function slamAt(time: number): { nose: number; thrown: { x: number; y: number; spin: number } | null; flash: number } {
  const t = wrap(time);
  const nose = lerp(380, 1560, clamp01((t - SLAM_AT) / (CAVE_AT - SLAM_AT)));
  const after = t - HIT_AT;
  const thrown = after <= 0 ? null : { x: 690 + 760 * after, y: 900 - 1250 * after + 900 * after * after, spin: after * 13 };
  return { nose, thrown, flash: after >= 0 ? Math.exp(-after * 11) : 0 };
}

/** The dark dip between the slam and the quiet. */
export const darkAt = (time: number): number => {
  const t = wrap(time);
  return window01(t, CAVE_AT - 0.3, CAVE_AT + 0.28, 0.2);
};

export const ctaAt = (time: number): number => window01(wrap(time), CTA_FROM, CTA_TO, CTA_FADE_S);

/** How much of the arrow is drawn (0..1). */
export const arrowAt = (time: number): number => (wrap(time) < CTA_TO ? ramp(wrap(time), CTA_FROM + 0.15, CTA_FROM + 0.65) : 0);

export function hookAt(time: number): number {
  const t = wrap(time);
  return Math.max(1 - ramp(t, HOOK_OFF_AT, HOOK_OFF_AT + HOOK_OFF_S), ramp(t, HOOK_BACK_AT, HOOK_BACK_AT + HOOK_BACK_S));
}
