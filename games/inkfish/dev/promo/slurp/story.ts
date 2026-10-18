import type { SfxId } from '../../../src/audio/recipes';
import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { growthStages, stagesFor } from '../../../src/levels/generate';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { fishAt, seamTime, tiltFrom, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey, type PathPoint } from '../gameplay/zoomPath';
import { lipsOf } from '../gape/swimmer';
import { NOSE_X, SPINE, type Pt } from './noodle';

export type { View, WorldFish };

/**
 * "How did that fit 2": the sequel to gape/ (#21). Chapter 8 (the midnight
 * zone), its last level, played as a highlight. You are the viperfish, whose
 * ability is `gape` (logic/abilities.ts: canSwallow lets it eat a 'peer', a
 * fish up to 1.1 times its own size). A gulper eel ("All mouth. Can swallow
 * bigger fish.") comes for the viper's lure with its own huge mouth thrown
 * open; the viper lunges, jaw swung impossibly wide, and the two mouths meet.
 * The viper wins: the eel goes in head first and is slurped down like
 * spaghetti, a slurp at a time, its whip of a tail flicking, then the last
 * of it whips in. GULP. "Bigger!". Then the next gulper, as big as the bigger
 * viper, drifts out of the dark to the lure, opens wide, and the viper
 * lunges again, which is the first frame.
 *
 *   0     mid-lunge: the viper's jaw swinging wide, the gulper's mouth open at it, its "!"
 *   0.3   water rushes in; the gulper is dragged to the lips, its jaws yanked shut
 *   0.75  head first into the jaws
 *   1.55  slurp, 2.3 slurp, 3.05 slurp, 3.8 slurp: the noodle pulled taut, then flicking
 *   4.35  the last long slurp: the rest whips in, tail last
 *   4.9   GULP: jaws snap shut, the belly balloons, "+500" (payoff, 41%)
 *   5.0   "how did THAT fit"; two chews, eyes smiling shut
 *   5.6   "Bigger!": the next growth stage; the camera pulls back after it
 *   8.3   a bigger gulper glides in out of the dark towards the lure
 *   9.0   "always room for spaghetti"
 *   10.4  it throws its jaws open for the lure
 *   11.35 "!": it sees the teeth; 11.6 the viper strikes, which is frame 1.
 *
 * Positions are world px (game px: fish sized as the game sizes them) with
 * the camera's zoom centred on the world's origin. Over the loop the viper
 * grows one growth stage (SCALE times) and the camera pulls back SCALE
 * times, so the end is the start, scaled up.
 */
export const LOOP_S = 12;

// ---------------------------------------------------------------- sizes, as the game has them

/**
 * Chapter 8's last level, "Midnight" (content/paid.ts, levels/generate.ts): final size 72
 * (the chapter ramps 56 .. 71.5), its goal 229 growth points, five stages.
 */
export const FINAL_SIZE = 72;
export const GOAL = 229;
const STAGES = growthStages(GOAL, FINAL_SIZE, stagesFor(8));
/** The viper at its fourth stage (51), growing to its fifth (72): one stage-up over the loop. */
export const VIPER_SIZE = STAGES.playerSizes[3]!;
export const SCALE = STAGES.playerSizes[4]! / VIPER_SIZE;
/** That level's gulpers: all 50, kept under the giant (sleeper shark 59) by levels/twists.ts. A peer of a 51 viper. */
export const GULPER_SIZE = 50;

/** How long the game draws a fish of this size, nose to tail stalk: its sprite scales by size / FISH_RADIUS. */
export const drawnLength = (shape: 'viperfish' | 'gulper', size: number): number => (size / FISH_RADIUS) * 2 * bodyProportions(shape).hl;
export const VIPER_LEN = drawnLength('viperfish', VIPER_SIZE);
export const GULPER_LEN = drawnLength('gulper', GULPER_SIZE);
/** World px per texture px of the first gulper's drawing. */
const EEL_K = GULPER_LEN / (2 * bodyProportions('gulper').hl);

export const SUCK_FROM = 0.3;
export const BITE_AT = 0.75;
export const SLURPS = [1.55, 2.3, 3.05, 3.8] as const;
/** How long a slurp pulls. */
const PULL_S = 0.22;
export const SLURP_AT = 4.35;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const DESSERT_FROM = 8.3;
/** The next gulper opens wide for the lure. */
export const OPEN_FROM = 10.4;
/** It sees the teeth, and the viper strikes: just before the loop comes round. */
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

/** The viper's swim, in its starting lengths: a lunge, a tug of war that barely moves, then a slow drift until it strikes again. */
const V = VIPER_LEN;
/** Where it starts, so that the end (SCALE times further out) is where its drift has taken it. */
const X0 = (1.5 * V) / (SCALE - 1);
const VIPER_KEYS: readonly PathKey[] = [
  { t: 0, x: X0, y: 0, vx: 1.55 * V, vy: -0.12 * V },
  { t: 0.55, x: X0 + 0.5 * V, y: -0.04 * V, vx: 0.35 * V, vy: 0 },
  { t: 1.2, x: X0 + 0.6 * V, y: -0.02 * V },
  { t: 2.4, x: X0 + 0.56 * V, y: 0.03 * V },
  { t: 3.6, x: X0 + 0.62 * V, y: 0.0 },
  { t: GULP_AT, x: X0 + 0.78 * V, y: -0.04 * V, vx: 0.2 * V, vy: 0 },
  { t: 6.4, x: X0 + 0.95 * V, y: 0.02 * V },
  { t: 8.4, x: X0 + 1.12 * V, y: 0.05 * V },
  { t: 10.2, x: X0 + 1.2 * V, y: 0.02 * V, vx: 0, vy: 0 },
  { t: STRIKE_AT, x: X0 + 1.16 * V, y: 0.0, vx: 0, vy: 0 },
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

/** A slurp's pull: 0 .. 1 over the PULL_S it takes, 0 outside. */
const pulling = (t: number, s: number): number => (t > s - 0.03 && t < s + PULL_S + 0.08 ? Math.sin(Math.PI * clamp01((t - s + 0.03) / (PULL_S + 0.11))) : 0);

/** The jaw: swinging open through the strike, held wide on the slurping (opening a touch more on each slurp), shut on the gulp, two chews. */
export function viperJaw(t: number): number {
  const u = seam(t);
  if (u >= -0.45 && u < 0.3) return 3 * smooth((u + 0.45) / 0.75);
  if (t >= 0.3 && t < GULP_AT) {
    const strain = 2.8 + 0.06 * Math.sin(2 * Math.PI * 5 * t);
    const slurp = Math.max(0, ...SLURPS.map((s) => pulling(t, s))) * 0.25;
    const last = 0.3 * ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.1);
    return lerp(3, strain + Math.max(slurp, last), ramp(t, 0.3, 0.6));
  }
  // Snapped shut on the gulp, then two chews.
  let open = t < GULP_AT + 0.1 ? 3.1 * (1 - ramp(t, GULP_AT, GULP_AT + 0.07)) : 0;
  for (const c of [GULP_AT + 0.35, GULP_AT + 0.75]) if (t > c && t < c + 0.2) open = Math.max(open, 0.35 * Math.sin((Math.PI * (t - c)) / 0.2));
  return open;
}

/** Water rushing into the mouth: the strike, each slurp, and the last long one. */
export function suction(t: number): number {
  const u = seam(t);
  if (u > -0.1 && u < BITE_AT) return Math.min(ramp(u, -0.1, 0.15), 1 - ramp(u, BITE_AT - 0.15, BITE_AT));
  if (t > SLURP_AT - 0.1 && t < GULP_AT) return ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.05);
  return 0.75 * Math.max(0, ...SLURPS.map((s) => pulling(t, s)));
}

/**
 * How much of the gulper is past the viper's lips, texture px of its drawing
 * (nose 0 .. whip tip SPINE.to): the head in at the bite, a pull at each slurp
 * (slipping back a little between), all of it on the last long slurp.
 */
export function insertion(t: number): number {
  if (t < BITE_AT) return 0;
  if (t >= GULP_AT) return SPINE.to + 8;
  let d = 34 * ramp(t, BITE_AT, BITE_AT + 0.25);
  for (const s of SLURPS) d += 32 * ramp(t, s, s + PULL_S) - 5 * ramp(t, s - 0.45, s - 0.1);
  return d + (SPINE.to + 8 - d) * ramp(t, SLURP_AT, GULP_AT - 0.05) ** 1.5;
}

/** The gulper in the belly: the swelling's size (0 .. ~1.3), centre and length, in body lengths. A long lump as it goes in; a ball once it's all in. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (t < GULP_AT) {
    const inside = Math.max(0, insertion(t) * EEL_K - hinge * VIPER_LEN) / VIPER_LEN;
    const fill = Math.min(1, inside / 0.7);
    return { size: 0.15 + 0.5 * fill, at: hinge + 0.06 + 0.22 * fill, width: 0.12 + 0.55 * fill };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 1.25 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.42, 0.5, ramp(t, GULP_AT, 6)), width: lerp(0.67, 0.58, ramp(t, GULP_AT, GULP_AT + 0.4)) };
}

export function viperEyes(t: number): 'squeeze' | 'happy' | null {
  if (SLURPS.some((s) => t > s - 0.05 && t < s + 0.35)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  if (t >= GULP_AT + 0.3 && t < 7.6) return 'happy';
  return null;
}

/** The jolt of a slurp or the gulp: 0 .. 1. */
export function gulpSnap(t: number): number {
  for (const [at, k] of [...SLURPS.map((s) => [s + 0.08, 0.4] as const), [GULP_AT, 1] as const]) {
    if (t > at - 0.02 && t < at + 0.14) return k * Math.sin((Math.PI * (t - at + 0.02)) / 0.16);
  }
  return 0;
}

/** The lure's brightness: steady, twitching as it lures the gulper in. */
export function lureGlow(t: number): number {
  const twitch = window01(t, 9.0, STRIKE_AT, 0.4) * 0.35 * Math.max(0, Math.sin(2 * Math.PI * 1.5 * t)) ** 3;
  return 0.85 + twitch;
}

// ---------------------------------------------------------------- the gulper

/** Where the gulper's nose is while it is free, relative to the viper's centre, in the viper's length at the time: in from the right to the lure, then shying off. */
const EEL_REL = [
  { t: 0, dx: 0.76, dy: -0.05 },
  { t: 0.22, dx: 0.79, dy: -0.05 },
  { t: DESSERT_FROM, dx: 1.55, dy: -0.3 },
  { t: 9.6, dx: 1.22, dy: -0.18 },
  { t: 10.8, dx: 0.96, dy: -0.1 },
  { t: SPOT_AT, dx: 0.77, dy: -0.05 },
  { t: 11.75, dx: 0.8, dy: -0.05 },
] as const;
const EEL_KEYS: readonly PathKey[] = EEL_REL.map((k) => {
  const p = viperPath(k.t);
  const len = VIPER_LEN * stageOf(k.t);
  return { t: k.t, x: p.x + k.dx * len, y: p.y + k.dy * len };
});
const eelPath = zoomLoopPath(EEL_KEYS, LOOP_S, SCALE);
/** How far its body arches up behind the head, texture px at the tail (along 1.3 less the head). */
const CURL = 55;
/** Its body wave: two a second, a whole number a loop. */
const EEL_BEAT_HZ = 2;

/** The gulper swimming free (facing left, towards the viper): its spine, nose to whip tip, a travelling wave down its long body. */
function freeSpine(t: number): Pt[] {
  const p = eelPath(t);
  const len = GULPER_LEN * stageOf(t);
  const k = len / (2 * bodyProportions('gulper').hl);
  // Nose a touch down at you, the long body arching up behind it (so more of it is in frame).
  const tilt = tiltFrom(p, len) - 0.1;
  // Towards the nose (left, nose up for a positive tilt), and its drawing's "down".
  const f = { x: -Math.cos(tilt), y: -Math.sin(tilt) };
  const n = { x: f.y, y: -f.x };
  const effort = clamp01(Math.hypot(p.vx, p.vy) / (2.2 * len));
  const amp = 7 + 5 * effort;
  const beat = 2 * Math.PI * EEL_BEAT_HZ * t;
  return SPINE.sigmas.map((s) => {
    const along = s / (2 * bodyProportions('gulper').hl);
    const bend = Math.max(0, (along - 0.22) / 0.78);
    const lat = amp * bend * bend * Math.sin(beat - 2 * Math.PI * 1.1 * along) - CURL * Math.max(0, along - 0.3) ** 2;
    return { x: p.x - f.x * s * k + n.x * lat * k, y: p.y - f.y * s * k + n.y * lat * k };
  });
}

/** A point of the viper's drawing (texture px, facing right) in the world: its head, which doesn't bend. */
function onViper(v: WorldFish, tex: Pt): Pt {
  const k = v.length / (2 * bodyProportions('viperfish').hl);
  const lx = (tex.x - 128) * k;
  const ly = (tex.y - 128) * k;
  const c = Math.cos(-v.tilt);
  const s = Math.sin(-v.tilt);
  return { x: v.x + v.facing * (lx * c - ly * s), y: v.y + lx * s + ly * c };
}

/** The noodle's slack: how hard the slurps pull it taut (0 slack .. 1 taut). */
const taut = (t: number): number => Math.max(0, ...SLURPS.map((s) => pulling(t, s)), ramp(t, SLURP_AT, SLURP_AT + 0.15));

/** How wildly the part still outside thrashes, radians: a spring back after every slurp, frantic on the last one. */
function thrash(t: number): number {
  let w = 0.32;
  for (const s of SLURPS) if (t > s + PULL_S) w += 0.42 * Math.exp(-4.5 * (t - s - PULL_S));
  w += 0.35 * ramp(t, SLURP_AT + 0.1, GULP_AT);
  return w * (1 - 0.7 * taut(t) * (t < SLURP_AT ? 1 : 0.4));
}

/**
 * The gulper `inside` texture px into the viper's mouth, head first: straight
 * down the throat, and the rest trailing out of the lips like a noodle,
 * sagging, waving and whipping.
 */
function slurpedSpine(t: number, inside: number): Pt[] {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const dist = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  const u = { x: (hinge.x - mid.x) / dist, y: (hinge.y - mid.y) / dist };
  const out = Math.atan2(-u.y, -u.x);
  const tight = taut(t);
  const droop = lerp(0.38, 0.12, tight);
  const w = thrash(t);
  const omega = 2 * Math.PI * (t > SLURP_AT ? 3.4 : 2.2);
  const heading = (s: number): number => {
    const rel = s - inside;
    // The head stays straight; the noodle starts to bend behind it.
    const g = clamp01((s - 48) / 40);
    const sag = droop * Math.min(rel, 130) / 100;
    const wave = w * Math.min(1, rel / 50) * Math.sin((2 * Math.PI * rel) / 105 - omega * t + 0.6);
    return out + g * Math.max(-1.25, Math.min(1.25, sag + wave));
  };
  const pts: Pt[] = [];
  let at: Pt = mid;
  let from = inside;
  for (const s of SPINE.sigmas) {
    if (s <= inside) {
      pts.push({ x: mid.x + u.x * (inside - s) * EEL_K, y: mid.y + u.y * (inside - s) * EEL_K });
      continue;
    }
    const h = heading((s + from) / 2);
    at = { x: at.x + Math.cos(h) * (s - from) * EEL_K, y: at.y + Math.sin(h) * (s - from) * EEL_K };
    from = s;
    pts.push(at);
  }
  return pts;
}

/** The gulper's own jaw (0 shut .. 1 wide) and pouch (0 slack .. 1 a balloon): open at the lure and at you, yanked shut as it's dragged in. */
export function gulperMouth(t: number): { readonly jaw: number; readonly fill: number } {
  const u = seam(t);
  if (u >= OPEN_FROM - LOOP_S && u < SUCK_FROM + 0.4) {
    const open = ramp(u, OPEN_FROM - LOOP_S, -0.15) * (1 - ramp(u, SUCK_FROM, SUCK_FROM + 0.32));
    const slack = u >= 0 ? 1 - ramp(u, SUCK_FROM, SUCK_FROM + 0.32) : 1;
    return { jaw: open, fill: 0.05 * slack + 0.55 * open };
  }
  if (t >= DESSERT_FROM) return { jaw: 0, fill: 0.05 };
  return { jaw: 0, fill: 0 };
}

export type GulperState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly spine: readonly Pt[]; readonly length: number }
  | { readonly kind: 'swallowed'; readonly spine: readonly Pt[]; readonly length: number; readonly pouch: number };

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;

export function gulperAt(t: number): GulperState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  const length = GULPER_LEN * stageOf(t);
  if (t < SUCK_FROM || isDessert(t)) return { kind: 'swimming', spine: freeSpine(t), length };
  // Its own mouth fades from view once it's in the dark of the viper's.
  const pouch = 1 - ramp(t, 0.6, 0.85);
  if (t < BITE_AT) {
    // Dragged from where it was to the lips.
    const e = ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6;
    const from = freeSpine(t);
    const to = slurpedSpine(t, 0);
    return { kind: 'swallowed', spine: from.map((p, i) => ({ x: lerp(p.x, to[i]!.x, e), y: lerp(p.y, to[i]!.y, e) })), length, pouch };
  }
  return { kind: 'swallowed', spine: slurpedSpine(t, insertion(t)), length, pouch };
}

/** The gulper's nose, world px. */
export const gulperNose = (spine: readonly Pt[]): Pt => spine[SPINE.sigmas.indexOf(0)]!;

/** The dessert comes up out of the dark: 1 hidden .. 0 in plain view. */
export function gulperMurk(t: number): number {
  return isDessert(t) ? 1 - ramp(t, DESSERT_FROM, 9.5) : 0;
}

/** Its tail light pulses (as the game's drawing has it, a pink light on the whip's tip): four times a loop. */
export const tailGlow = (t: number): number => 0.75 + 0.25 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S);

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

/** Where the camera looks, ahead of the viper, in the viper's starting lengths (scaled with the pull-back): well ahead while the noodle hangs out of its mouth. */
const LEAD: readonly Key[] = [
  { t: 0, at: 0.6, rate: 0 },
  { t: 1.5, at: 0.47 },
  { t: 4.4, at: 0.5 },
  { t: 6.4, at: 0.12 },
  { t: 8.4, at: 0.15 },
  { t: 10.2, at: 0.55 },
  { t: LOOP_S, at: 0.6, rate: 0 },
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

// ---------------------------------------------------------------- "!", "+500", "Bigger!", the HUD

/** An inked "!" popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (since - 0.12) / 0.06);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The gulper's "!" as it sees the teeth, staying up as the loop comes round. */
export const gulperAlarm = (t: number): number => pop(seam(t) - (SPOT_AT - LOOP_S), LOOP_S - SPOT_AT + 0.45);

/** A floating game text's life: risen 0 .. 1, visible 0 .. 1, or null. */
function float(since: number, life: number): { readonly rise: number; readonly alpha: number } | null {
  if (since < 0 || since >= life) return null;
  const s = since / life;
  return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, since / 0.08) * (1 - ramp(s, 0.65, 1)) };
}

/** The score for the meal, as the game counts it. */
export const SCORE_TEXT = `+${scoreFor(GULPER_SIZE, 1)}`;
export const scoreText = (t: number): { readonly rise: number; readonly alpha: number } | null => float(t - GULP_AT - 0.05, 0.65);
export const biggerText = (t: number): { readonly rise: number; readonly alpha: number } | null => float(t - SPURT, 0.8);

/** Where the bar marks each growth stage: the game's tiers for this level. */
export const BAR_MARKS = STAGES.tiers.slice(0, -1).map((v) => v / GOAL);
/** The growth points the gulper is worth, as the game counts them. */
export const MEAL_POINTS = growthPointsFor(GULPER_SIZE);
/** Growth points before the meal: just short of the fifth stage, which the gulper's points pass. */
export const POINTS_BEFORE = STAGES.tiers[3]! - 4;

/** The growth bar: a few points short of the last stage, past its mark with the gulper; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

/** Camera shake, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...SLURPS.map((s) => ({ at: s + 0.08, amp: 6 })), { at: GULP_AT, amp: 18 }, { at: SPURT, amp: 7 }];
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
  { text: 'he’s literally all mouth', y: 380, size: 100, from: -0.45, to: 2.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'always room for spaghetti', y: 380, size: 92, from: 9.0, to: 11.25 },
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
  // The strike: water rushing in, the gulper dragged to the lips, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.5, gain: 0.8, pan: 0.15 },
  { id: 'drop', t: BITE_AT + 0.02, pitch: 0.6, gain: 0.25, pan: 0.15 },
  // The slurps: a quick high slurp of water (the mouth's suck, pitched up), a little plip, the noodle wriggling after.
  ...SLURPS.flatMap((s, i): SoundCue[] => [
    { id: 'suck', t: s - 0.12, pitch: 1.5 + 0.15 * i, gain: 0.75, pan: 0.15 },
    { id: 'eat', t: s + 0.18, pitch: 1.1 + 0.1 * i, gain: 0.3, pan: 0.15 },
    { id: 'rustle', t: s + 0.32, pitch: 0.8 + 0.08 * i, gain: 0.35, pan: 0.35 },
  ]),
  // The last long slurp, the tail whipping in, and the gulp.
  { id: 'suck', t: SLURP_AT - 0.15, pitch: 1.2, gain: 0.85, pan: 0.15 },
  { id: 'suck', t: SLURP_AT + 0.05, pitch: 2.1, gain: 0.55, pan: 0.15 },
  { id: 'lash', t: GULP_AT - 0.3, pitch: 1.3, gain: 0.45, pan: 0.25 },
  { id: 'eat', t: GULP_AT - 0.06, pitch: 1.6, gain: 0.35, pan: 0.1 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // Seconds: something long drifting in, its mouth thrown open for the lure, the "!", the strike.
  { id: 'lunge', t: DESSERT_FROM + 0.2, pitch: 0.35, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: 9.9, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'suck', t: OPEN_FROM + 0.1, pitch: 0.85, gain: 0.35, pan: 0.35 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
