import type { SfxId } from '../../../src/audio/recipes';
import type { FishShape } from '../../../src/art/fishArt';
import { mouthOf, NOSE } from '../chain';
import { suckedIn } from '../effects';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { asPose as asWorldPose, facingAt, fishAt, seamTime, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey } from '../gameplay/zoomPath';

export type { View, WorldFish };

/**
 * "Remember this perch": level 1 of the game, played as a highlight. A perch
 * snaps at you and misses; you eat your way up the tide pool's ladder
 * (minnows, then blennies), growing in spurts while the camera pulls back,
 * until the perch is the small one. It flees; you eat it. Then its dad
 * shows up, and his lunge is the perch's lunge in the first frame.
 *
 *   0     the perch's jaws snap shut just behind your tail: missed. You dash.
 *   1.2   three minnows: "Bigger!" at 2.05
 *   2.6   three blennies: "Bigger!" at 3.35
 *   3.5   the perch is smaller now: its ink lightens, "!", it flees
 *   5.1   gulp. "Bigger!" at 5.3: full size, level complete
 *   7.4   something huge rises from below; the camera pulls right back
 *   11.45 "!": the dad lunges, which is where the loop began.
 *
 * Positions are world px with the camera's target at the origin. Over the
 * loop you grow SCALE times and the camera pulls back SCALE times, so the
 * end is the start, scaled up: the dad is the perch SCALE times over.
 */
export const LOOP_S = 12;

/** Your length at each growth stage (world px): three spurts of GROWTH. */
const GROWTH = 1.65;
export const SCALE = GROWTH ** 3;
export const TIER_LEN = [170, 170 * GROWTH, 170 * GROWTH ** 2, 170 * SCALE] as const;
export const PERCH_LEN = 340;
const MINNOW_LEN = 95;
const BLENNY_LEN = 165;

export const SNAP_AT = 0.22;
export const SPURTS = [2.05, 3.35, 5.3] as const;
export const FLIP_AT = 3.5;
const FLEE_AT = 3.65;
export const SUCK_FROM = 4.85;
export const GULP_AT = 5.1;
export const DAD_FROM = 7.4;
/** You spot the dad this long before the loop comes round (and the "!" stays into the start). */
const SPOT_LEAD = 0.55;
export const SPOT_AT = LOOP_S - SPOT_LEAD;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);

const asPose = (f: WorldFish) => asWorldPose(f);

// ---------------------------------------------------------------- the camera

/** How far the camera has pulled back, 0 .. 1 over the loop (zoom is SCALE ** -phase): a little after each spurt, the rest for the reveal. */
const PULL: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: SPURTS[0] + 0.05, at: 0, rate: 0 },
  { t: SPURTS[0] + 0.85, at: 0.15, rate: 0 },
  { t: SPURTS[1] + 0.05, at: 0.15, rate: 0 },
  { t: SPURTS[1] + 0.85, at: 0.3, rate: 0 },
  { t: SPURTS[2], at: 0.3, rate: 0 },
  { t: SPURTS[2] + 0.8, at: 0.45, rate: 0 },
  { t: 8.0, at: 0.45, rate: 0 },
  { t: 11.0, at: 1, rate: 0 },
  { t: LOOP_S, at: 1, rate: 0 },
];

export const pullAt = (t: number): number => curveAt(PULL, t).at;

const cameraPath = zoomLoopPath([
  { t: 0, x: 120, y: 10 },
  { t: 1.6, x: 30, y: -60 },
  { t: 3.0, x: 180, y: -40 },
  { t: 4.5, x: 250, y: 110 },
  { t: 6.0, x: 480, y: 220 },
  { t: 7.8, x: 700, y: 300 },
  { t: 9.6, x: 760, y: 420 },
], LOOP_S, SCALE);

/** Screen px per world px before the camera pulls back. */
const BASE_ZOOM = 1.3;

export function viewAt(t: number): View {
  const c = cameraPath(t);
  return { x: c.x, y: c.y, zoom: BASE_ZOOM * SCALE ** -pullAt(t) };
}

// ---------------------------------------------------------------- the perch

/** The perch until it is eaten, then its dad (SCALE times bigger) from DAD_FROM. Turns: lunging left, then lurking, then fleeing right. */
const PERCH_KEYS: readonly PathKey[] = [
  { t: 0, x: 300, y: 92 },
  { t: SNAP_AT, x: 214, y: 50 },
  { t: 0.6, x: 120, y: 34 },
  { t: 1.0, x: 100, y: 50, vx: 0, vy: 10 },
  { t: 1.9, x: 250, y: 90 },
  { t: 2.6, x: 360, y: 110, vx: 0, vy: 0 },
  { t: 3.55, x: 345, y: 118, vx: 0, vy: 0 },
  { t: 4.2, x: 470, y: 160 },
  { t: SUCK_FROM, x: 620, y: 205 },
  { t: GULP_AT, x: 665, y: 215, vx: 170, vy: 35 },
  { t: DAD_FROM, x: SCALE * 80, y: SCALE * 800, vx: 0, vy: SCALE * -260 },
  { t: 9.2, x: SCALE * 140, y: SCALE * 430 },
  { t: 10.8, x: SCALE * 340, y: SCALE * 260 },
  { t: 11.5, x: SCALE * 400, y: SCALE * 170 },
];
const perchPath = zoomLoopPath(PERCH_KEYS, LOOP_S, SCALE);
const PERCH_TURNS = [[0, -1], [1.0, 1], [2.65, -1], [FLEE_AT, 1], [DAD_FROM, -1]] as const;

export const perchIsDad = (t: number): boolean => t >= DAD_FROM;

function perchFish(t: number): WorldFish {
  const length = perchIsDad(t) ? PERCH_LEN * SCALE : PERCH_LEN;
  return fishAt('perch', perchPath(t), length, facingAt(PERCH_TURNS, t), 2, t);
}

/** How far the perch's jaw hangs open: wide for the lunge across the seam, snapped shut on the miss. */
export function perchJaw(t: number): number {
  const u = seam(t);
  if (u < -0.75 || u > SNAP_AT) return 0;
  if (u < -0.05) return ramp(u, -0.75, -0.05);
  return u < SNAP_AT - 0.05 ? 1 : 1 - ramp(u, SNAP_AT - 0.05, SNAP_AT);
}

/** 1 drawn as a hunter (heavy ink), 0 as prey: it flips once you outgrow it. The dad is a hunter. */
export function perchMenace(t: number): number {
  return perchIsDad(t) ? 1 : 1 - ramp(t, FLIP_AT, FLIP_AT + 0.15);
}

/** The dad comes up out of the dark: 1 hidden .. 0 in plain view. */
export function perchMurk(t: number): number {
  return perchIsDad(t) ? 1 - ramp(t, 8.4, 10.0) : 0;
}

export type PerchState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly stretch: number; readonly squash: number };

export function perchAt(t: number): PerchState {
  if (t >= GULP_AT && t < DAD_FROM) return { kind: 'gone' };
  const fish = perchFish(t);
  if (t < SUCK_FROM || perchIsDad(t)) return { kind: 'swimming', fish };
  const [pose, look] = suckedIn(asPose(fish), asPose(inklingFish(t)), (t - SUCK_FROM) / (GULP_AT - SUCK_FROM));
  return { kind: 'swallowed', fish: { ...fish, x: pose.x, y: pose.y, length: pose.length, tilt: pose.tilt }, ...look };
}

// ---------------------------------------------------------------- you

/** Your length: a springy spurt at each stage-up. */
export function inklingLength(t: number): number {
  let length: number = TIER_LEN[0];
  SPURTS.forEach((at, i) => {
    const s = t - at;
    if (s <= 0) return;
    const grow = 1 - Math.exp(-9 * s) * Math.cos(15 * s);
    length = TIER_LEN[i]! * (TIER_LEN[i + 1]! / TIER_LEN[i]!) ** grow;
  });
  return length;
}

/** Where your mouth must be as the perch is sucked in: just behind its tail as it flees right. */
const CATCH = (() => {
  const p = perchPath(SUCK_FROM);
  const mouth = { x: p.x - 0.3 * PERCH_LEN, y: p.y - 6 };
  return { x: mouth.x - NOSE * TIER_LEN[2], y: mouth.y - 12 };
})();

const INKLING_KEYS: readonly PathKey[] = [
  { t: 0, x: 40, y: 30 },
  { t: 0.35, x: -110, y: 4 },
  { t: 0.8, x: -250, y: -55 },
  { t: 1.2, x: -310, y: -130 },
  { t: 1.55, x: -285, y: -245 },
  { t: 1.9, x: -195, y: -325 },
  { t: 2.3, x: -70, y: -370 },
  { t: 2.6, x: 30, y: -380 },
  { t: 2.95, x: 165, y: -345 },
  { t: 3.3, x: 270, y: -265 },
  { t: 3.8, x: 210, y: -110 },
  { t: 4.35, x: CATCH.x - 230, y: CATCH.y - 80 },
  { t: SUCK_FROM, ...CATCH },
  { t: GULP_AT, x: CATCH.x + 75, y: CATCH.y + 15 },
  { t: 5.7, x: CATCH.x + 190, y: CATCH.y + 30 },
  { t: 6.9, x: 640, y: 300 },
  { t: 8.1, x: 830, y: 282 },
  { t: 9.4, x: 860, y: 262 },
  { t: 10.8, x: SCALE * 175, y: SCALE * 55 },
  { t: 11.45, x: SCALE * 122, y: SCALE * 48 },
];
const inklingPath = zoomLoopPath(INKLING_KEYS, LOOP_S, SCALE);
const INKLING_TURNS = [[0, -1], [1.35, 1], [8.4, -1]] as const;

export function inklingFish(t: number): WorldFish {
  return fishAt('inkling', inklingPath(t), inklingLength(t), facingAt(INKLING_TURNS, t), 3, t);
}

// ---------------------------------------------------------------- the snacks

/** Prey are dragged into your mouth over this long before each gulp. */
const SUCK = 0.18;

interface Snack {
  readonly shape: FishShape;
  readonly length: number;
  /** When you gulp it. */
  readonly at: number;
  /** Swims in over [enter, enter + 0.9] from this far off (world px). */
  readonly enter: number;
  readonly from: { readonly x: number; readonly y: number };
}

const SNACKS: readonly Snack[] = [
  { shape: 'minnow', length: MINNOW_LEN, at: 1.2, enter: 0.2, from: { x: -650, y: 120 } },
  { shape: 'minnow', length: MINNOW_LEN, at: 1.55, enter: 0.3, from: { x: -620, y: 30 } },
  { shape: 'minnow', length: MINNOW_LEN, at: 1.9, enter: 0.45, from: { x: -600, y: -80 } },
  { shape: 'blenny', length: BLENNY_LEN, at: 2.6, enter: 1.3, from: { x: 700, y: -300 } },
  { shape: 'blenny', length: BLENNY_LEN, at: 2.95, enter: 1.45, from: { x: 680, y: -200 } },
  { shape: 'blenny', length: BLENNY_LEN, at: 3.3, enter: 1.6, from: { x: 650, y: -60 } },
];
export const MEALS = [...SNACKS.map((s) => s.at), GULP_AT] as const;

/** Where a snack waits: just in front of your mouth at the moment the suction starts. */
const waitAt = SNACKS.map((s) => {
  const you = asPose(inklingFish(s.at - SUCK));
  const m = mouthOf(you);
  return { x: m.x + you.facing * Math.cos(you.tilt) * 0.1 * you.length, y: m.y - Math.sin(you.tilt) * 0.1 * you.length };
});

export type SnackState =
  | { readonly kind: 'swimming'; readonly fish: WorldFish; readonly alpha: number }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly stretch: number; readonly squash: number };

export function snacksAt(t: number): SnackState[] {
  const out: SnackState[] = [];
  SNACKS.forEach((s, i) => {
    if (t < s.enter || t >= s.at) return;
    const wait = waitAt[i]!;
    const arrive = smooth((t - s.enter) / 0.9);
    // Swims in fast and eases to a stop, then idles in place.
    const idle = { x: 8 * Math.sin(5 * t + i), y: 6 * Math.sin(3.7 * t + 2 * i) };
    const x = wait.x + s.from.x * (1 - arrive) + idle.x * arrive;
    const y = wait.y + s.from.y * (1 - arrive) + idle.y * arrive;
    const facing: 1 | -1 = s.from.x < 0 ? 1 : -1;
    const fish: WorldFish = {
      shape: s.shape, x, y, length: s.length, facing, tilt: 0.25 * Math.sin(2 * t + i) * arrive,
      beat: 2 * Math.PI * 4 * t, effort: 1 - 0.6 * arrive,
    };
    if (t < s.at - SUCK) {
      out.push({ kind: 'swimming', fish, alpha: clamp01((t - s.enter) / 0.1) });
      return;
    }
    const [pose, look] = suckedIn(asPose(fish), asPose(inklingFish(t)), (t - (s.at - SUCK)) / SUCK);
    out.push({ kind: 'swallowed', fish: { ...fish, x: pose.x, y: pose.y, length: pose.length, tilt: pose.tilt }, ...look });
  });
  return out;
}

/** Your jaw: open for each snack, wide for the perch, shut on each gulp. */
export function inklingJaw(t: number): number {
  let open = 0;
  for (const s of SNACKS) {
    if (t > s.at - 0.25 && t < s.at + 0.04) open = Math.max(open, t < s.at ? 0.75 * ramp(t, s.at - 0.25, s.at - SUCK) : 0.75 * (1 - ramp(t, s.at, s.at + 0.04)));
  }
  if (t > SUCK_FROM - 0.3 && t < GULP_AT + 0.05) open = Math.max(open, t < GULP_AT ? ramp(t, SUCK_FROM - 0.3, SUCK_FROM) : 1 - ramp(t, GULP_AT, GULP_AT + 0.05));
  // Two chews on the perch.
  for (const c of [GULP_AT + 0.3, GULP_AT + 0.65]) if (t > c && t < c + 0.18) open = Math.max(open, 0.2 * Math.sin((Math.PI * (t - c)) / 0.18));
  return open;
}

/** Water rushing into your mouth as the perch goes in, 0 .. 1. */
export function suction(t: number): number {
  return t >= SUCK_FROM - 0.3 && t < GULP_AT ? ramp(t, SUCK_FROM - 0.3, SUCK_FROM) : 0;
}

/** The perch going down. */
export function inklingLump(t: number): { readonly size: number; readonly at: number } {
  if (t < GULP_AT || t > 7.6) return { size: 0, at: 0.2 };
  return { size: Math.min(1, (t - GULP_AT) / 0.1) * (1 - ramp(t, 6.4, 7.6)), at: lerp(0.2, 0.55, ramp(t, GULP_AT, 6.8)) };
}

export function inklingEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= GULP_AT - 0.01 && t < GULP_AT + 0.25) return 'squeeze';
  if (t >= GULP_AT + 0.25 && t < 7.4) return 'happy';
  return null;
}

/** The jolt as a gulp lands: 0 .. 1. */
export function gulpSnap(t: number): number {
  for (const at of MEALS) if (t > at - 0.02 && t < at + 0.12) return Math.sin((Math.PI * (t - at + 0.02)) / 0.14) * (at === GULP_AT ? 1 : 0.5);
  return 0;
}

// ---------------------------------------------------------------- "!", "Bigger!", the HUD

/** An inked "!" popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - ((since - 0.12) / 0.06));
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** Your "!" as the dad lunges, staying up as the loop comes round. */
export const inklingAlarm = (t: number): number => pop(seam(t) + SPOT_LEAD, SPOT_LEAD + 0.85);
/** The perch's "!" when it sees you are bigger now. */
export const perchAlarm = (t: number): number => pop(t - FLIP_AT - 0.05, 0.8);

/** The game's "Bigger!" over you at each spurt: how far it has risen (0 .. 1) and how visible it is, or null. */
export function biggerText(t: number): { readonly rise: number; readonly alpha: number } | null {
  for (const at of SPURTS) {
    const s = t - at;
    if (s >= 0 && s < 0.7) return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, s / 0.08) * (1 - ramp(s, 0.45, 0.7)) };
  }
  return null;
}

/** The growth bar, like the game's: how full (eases up with each meal) and how visible (hidden at the seam). */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const steps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1];
  let fill = 0;
  MEALS.forEach((at, i) => {
    fill = lerp(fill, steps[i]!, ramp(t, at, at + 0.2));
  });
  return { fill, alpha: window01(t, 0.35, 8.0, 0.4) };
}
/** Where the bar marks each growth stage. */
export const BAR_MARKS = [0.3, 0.6] as const;

/** Camera shake, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const jolts = [{ at: SNAP_AT, amp: 10 }, { at: SPURTS[0], amp: 6 }, { at: SPURTS[1], amp: 6 }, { at: GULP_AT, amp: 16 }, { at: SPURTS[2], amp: 8 }];
  let x = 0;
  let y = 0;
  for (const j of jolts) {
    const s = t - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] seconds, fading at both ends; may run past the loop's ends, wrapping round. */
  readonly from: number;
  readonly to: number;
}

const PAYOFF = { from: 5.95, to: 8.1 };
export const CAPTIONS: readonly Caption[] = [
  { text: 'remember this perch…', y: 360, size: 108, from: -0.45, to: 2.2 },
  { text: 'should’ve eaten me', y: 350, size: 100, ...PAYOFF },
  { text: 'when you had the chance', y: 455, size: 100, ...PAYOFF },
  { text: 'then his dad showed up', y: 360, size: 104, from: 8.6, to: 11.3 },
];

const CAPTION_FADE = 0.25;

/** How visible a caption is at time t, 0 .. 1, counting its copies a loop before and after (so it can span the seam). */
export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, CAPTION_FADE)));
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  // The miss: jaws clack shut behind you, and you're off.
  { id: 'eat', t: SNAP_AT, pitch: 0.45, gain: 0.7, pan: 0.2 },
  { id: 'clang', t: SNAP_AT, pitch: 0.5, gain: 0.12, pan: 0.2 },
  // The snacks: a plip, then the frenzy climbing (as the game plays them), and a growth spurt after each three.
  ...SNACKS.map((s, i): SoundCue => (i % 3 === 0
    ? { id: 'eat', t: s.at, pitch: i === 0 ? 1.55 : 1.3, gain: 0.7, pan: -0.2 }
    : { id: 'frenzy', t: s.at, pitch: 0.9 + (i % 3 + 1) * 0.1, gain: 0.55, pan: -0.1 })),
  ...SPURTS.map((at): SoundCue => ({ id: 'grow', t: at, pitch: 1, gain: 0.75, pan: 0 })),
  // The perch sees you've grown, and bolts.
  { id: 'spotted', t: FLIP_AT + 0.05, pitch: 1.3, gain: 0.5, pan: 0.3 },
  { id: 'dash', t: FLEE_AT, pitch: 0.9, gain: 0.4, pan: 0.3 },
  { id: 'dash', t: 4.0, pitch: 1, gain: 0.4, pan: 0.1 },
  { id: 'suck', t: SUCK_FROM - 0.3, pitch: 0.8, gain: 0.6, pan: 0.2 },
  { id: 'lunge', t: SUCK_FROM - 0.1, pitch: 0.8, gain: 0.8, pan: 0.2 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.75, gain: 1, pan: 0.2 },
  { id: 'eat', t: GULP_AT + 0.33, pitch: 0.6, gain: 0.45, pan: 0.2 },
  { id: 'eat', t: GULP_AT + 0.68, pitch: 0.6, gain: 0.35, pan: 0.2 },
  { id: 'win', t: SPURTS[2] + 0.15, pitch: 1, gain: 0.5, pan: 0 },
  // Something enormous coming up from below.
  { id: 'lunge', t: 8.0, pitch: 0.45, gain: 0.5, pan: 0.2 },
  { id: 'lunge', t: 9.4, pitch: 0.4, gain: 0.45, pan: 0.2 },
  { id: 'spotted', t: SPOT_AT, pitch: 1.4, gain: 0.5, pan: -0.1 },
  { id: 'lunge', t: SPOT_AT + 0.15, pitch: 0.55, gain: 0.9, pan: 0.2 },
  { id: 'dash', t: SPOT_AT + 0.3, pitch: 1.1, gain: 0.45, pan: -0.2 },
];
