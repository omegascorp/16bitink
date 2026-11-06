import { bodyProportions } from '../../../src/art/fishArt';
import { C, FISH_RADIUS, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { LIMBS, limbPoints, SQUID_BODY, type SquidPose } from '../../../src/art/squidPose';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { clamp01, curveAt, lerp, ramp, window01, type Key } from '../short';
import type { View, WorldFish } from '../gameplay/fish';
import {
  BASE_ZOOM, BITE_AT, DESSERT_FROM, GULP_AT, HEAVES, insertion, LOOP_S, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN, viperFish,
  viperJaw, type Caption, type SoundCue,
} from '../lure/story';
import { seam } from '../gape/story';
import { lipsOf } from '../gape/swimmer';
import { BAR_MARKS, GOAL, POINTS_BEFORE } from '../slurp/story';

export type { Caption, SoundCue, View, WorldFish };
// The viper's side of it is #21's and #59's, beat for beat: the strike, three heaves, the last slurp, the gulp, the stage-up.
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, insertion, LOOP_S, POINTS_BEFORE, pullAt, SCALE, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM,
  VIPER_LEN, viperFish, viperJaw,
};
export { VIPER_SIZE, viperLength } from '../lure/story';
export { biggerText, captionAlpha, gulpSnap, shake, suction, viperEyes } from '../gape/story';
export { scoreText } from '../slurp/story';
export { anglerAlarm as squidAlarm } from '../lure/story';

/**
 * "How did that fit 4": the sequel to gape/ (#21), slurp/ (#48) and lure/
 * (#59). Chapter 8's last level, played as a highlight. You are the
 * viperfish, whose ability is `gape` (logic/abilities.ts: canSwallow lets it
 * eat a 'peer', a fish up to 1.1 times its own size). A giant squid (the
 * game's own drawing, art/squidArt.ts), a peer by size but huge by the look
 * of it, jets mantle first out of the dark at you, its great eye opening
 * first, its two long tentacles reaching for your head. The viper lunges,
 * its jaw swung impossibly wide round the squid's mantle, and the squid
 * fights back: its tentacles stay outside, wrapped round the viper's head,
 * tugging, while the rest goes in a heave at a time. Then the last slurp:
 * arms and tentacles go in like spaghetti, the tips flicking last. GULP,
 * "+..." and "Bigger!"; a tentacle tip pokes out of the lips and is slurped
 * back with a pop. In the dark ahead a bigger eye opens, and the next squid
 * reaches, which is frame 1.
 *
 *   0     mid-lunge: the viper's jaw swinging wide round the mantle, the eye, the "!", the tentacles reaching
 *   0.3   water rushes in; the squid is dragged in; its tentacles snap round the viper's head
 *   0.75  mantle first into the jaws
 *   1.9   heave, 2.8 heave, 3.65 heave: eyes squeezed, tentacles taut, the belly filling
 *   4.55  the last slurp: arms and tentacles in like spaghetti, tips last
 *   4.9   GULP: jaws snap shut, the belly balloons, score (payoff, 41%)
 *   5.0   "how did THAT fit"; two chews; 5.45 a tentacle tip pokes out of the lips, 6.0 slurped back with a pop
 *   5.6   "Bigger!": the next growth stage; the camera pulls back after it
 *   9.0   in the dark ahead, a huge eye opens; "room for seconds?"
 *   10.2  the next squid jets out of the dark, mantle first, tentacles reaching
 *   11.35 "!": it sees the teeth; 11.6 the viper strikes, which is frame 1.
 */

interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- sizes, as the game has them

/**
 * The squid: 55, a touch bigger than the viper (51) and so a peer of it, which
 * only the gape can swallow. (In the game it is chapter 10's giant, hunting you
 * in the dark; here it is staged at a size the highlight can win.) The game
 * draws a fish size / FISH_RADIUS times its texture; the squid's mantle and head are
 * 248 texture px long, its arms and tentacles 100 to 240 more.
 */
export const SQUID_SIZE = 55;
/** World px per body px of the squid's drawing. */
export const K_S = SQUID_SIZE / FISH_RADIUS;
export const SQUID_LEN = 2 * SQUID_BODY.hl * K_S;
const HL = SQUID_BODY.hl;
/** The eye, in body px (art/squidArt.ts EYE). */
export const EYE_AT: Pt = { x: 74, y: -5 };

/** One growth stage: SCALE times bigger from the spurt on. */
const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);

// ---------------------------------------------------------------- the mouth's frame

/** A point of the viper's drawing (texture px, facing right) in the world. */
function onViper(v: WorldFish, tex: Pt): Pt {
  const k = v.length / (2 * bodyProportions('viperfish').hl);
  const lx = (tex.x - 128) * k;
  const ly = (tex.y - 128) * k;
  const c = Math.cos(-v.tilt);
  const s = Math.sin(-v.tilt);
  return { x: v.x + v.facing * (lx * c - ly * s), y: v.y + lx * s + ly * c };
}

/** The viper's mouth: origin at the middle of its lips, x out of the mouth, y across it (down), `k` world px per squid body px. */
export interface Frame {
  readonly origin: Pt;
  readonly ex: Pt;
  readonly ey: Pt;
  readonly k: number;
}

export function mouthFrame(t: number): Frame {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  const ex = { x: (mid.x - hinge.x) / d, y: (mid.y - hinge.y) / d };
  return { origin: mid, ex, ey: { x: -ex.y, y: ex.x }, k: K_S * stageOf(t) };
}

export const toWorld = (f: Frame, p: Pt): Pt => ({
  x: f.origin.x + (f.ex.x * p.x + f.ey.x * p.y) * f.k,
  y: f.origin.y + (f.ex.y * p.x + f.ey.y * p.y) * f.k,
});

/** A point of the viper's drawing (texture px) in the mouth's frame. */
function headPt(t: number, tex: Pt): Pt {
  const f = mouthFrame(t);
  const w = onViper(viperFish(t), tex);
  const dx = (w.x - f.origin.x) / f.k;
  const dy = (w.y - f.origin.y) / f.k;
  return { x: dx * f.ex.x + dy * f.ex.y, y: dx * f.ey.x + dy * f.ey.y };
}

// ---------------------------------------------------------------- how far in

/** How deep the squid's mantle tip is past the lips (body px) before the heaves, at the heaves, and when the last of it has gone in. */
const S_BITE = 72;
const S_PRE = 160;
const S_END = 520;
/** Where the heaves leave the viper's insertion (gape/story.ts): the last slurp is the rest. */
const PRE_INS = 0.6;

/** The mantle tip's depth in the mouth, body px: dragged in, a step at each heave, then the last slurp takes the rest. */
export function depth(t: number): number {
  if (t < SUCK_FROM) return 40 + 60 * t;
  if (t < BITE_AT) return lerp(58, S_BITE, ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6);
  const d = insertion(t);
  if (d <= PRE_INS) return lerp(S_BITE, S_PRE, d / PRE_INS);
  return S_PRE + (S_END - S_PRE) * clamp01((d - PRE_INS) / (1.02 - PRE_INS));
}

/** The squid thrashes about its mantle tip as it's held. */
const thrash = (t: number): number => 0.09 * Math.sin(2 * Math.PI * 3 * t + 1);

/** The next squid jets in out of the dark: its mantle tip in the mouth's frame (body px), x then y then angle. */
const THRASH_END = 0.09 * Math.sin(1);
const APPROACH_X: readonly Key[] = [
  { t: DESSERT_FROM, at: 262, rate: -100 },
  { t: 9.0, at: 185 },
  { t: 10.2, at: 118 },
  { t: 11.35, at: 62 },
  { t: 11.75, at: 12 },
  { t: LOOP_S, at: -40, rate: -60 },
];
const APPROACH_Y: readonly Key[] = [
  { t: DESSERT_FROM, at: -70 },
  { t: 9.6, at: -52 },
  { t: 10.8, at: -26 },
  { t: 11.35, at: -10 },
  { t: 11.75, at: -2 },
  { t: LOOP_S, at: 0, rate: 0 },
];
const APPROACH_A: readonly Key[] = [
  { t: DESSERT_FROM, at: 0.12 },
  { t: 9.6, at: 0.07 },
  { t: 10.8, at: 0.04 },
  { t: LOOP_S, at: THRASH_END, rate: 0.09 * 2 * Math.PI * 3 * Math.cos(1) },
];

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;
export const squidGone = (t: number): boolean => t >= GULP_AT && t < DESSERT_FROM;

/** Where the squid's mantle tip is in the mouth's frame, and which way it points (radians, about the tip). */
export function squidTip(t: number): { readonly x: number; readonly y: number; readonly a: number } {
  if (isDessert(t)) return { x: curveAt(APPROACH_X, t).at, y: curveAt(APPROACH_Y, t).at, a: curveAt(APPROACH_A, t).at };
  return { x: -depth(t), y: 0, a: thrash(t) * (1 - Math.min(1, insertion(t))) };
}

/** A point of the squid's drawing (body px, arms to +x, centred) in the mouth's frame. */
export function squidToFrame(t: number, p: Pt): Pt {
  const tip = squidTip(t);
  const c = Math.cos(tip.a);
  const s = Math.sin(tip.a);
  const cx = tip.x + c * HL;
  const cy = tip.y + s * HL;
  return { x: cx + c * p.x - s * p.y, y: cy + s * p.x + c * p.y };
}

/** The squid comes up out of the dark: 1 hidden .. 0 in plain view; its eye opens first. */
export const squidMurk = (t: number): number => (isDessert(t) ? 1 - ramp(t, 9.3, 10.9) : 0);
/** The eye opening in the dark: 0 shut .. 1 open. */
export const eyeOpen = (t: number): number => (isDessert(t) ? ramp(t, 8.7, 9.4) : 1);

/** Fins: flared as it jets in, pressed flat for the strike. */
export const finFlare = (t: number): number => (isDessert(t) ? 0.15 + 0.85 * (ramp(t, 9.4, 10.0) - ramp(t, 10.8, 11.3)) : 0.15);

// ---------------------------------------------------------------- arms and tentacles

const ARM_LIMBS = LIMBS.filter((l) => l.kind === 'arm');
const TENTACLE_LIMBS = LIMBS.filter((l) => l.kind === 'tentacle');
export const TENTACLE_POINTS = 19;

/** How far the arms stream together behind it: trailing as it jets in, and as it is slurped. */
const stream = (t: number): number => {
  const jet = isDessert(t) ? 0.7 * (1 - ramp(t, 10.6, 11.3)) : 0;
  return Math.max(jet, ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.15) * (t < GULP_AT ? 1 : 0));
};

/** The squid's arm paths, body px in the squid's own frame; far ones first. */
export function armPaths(t: number): readonly { readonly pts: Pt[]; readonly far: boolean }[] {
  const pose: SquidPose = {
    t: (t * 2 * Math.PI * 2) / LOOP_S / 1.7,
    splay: 0.55,
    writhe: 0.85,
    stream: stream(t),
    lag: 0,
    strike: 0,
    aim: { x: 400, y: 0 },
  };
  return ARM_LIMBS.map((l) => ({ pts: limbPoints(l, pose), far: l.far }));
}

/** The last slurp: the tentacles unwrap and trail out of the mouth like spaghetti. */
const spaghetti = (t: number): number => (t < GULP_AT ? ramp(t, SLURP_AT - 0.12, SLURP_AT + 0.14) : 0);
/** How far the tentacles have wrapped round the viper's head: starting as the loop comes round, round it by 0.75. */
export const wrapAmount = (t: number): number => ramp(seam(t), -0.4, 0.75);
/** The tug of a heave: 0 .. 1. */
export function tug(t: number): number {
  return Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.1) / 0.45))));
}

const catmull = (pts: readonly Pt[], n: number): Pt[] => {
  const at = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  return Array.from({ length: n }, (_, k) => {
    const u = (k / (n - 1)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(u));
    const s = u - i;
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const f = (a: number, b: number, c: number, d: number): number =>
      0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
    return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
  });
};

/** Where the tentacles wrap the viper's head: bands just behind the corner of its mouth, in the mouth's frame. */
function bands(t: number): { readonly top: readonly Pt[]; readonly bottom: readonly Pt[] } {
  const a = ANATOMY.viperfish;
  const x0 = xAt(a, 0.3);
  const h = heightAt(a, 0.3);
  const at = (dx: number, y: number): Pt => headPt(t, { x: x0 + dx, y });
  const pull = tug(t);
  return {
    // Over the top and down the face behind the eye, on a slant, the tip curling under the chin.
    top: [at(-6 - 5 * pull, C - h * 1.18), at(-8 - 5 * pull, C - h * 0.1), at(-18 - 5 * pull, C + h * 1.2)],
    bottom: [at(-26 - 5 * pull, C + h * 1.2), at(-32 - 5 * pull, C + h * 0.1), at(-22 - 5 * pull, C - h * 1.22)],
  };
}

/** One tentacle's path in the mouth's frame, root to tip: reaching, wrapped round the head, or trailing like spaghetti. */
export function tentaclePath(t: number, j: 0 | 1): Pt[] {
  const l = TENTACLE_LIMBS[j]!;
  const sg = j === 0 ? -1 : 1;
  const to = (p: Pt): Pt => squidToFrame(t, p);
  const root = to(l.root);
  const wob = (i: number): number => 7 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S * 4 + j * 2 + i * 1.3);
  // Reaching: out past the crown, then back over the mantle towards the viper's head, the tip hovering above or below the open jaw.
  const reach = catmull(
    [l.root, { x: 158, y: 45 * sg }, { x: 110, y: 100 * sg + wob(1) }, { x: 30, y: 118 * sg + wob(2) }, { x: -50, y: 108 * sg + wob(3) }, { x: -105, y: 78 * sg + wob(4) }].map(to),
    TENTACLE_POINTS,
  );
  const b = bands(t);
  const around = j === 0 ? b.top : b.bottom;
  const first = around[0]!;
  const wrapped = catmull(
    [
      root,
      { x: lerp(root.x, first.x, 0.45), y: (j === 0 ? -1 : 1) * (78 - 22 * tug(t)) },
      ...around,
      { x: around[2]!.x - 24, y: around[2]!.y + (j === 0 ? 8 : -8) },
      { x: around[2]!.x - 34, y: around[2]!.y + (j === 0 ? -8 : 8) },
    ],
    TENTACLE_POINTS,
  );
  const w = wrapAmount(t);
  const sp = spaghetti(t);
  return reach.map((r, i) => {
    const u = i / (TENTACLE_POINTS - 1);
    const wx = lerp(r.x, wrapped[i]!.x, w);
    const wy = lerp(r.y, wrapped[i]!.y, w);
    if (sp <= 0) return { x: wx, y: wy };
    // Trailing out behind the crown, waving, the tip flicking.
    const len = 235 + 6 * j;
    const flick = 24 * u * u * Math.sin(2 * Math.PI * 1.3 * u - 2 * Math.PI * 2 * (t / 1) * 1 + j * 2);
    return { x: lerp(wx, root.x + u * len, sp), y: lerp(wy, root.y + flick, sp) };
  });
}

/** The tentacle tip that pokes out of the viper's closed lips after the gulp, and is slurped back with a pop. */
export const POKE_FROM = GULP_AT + 0.55;
export const POKE_POP = GULP_AT + 1.1;
export function poke(t: number): { readonly out: number; readonly wiggle: number } | null {
  if (t < POKE_FROM || t >= POKE_POP) return null;
  const out = 52 * ramp(t, POKE_FROM, POKE_FROM + 0.12) * (1 - ramp(t, POKE_POP - 0.08, POKE_POP));
  return { out, wiggle: 9 * Math.sin(2 * Math.PI * 5 * (t - POKE_FROM)) * ramp(t, POKE_FROM, POKE_FROM + 0.2) };
}

// ---------------------------------------------------------------- the viper's belly

/** The squid in the belly: the swelling's size (0 .. ~1.3: as deep as a squid's mantle), centre and length, in body lengths. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  if (t < GULP_AT) {
    const d = depth(t);
    return { size: Math.min(1.05, Math.max(0, (d - 40) / 150) * 1.05), at: 0.32 + 0.12 * clamp01(d / 300), width: 0.22 + 0.45 * clamp01(d / 420) };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 1.3 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.42, 0.5, ramp(t, GULP_AT, 6)), width: 0.6 };
}

export const viperLureGlow = (_t: number): number => 0.22;

// ---------------------------------------------------------------- the camera

/** Where the viper's lips are on screen, x, over the loop: the strike low in the frame, the whole viper for the fight, the dark ahead for the approach. */
const LIPS_X: readonly { readonly t: number; readonly at: number }[] = [
  { t: 0, at: 340 },
  { t: 1.5, at: 520 },
  { t: 4.6, at: 520 },
  { t: 6.4, at: 690 },
  { t: 8.2, at: 690 },
  { t: 9.2, at: 250 },
  { t: 11.0, at: 250 },
  { t: 11.7, at: 300 },
  { t: LOOP_S, at: 340 },
];

/** The camera backs off a little while the next squid jets in (the whole eye and mantle in view), then closes in on the strike. */
const ZOOM_EXTRA: readonly Key[] = [
  { t: 0, at: 1, rate: 0 },
  { t: 8.2, at: 1 },
  { t: 9.0, at: 0.7 },
  { t: 10.6, at: 0.7 },
  { t: 11.7, at: 1 },
  { t: LOOP_S, at: 1, rate: 0 },
];
export const zoomExtra = (t: number): number => curveAt(ZOOM_EXTRA, t).at;

/** Where the camera looks, ahead of the viper, in the viper's lengths, so its lips are where LIPS_X says. */
const LEAD: readonly Key[] = LIPS_X.map((k, i, all) => {
  const z = zoomExtra(k.t);
  return { t: k.t, at: (540 - k.at + 225 * z) / (450 * z), ...(i === 0 || i === all.length - 1 ? { rate: 0 } : {}) };
});

/** The viper's path followed past the loop's ends, scaled as the camera's zoom repeats. */
function viperUnwrapped(t: number): Pt {
  let k = Math.floor(t / LOOP_S);
  if (t - k * LOOP_S >= LOOP_S) k += 1;
  const f = viperFish(Math.max(0, t - k * LOOP_S));
  const s = SCALE ** k;
  return { x: f.x * s, y: f.y * s };
}

export function viewAt(t: number): View {
  const pull = pullAt(t);
  // The camera trails the viper by a beat (an average over the last half second), so the strike moves on screen.
  const n = 10;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = viperUnwrapped(t - (0.5 * i) / (n - 1));
    x += p.x / n;
    y += p.y / n;
  }
  const lead = curveAt(LEAD, t).at * VIPER_LEN * SCALE ** pull;
  return { x: x + lead, y: y + 0.08 * VIPER_LEN * SCALE ** pull, zoom: BASE_ZOOM * SCALE ** -pull * zoomExtra(t) };
}

// ---------------------------------------------------------------- the score and the bar

/** The score for the meal, as the game counts it. */
export const SCORE_TEXT = `+${scoreFor(SQUID_SIZE, 1)}`;
/** The growth points the squid is worth, as the game counts them. */
export const MEAL_POINTS = growthPointsFor(SQUID_SIZE);

/** The growth bar: a few points short of the last stage, past its mark with the squid; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

/** Captions; a "\n" breaks a line. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'it’s fighting back', y: 380, size: 104, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'room for seconds?', y: 380, size: 108, from: 9.0, to: 11.25 },
];

export const SOUNDS: readonly SoundCue[] = [
  // The strike: water rushing in, the squid dragged to the lips, the tentacles snapping round the head, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'lash', t: 0.3, pitch: 0.7, gain: 0.45, pan: 0.2 },
  { id: 'lash', t: 0.55, pitch: 0.55, gain: 0.35, pan: 0.2 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  // The tussle: the arms thrashing, the tentacles creaking, and a heave at a time.
  { id: 'rustle', t: 1.3, pitch: 0.7, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
    { id: 'lash', t: h - 0.12, pitch: 0.5, gain: 0.3, pan: 0.2 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.85, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 0.95, gain: 0.4, pan: 0.3 },
  // The last slurp: spaghetti, the tips flicking in last, and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'suck', t: SLURP_AT + 0.1, pitch: 1.2, gain: 0.45, pan: 0.15 },
  { id: 'lash', t: SLURP_AT + 0.18, pitch: 1.4, gain: 0.3, pan: 0.2 },
  { id: 'suck', t: GULP_AT - 0.2, pitch: 1.9, gain: 0.45, pan: 0.15 },
  { id: 'lash', t: GULP_AT - 0.08, pitch: 1.7, gain: 0.3, pan: 0.2 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  // The tentacle tip poking out of the lips, and slurped back with a pop.
  { id: 'rustle', t: POKE_FROM, pitch: 1.1, gain: 0.35, pan: 0.2 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'suck', t: POKE_POP - 0.1, pitch: 1.6, gain: 0.4, pan: 0.15 },
  { id: 'eat', t: POKE_POP, pitch: 1.3, gain: 0.7, pan: 0.1 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // The next eye opening in the dark, the squid jetting in, reaching, the "!", the strike.
  { id: 'click', t: 8.9, pitch: 0.5, gain: 0.5, pan: 0.35 },
  { id: 'lunge', t: 9.6, pitch: 0.35, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: 10.1, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'lash', t: 10.7, pitch: 0.5, gain: 0.3, pan: 0.35 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
