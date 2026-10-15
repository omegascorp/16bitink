import type { SfxId } from '../../../src/audio/recipes';
import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { growthStages, stagesFor } from '../../../src/levels/generate';
import { scoreFor } from '../../../src/logic/sizing';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { facingAt, fishAt, seamTime, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey, type PathPoint } from '../gameplay/zoomPath';
import { lipsOf } from './swimmer';

export type { View, WorldFish };

/**
 * "How did that fit": chapter 8 (the midnight zone), played as a highlight.
 * You are the viperfish, whose ability is `gape` (logic/abilities.ts:
 * canSwallow lets it eat a 'peer', a fish up to 1.1 times its own size).
 * A fangtooth its own size comes for its lure; the viper lunges with its
 * jaw swung open impossibly wide, gets it half way in, heaves, and swallows
 * it whole. Its belly balloons; "Bigger!". Then the next fangtooth, as big
 * as the bigger viper, drifts out of the dark to the lure, and the viper
 * lunges again, which is the first frame.
 *
 *   0     mid-lunge: the jaw swinging open, the fangtooth's "!" (hook up)
 *   0.3   water rushes in; the fangtooth is dragged to the lips
 *   0.75  head first into the jaws; stuck half way, tail thrashing
 *   1.9   heave, 2.8 heave, 3.65 heave: eyes squeezed, the belly filling
 *   4.55  the last slurp
 *   4.9   GULP: jaws snap shut, the belly balloons, "+360" (payoff, 41%)
 *   5.1   "how did that fit"; two chews, eyes smiling shut
 *   5.6   "Bigger!": the next growth stage; the camera pulls back after it
 *   8.3   a bigger fangtooth glides in out of the dark towards the lure
 *   9.0   "always room for dessert"
 *   11.35 "!": it sees the teeth; 11.6 the viper strikes, which is frame 1.
 *
 * Positions are world px (game px: fish sized as the game sizes them) with
 * the camera's zoom centred on the world's origin. Over the loop the viper
 * grows one growth stage (SCALE times) and the camera pulls back SCALE
 * times, so the end is the start, scaled up.
 */
export const LOOP_S = 12;

// ---------------------------------------------------------------- sizes, as the game has them

/** A mid-chapter level of chapter 8: final size 63 (content/paid.ts ramps 56 .. 71.5 over the chapter). */
export const FINAL_SIZE = 63;
const STAGES = growthStages(100, FINAL_SIZE, stagesFor(8));
/** The game's size step between growth stages: one stage-up over the loop. */
export const SCALE = (FINAL_SIZE / STAGES.playerSizes[0]!) ** (1 / (stagesFor(8) - 1));
/** The viper at its third stage, and the fangtooth: the smallest chapter 8 spawns (36 .. 54), a touch bigger than you. */
export const VIPER_SIZE = STAGES.playerSizes[0]! * SCALE ** 2;
export const FANG_SIZE = 36;

/** How long the game draws a fish of this size: its sprite scales by size / FISH_RADIUS. */
export const drawnLength = (shape: 'viperfish' | 'fangtooth', size: number): number => (size / FISH_RADIUS) * 2 * bodyProportions(shape).hl;
export const VIPER_LEN = drawnLength('viperfish', VIPER_SIZE);
export const FANG_LEN = drawnLength('fangtooth', FANG_SIZE);

export const SUCK_FROM = 0.3;
export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const DESSERT_FROM = 8.3;
/** The fangtooth sees the teeth, and the viper strikes: just before the loop comes round. */
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.6;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);

/** One growth stage: SCALE times bigger from the spurt on. */
const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);

// ---------------------------------------------------------------- the viper

/** Its length: a springy spurt at the stage-up. */
export function viperLength(t: number): number {
  const s = t - SPURT;
  if (s <= 0) return VIPER_LEN;
  return VIPER_LEN * SCALE ** (1 - Math.exp(-8 * s) * Math.cos(13 * s));
}

/** The viper's swim, in its starting lengths: a lunge, a tussle that barely moves, then a slow drift until it strikes again. */
const V = VIPER_LEN;
/** Where it starts, so that the end (SCALE times further out) is where its drift has taken it. */
const X0 = (1.62 * V) / (SCALE - 1);
const VIPER_KEYS: readonly PathKey[] = [
  { t: 0, x: X0, y: 0, vx: 1.55 * V, vy: -0.12 * V },
  { t: 0.55, x: X0 + 0.5 * V, y: -0.04 * V, vx: 0.35 * V, vy: 0 },
  { t: 1.2, x: X0 + 0.62 * V, y: -0.02 * V },
  { t: 2.4, x: X0 + 0.58 * V, y: 0.03 * V },
  { t: 3.6, x: X0 + 0.66 * V, y: 0.0 },
  { t: GULP_AT, x: X0 + 0.8 * V, y: -0.04 * V, vx: 0.2 * V, vy: 0 },
  { t: 6.4, x: X0 + 0.98 * V, y: 0.02 * V },
  { t: 8.4, x: X0 + 1.18 * V, y: 0.05 * V },
  { t: 10.2, x: X0 + 1.3 * V, y: 0.02 * V, vx: 0, vy: 0 },
  { t: STRIKE_AT, x: X0 + 1.26 * V, y: 0.0, vx: 0, vy: 0 },
];
const viperPath = zoomLoopPath(VIPER_KEYS, LOOP_S, SCALE);

/** A loop path followed past the loop's ends, scaled as the camera's zoom repeats. */
function unwrapped(path: (t: number) => PathPoint, t: number): PathPoint {
  let k = Math.floor(t / LOOP_S);
  // Rounding can land a hair before the seam on the seam itself: count that as the next loop.
  if (t - k * LOOP_S >= LOOP_S) k += 1;
  const p = path(Math.max(0, t - k * LOOP_S));
  const s = SCALE ** k;
  return { x: p.x * s, y: p.y * s, vx: p.vx * s, vy: p.vy * s };
}

export function viperFish(t: number): WorldFish {
  return fishAt('viperfish', viperPath(t), viperLength(t), 1, 2, t);
}

/** The jaw: swinging open through the strike, held wide on the tussle (straining, wider at each heave), shut on the gulp, two chews. */
export function viperJaw(t: number): number {
  const u = seam(t);
  if (u >= -0.45 && u < 0.3) return 3 * smooth((u + 0.45) / 0.75);
  if (t >= 0.3 && t < GULP_AT) {
    const strain = 2.85 + 0.07 * Math.sin(2 * Math.PI * 5 * t);
    const heave = Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.1) / 0.4)))) * 0.25;
    const slurp = 0.25 * ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.1);
    return lerp(3, strain + Math.max(heave, slurp), ramp(t, 0.3, 0.6));
  }
  // Snapped shut on the gulp, then two chews.
  let open = t < GULP_AT + 0.1 ? 3.1 * (1 - ramp(t, GULP_AT, GULP_AT + 0.07)) : 0;
  for (const c of [GULP_AT + 0.35, GULP_AT + 0.75]) if (t > c && t < c + 0.2) open = Math.max(open, 0.35 * Math.sin((Math.PI * (t - c)) / 0.2));
  return open;
}

/** Water rushing into the mouth: the strike and the last slurp. */
export function suction(t: number): number {
  const u = seam(t);
  if (u > -0.1 && u < BITE_AT) return Math.min(ramp(u, -0.1, 0.15), 1 - ramp(u, BITE_AT - 0.15, BITE_AT));
  if (t > SLURP_AT - 0.1 && t < GULP_AT) return ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.05);
  return 0;
}

/** How far the fangtooth is in, as a share of its length past the lips: in at the bite, a step at each heave (slipping back between), all of it on the gulp. */
export function insertion(t: number): number {
  if (t < BITE_AT || t >= GULP_AT) return t >= GULP_AT ? 1 : 0;
  let d = 0.28 * ramp(t, BITE_AT, BITE_AT + 0.3);
  for (const h of HEAVES) d += 0.12 * ramp(t, h, h + 0.2) - 0.02 * ramp(t, h - 0.5, h - 0.1);
  return d + (1.02 - d) * ramp(t, SLURP_AT, GULP_AT) ** 1.4;
}

/** The fangtooth in the belly: the swelling's size (0 .. ~1.3: 2.3 times as deep, as deep as a fangtooth), centre and length, in body lengths. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (t < GULP_AT) {
    const inside = Math.max(0, insertion(t) * FANG_LEN - hinge * VIPER_LEN) / VIPER_LEN;
    return { size: Math.min(1, inside * 3.2) * 1.0, at: hinge + 0.05 + inside * 0.4, width: 0.18 + inside * 0.9 };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 1.3 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.42, 0.5, ramp(t, GULP_AT, 6)), width: 0.56 };
}

export function viperEyes(t: number): 'squeeze' | 'happy' | null {
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  if (t >= GULP_AT + 0.3 && t < 7.6) return 'happy';
  return null;
}

/** The jolt of a heave or the gulp: 0 .. 1. */
export function gulpSnap(t: number): number {
  for (const [at, k] of [...HEAVES.map((h) => [h + 0.1, 0.5] as const), [GULP_AT, 1] as const]) {
    if (t > at - 0.02 && t < at + 0.14) return k * Math.sin((Math.PI * (t - at + 0.02)) / 0.16);
  }
  return 0;
}

/** The lure's brightness: steady, twitching as it lures the fangtooth in, flaring as it strikes. */
export function lureGlow(t: number): number {
  const twitch = window01(t, 9.0, STRIKE_AT, 0.4) * 0.35 * Math.max(0, Math.sin(2 * Math.PI * 1.5 * t)) ** 3;
  return 0.85 + twitch;
}

// ---------------------------------------------------------------- the fangtooth

/** Where the fangtooth swims while it is free, relative to the viper, in the viper's length at the time: in from the right to the lure, then backing off. */
const FANG_REL = [
  { t: 0, dx: 0.98, dy: 0.1 },
  { t: 0.22, dx: 1.02, dy: 0.1 },
  { t: DESSERT_FROM, dx: 1.6, dy: -0.22 },
  { t: 9.6, dx: 1.36, dy: -0.12 },
  { t: 10.8, dx: 1.2, dy: -0.02 },
  { t: SPOT_AT, dx: 1.02, dy: 0.06 },
  { t: 11.75, dx: 1.06, dy: 0.1 },
] as const;
const FANG_KEYS: readonly PathKey[] = FANG_REL.map((k) => {
  const p = viperPath(k.t);
  const len = VIPER_LEN * stageOf(k.t);
  return { t: k.t, x: p.x + k.dx * len, y: p.y + k.dy * len };
});
const fangPath = zoomLoopPath(FANG_KEYS, LOOP_S, SCALE);
const FANG_TURNS = [[0, -1]] as const;

export const fangIsDessert = (t: number): boolean => t >= DESSERT_FROM;

function freeFang(t: number): WorldFish {
  const f = fishAt('fangtooth', fangPath(t), FANG_LEN * stageOf(t), facingAt(FANG_TURNS, t), 3, t);
  return { ...f, effort: Math.max(f.effort, 0.35) };
}

/** A point of the viper's drawing (texture px, facing right) in the world: its head, which doesn't bend. */
function onViper(v: WorldFish, tex: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
  const k = v.length / (2 * bodyProportions('viperfish').hl);
  const lx = (tex.x - 128) * k;
  const ly = (tex.y - 128) * k;
  const c = Math.cos(-v.tilt);
  const s = Math.sin(-v.tilt);
  return { x: v.x + v.facing * (lx * c - ly * s), y: v.y + lx * s + ly * c };
}

/** The fangtooth `d` of its length into the viper's mouth, head first, squeezed to fit the gape. */
function fangIn(t: number, d: number): WorldFish {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const dist = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  const u = { x: (hinge.x - mid.x) / dist, y: (hinge.y - mid.y) / dist };
  // Its nose is d into the throat; its centre half a length back out.
  const back = (0.5 - d) * FANG_LEN;
  const thrash = 0.08 * Math.sin(2 * Math.PI * 3 * t + 1);
  return {
    shape: 'fangtooth',
    x: mid.x - u.x * back,
    y: mid.y - u.y * back,
    length: FANG_LEN,
    facing: -1,
    tilt: Math.atan2(-u.y, -u.x) + thrash * (1 - d),
    beat: 2 * Math.PI * 3 * t * 1.6,
    effort: 1,
  };
}

export type FangState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

/** How the fangtooth is squeezed in the jaws: deep as the gape is wide. */
const SQUEEZE = 0.74;

export function fangAt(t: number): FangState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  if (t < SUCK_FROM || fangIsDessert(t)) return { kind: 'swimming', fish: freeFang(t) };
  if (t < BITE_AT) {
    // Dragged from where it was to the lips.
    const e = ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6;
    const from = freeFang(t);
    const to = fangIn(t, 0);
    return {
      kind: 'swallowed',
      fish: { ...to, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), tilt: lerp(from.tilt, to.tilt, e), beat: from.beat },
      squash: lerp(1, SQUEEZE, e),
      stretch: 1 + 0.08 * e,
    };
  }
  return { kind: 'swallowed', fish: fangIn(t, insertion(t)), squash: SQUEEZE, stretch: 1.08 };
}

/** The dessert comes up out of the dark: 1 hidden .. 0 in plain view. */
export function fangMurk(t: number): number {
  return fangIsDessert(t) ? 1 - ramp(t, DESSERT_FROM, 9.5) : 0;
}

// ---------------------------------------------------------------- the camera

/** How far the camera has pulled back, 0 .. 1 over the loop (zoom is SCALE ** -phase): after the spurt, so you see it grow first. */
const PULL: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: SPURT + 0.9, at: 0, rate: 0 },
  { t: 8.8, at: 1, rate: 0 },
  { t: LOOP_S, at: 1, rate: 0 },
];
export const pullAt = (t: number): number => curveAt(PULL, t).at;

/** Screen px per world px before the camera pulls back: the viper about 450 px long. */
export const BASE_ZOOM = 450 / VIPER_LEN;

/** Where the camera looks, ahead of the viper, in the viper's starting lengths (scaled with the pull-back): further ahead while the fangtooth comes in. */
const LEAD: readonly Key[] = [
  { t: 0, at: 0.5, rate: 0 },
  { t: 1.5, at: 0.38 },
  { t: 4.6, at: 0.36 },
  { t: 6.4, at: 0.12 },
  { t: 8.4, at: 0.15 },
  { t: 10.2, at: 0.5 },
  { t: LOOP_S, at: 0.5, rate: 0 },
];

export function viewAt(t: number): View {
  // The camera trails the viper by a beat (an average over the last half second), so the strike moves on screen.
  const n = 10;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = unwrapped(viperPath, t - (0.5 * i) / (n - 1));
    x += p.x / n;
    y += p.y / n;
  }
  const lead = curveAt(LEAD, t).at * VIPER_LEN * SCALE ** pullAt(t);
  return { x: x + lead, y: y + 0.08 * VIPER_LEN * SCALE ** pullAt(t), zoom: BASE_ZOOM * SCALE ** -pullAt(t) };
}

// ---------------------------------------------------------------- "!", "+360", "Bigger!", the HUD

/** An inked "!" popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (since - 0.12) / 0.06);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The fangtooth's "!" as it sees the teeth, staying up as the loop comes round. */
export const fangAlarm = (t: number): number => pop(seam(t) - (SPOT_AT - LOOP_S), LOOP_S - SPOT_AT + 0.45);

/** A floating game text's life: risen 0 .. 1, visible 0 .. 1, or null. */
function float(since: number, life: number): { readonly rise: number; readonly alpha: number } | null {
  if (since < 0 || since >= life) return null;
  const s = since / life;
  return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, since / 0.08) * (1 - ramp(s, 0.65, 1)) };
}

/** The score for the meal, as the game counts it. */
export const SCORE_TEXT = `+${scoreFor(FANG_SIZE, 1)}`;
export const scoreText = (t: number): { readonly rise: number; readonly alpha: number } | null => float(t - GULP_AT - 0.05, 1.0);
export const biggerText = (t: number): { readonly rise: number; readonly alpha: number } | null => float(t - SPURT, 0.8);

/** Where the bar marks each growth stage: the game's tiers for this level. */
export const BAR_MARKS = STAGES.tiers.slice(0, -1).map((v) => v / STAGES.tiers[STAGES.tiers.length - 1]!);

/** The growth bar: part way through the third stage, past its mark with the fangtooth; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const before = BAR_MARKS[2]! - 0.1;
  const fill = lerp(before, BAR_MARKS[2]! + 0.035, ramp(t, GULP_AT, GULP_AT + 0.4));
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

/** Camera shake, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...HEAVES.map((h) => ({ at: h + 0.1, amp: 8 })), { at: GULP_AT, amp: 18 }, { at: SPURT, amp: 7 }];
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

export const CAPTIONS: readonly Caption[] = [
  { text: 'he’s literally my size', y: 380, size: 106, from: -0.45, to: 2.5 },
  { text: 'how did that fit', y: 390, size: 128, from: 5.0, to: 8.3 },
  { text: 'always room for dessert', y: 380, size: 100, from: 9.0, to: 11.25 },
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
  // The strike: water rushing in, the fangtooth dragged to the lips, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  // The tussle: the tail thrashing, and a heave at a time.
  { id: 'rustle', t: 1.3, pitch: 0.8, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.9, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  // The last slurp and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // Dessert: something big drifting in, the "!", the strike.
  { id: 'lunge', t: DESSERT_FROM + 0.2, pitch: 0.35, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: 10.1, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
