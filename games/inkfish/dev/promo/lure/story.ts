import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { curveAt, lerp, ramp, window01, type Key } from '../short';
import { fishAt, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey, type PathPoint } from '../gameplay/zoomPath';
import {
  BITE_AT, DESSERT_FROM, fangAlarm, GULP_AT, HEAVES, insertion, LOOP_S, pullAt, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, seam, viperJaw, type Caption,
  type SoundCue,
} from '../gape/story';
import { lipsOf } from '../gape/swimmer';
import { BAR_MARKS, GOAL, POINTS_BEFORE, SCALE, VIPER_LEN, VIPER_SIZE, viperLength } from '../slurp/story';
import { LURE_BEND, LURE_BULB, LURE_ROOT, ROOT_ALONG, STALK } from './angler';

export type { Caption, SoundCue, View, WorldFish };
// The viper's side of it is #21's, beat for beat: the strike, three heaves, the last slurp, the gulp, the stage-up.
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, insertion, LOOP_S, POINTS_BEFORE, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN,
  VIPER_SIZE, viperJaw, viperLength,
};
export { biggerText, captionAlpha, gulpSnap, shake, suction, viperEyes } from '../gape/story';
// The score floats up quicker, gone before "Bigger!" (as slurp/ has it).
export { scoreText } from '../slurp/story';

/**
 * "How did that fit 3": the third of gape/ (#21) and slurp/ (#48). Chapter
 * 8's last level ("Midnight"), played as a highlight. You are the viperfish,
 * whose ability is `gape` (logic/abilities.ts: canSwallow lets it eat a
 * 'peer', a fish up to 1.1 times its own size). An anglerfish a touch bigger
 * than you dangles its glowing lure in the dark and throws its huge mouth
 * open to eat you; the viper lunges with its jaw swung impossibly wide and
 * the two mouths meet. The viper wins: the angler goes in head first, its
 * lure swept back over its head and caught on the viper's lip, glowing out
 * there while the rest goes down a heave at a time; the light goes in last
 * and shines out through the stretched belly, then fades. GULP, "+530",
 * "Bigger!". Then, in the dark ahead, the next angler's lure lights up; it
 * comes out of the dark, a stage bigger, and opens wide, which is frame 1.
 *
 *   0     mid-lunge: the viper's jaw swinging wide, the angler's mouth open at it, the lure between, its "!"
 *   0.3   water rushes in; the angler is dragged to the lips, its jaws yanked shut, its lure swept back
 *   0.75  head first into the jaws; ~1.1 the stalk catches on the viper's lip, the light out front
 *   1.9   heave, 2.8 heave, 3.65 heave: eyes squeezed, the belly filling, the light bobbing at the lips
 *   4.55  the last slurp: the tail goes in, then the light, last
 *   4.9   GULP: jaws snap shut, the belly balloons and glows from inside, "+530" (payoff, 41%)
 *   5.0   "how did THAT fit"; two chews, eyes smiling shut; the light inside flickers out by ~6.9
 *   5.6   "Bigger!": the next growth stage; the camera pulls back after it
 *   8.6   in the dark ahead, a lure clicks on
 *   9.0   "there is a light, anglerfish"; the next angler comes out of the dark towards you
 *   10.4  it throws its mouth open for you
 *   11.35 "!": it sees the teeth; 11.6 the viper strikes, which is frame 1.
 *
 * Positions are world px (game px: fish sized as the game sizes them) with
 * the camera's zoom centred on the world's origin. Over the loop the viper
 * grows one growth stage (SCALE times) and the camera pulls back SCALE
 * times, so the end is the start, scaled up.
 */

interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- sizes, as the game has them

/**
 * The angler: 53, a touch bigger than the viper (51) and a peer of it. The
 * game spawns anglers in the trench (chapter 10's levels 6-10: 46 .. 75;
 * "Challenger Deep" has them at exactly 53), not in the midnight zone.
 */
export const ANGLER_SIZE = 53;
export const ANGLER_LEN = (ANGLER_SIZE / FISH_RADIUS) * 2 * bodyProportions('angler').hl;
/** World px per texture px of the first angler's drawing. */
const ANGLER_K = ANGLER_LEN / (2 * bodyProportions('angler').hl);

/** The lure clicks on in the dark ahead; the angler under it comes out of the dark after. */
export const LIGHT_ON = 8.6;
/** The next angler opens wide for you. */
export const OPEN_FROM = 10.4;

/** One growth stage: SCALE times bigger from the spurt on. */
const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);

// ---------------------------------------------------------------- the viper

/** The viper's swim, in its starting lengths: a lunge, a tussle that barely moves, then a slow drift until it strikes again. */
const V = VIPER_LEN;
/** Where it starts, so that the end (SCALE times further out) is where its drift has taken it. */
const X0 = (1.5 * V) / (SCALE - 1);
const VIPER_KEYS: readonly PathKey[] = [
  { t: 0, x: X0, y: 0, vx: 1.55 * V, vy: -0.12 * V },
  { t: 0.55, x: X0 + 0.5 * V, y: -0.04 * V, vx: 0.35 * V, vy: 0 },
  { t: 1.2, x: X0 + 0.6 * V, y: -0.02 * V },
  { t: 2.4, x: X0 + 0.56 * V, y: 0.03 * V },
  { t: 3.6, x: X0 + 0.64 * V, y: 0.0 },
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

/** The angler in the belly: the swelling's size (0 .. ~1.3: 2.3 times as deep, as deep as an angler), centre and length, in body lengths. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (t < GULP_AT) {
    const inside = Math.max(0, insertion(t) * ANGLER_LEN - hinge * VIPER_LEN) / VIPER_LEN;
    return { size: Math.min(1, inside * 3.4), at: hinge + 0.05 + inside * 0.4, width: 0.2 + inside * 0.9 };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 1.28 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.42, 0.5, ramp(t, GULP_AT, 6)), width: 0.56 };
}

/** The viper's own lure, kept low: the angler's is the light in this short. */
export const viperLureGlow = (_t: number): number => 0.22;

// ---------------------------------------------------------------- the angler

/** Where the angler swims while it is free, relative to the viper, in the viper's length at the time: in out of the dark ahead, then at you. */
const ANGLER_REL = [
  { t: 0, dx: 1.03, dy: -0.02 },
  { t: 0.22, dx: 1.06, dy: -0.02 },
  { t: DESSERT_FROM, dx: 1.42, dy: -0.17 },
  { t: 9.6, dx: 1.3, dy: -0.11 },
  { t: 10.8, dx: 1.12, dy: -0.04 },
  { t: SPOT_AT, dx: 1.03, dy: -0.02 },
  { t: 11.75, dx: 1.07, dy: -0.02 },
] as const;
const ANGLER_KEYS: readonly PathKey[] = ANGLER_REL.map((k) => {
  const p = viperPath(k.t);
  const len = VIPER_LEN * stageOf(k.t);
  return { t: k.t, x: p.x + k.dx * len, y: p.y + k.dy * len };
});
const anglerPath = zoomLoopPath(ANGLER_KEYS, LOOP_S, SCALE);

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;

function freeAngler(t: number): WorldFish {
  const f = fishAt('angler', anglerPath(t), ANGLER_LEN * stageOf(t), -1, 2, t);
  return { ...f, effort: Math.max(f.effort, 0.35) };
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

/** A point of the angler's drawing (texture px, facing right) in the world, squashed and stretched as it's drawn. */
function onAngler(f: WorldFish, tex: Pt, squash = 1, stretch = 1): Pt {
  const k = f.length / (2 * bodyProportions('angler').hl);
  const lx = (tex.x - 128) * k * stretch;
  const ly = (tex.y - 128) * k * squash;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.facing * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** The viper's mouth: the middle of the lips, its upper lip's front, and the way down its throat. */
function viperMouth(t: number): { readonly mid: Pt; readonly lip: Pt; readonly down: Pt } {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const lip = onViper(v, { x: lips.mid.x - 3, y: lips.mid.y - lips.height / 2 + 2 });
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  return { mid, lip, down: { x: (hinge.x - mid.x) / d, y: (hinge.y - mid.y) / d } };
}

/** The angler `d` of its length into the viper's mouth, head first, squeezed to fit the gape. */
function anglerIn(t: number, d: number): WorldFish {
  const { mid, down: u } = viperMouth(t);
  // Its nose is d into the throat; its centre half a length back out.
  const back = (0.5 - d) * ANGLER_LEN;
  const thrash = 0.09 * Math.sin(2 * Math.PI * 3 * t + 1);
  return {
    shape: 'angler',
    x: mid.x - u.x * back,
    y: mid.y - u.y * back,
    length: ANGLER_LEN,
    facing: -1,
    tilt: Math.atan2(-u.y, -u.x) + thrash * (1 - d),
    beat: 2 * Math.PI * 3 * t * 1.6,
    effort: 1,
  };
}

export type AnglerState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

/** How the angler is squeezed in the jaws: deep as the gape is wide. */
const SQUEEZE = 0.72;

export function anglerAt(t: number): AnglerState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  if (t < SUCK_FROM || isDessert(t)) return { kind: 'swimming', fish: freeAngler(t) };
  if (t < BITE_AT) {
    // Dragged from where it was to the lips.
    const e = ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6;
    const from = freeAngler(t);
    const to = anglerIn(t, 0);
    return {
      kind: 'swallowed',
      fish: { ...to, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), tilt: lerp(from.tilt, to.tilt, e), beat: from.beat },
      squash: lerp(1, SQUEEZE, e),
      stretch: 1 + 0.08 * e,
    };
  }
  return { kind: 'swallowed', fish: anglerIn(t, insertion(t)), squash: SQUEEZE, stretch: 1.08 };
}

/** The angler's own jaw, 0 shut .. ANGLER_GAPE: thrown open at you as the loop comes round, yanked shut as it's dragged in. */
export const ANGLER_GAPE = 0.85;
export function anglerJaw(t: number): number {
  const u = seam(t);
  if (u < OPEN_FROM - LOOP_S || u >= SUCK_FROM + 0.4) return 0;
  return ANGLER_GAPE * ramp(u, OPEN_FROM - LOOP_S, -0.15) * (1 - ramp(u, SUCK_FROM, SUCK_FROM + 0.32));
}

/** The next angler comes up out of the dark after its light: 1 hidden .. 0 in plain view. */
export function anglerMurk(t: number): number {
  return isDessert(t) ? 1 - ramp(t, 9.2, 10.6) : 0;
}

/** The angler's "!" as it sees the teeth, staying up as the loop comes round. */
export const anglerAlarm = fangAlarm;

// ---------------------------------------------------------------- the lure

/**
 * The lure, world px: the stalk from its root on the angler's forehead
 * (`root`), bowed through `bend`, to the bulb; `snag` is where it's caught
 * on the viper's lip (the stalk runs root, snag, bulb), `glow` its light,
 * `k` world px per texture px of the drawing.
 */
export interface Lure {
  readonly root: Pt;
  readonly bend: Pt;
  readonly bulb: Pt;
  readonly snag: Pt | null;
  readonly glow: number;
  readonly k: number;
  /** 0 out in the water .. 1 gone down the viper's throat. */
  readonly swallowed: number;
}

/** The bulb's bob as it hangs: texture px, a whole number of bobs a loop. */
const bob = (t: number): Pt => ({ x: 2.2 * Math.sin(2 * Math.PI * 1.5 * t), y: 3 * Math.sin(2 * Math.PI * 0.75 * t + 1) });

/** The light: on, breathing (a whole number of breaths a loop); off in the dark between meals until it clicks on, flickering. */
export function lureLight(t: number): number {
  const breath = 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.5 * t);
  if (!isDessert(t)) return breath;
  if (t < LIGHT_ON) return 0;
  // On, off for a blink, then on for good.
  const blink = t > LIGHT_ON + 0.1 && t < LIGHT_ON + 0.2 ? 0.15 : 1;
  return breath * ramp(t, LIGHT_ON, LIGHT_ON + 0.06) * blink;
}

/** A stalk bowed upwards between two points, by `lift` of its length. */
function bowed(a: Pt, b: Pt, lift: number): Pt {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = { x: (b.y - a.y) / (d || 1), y: -(b.x - a.x) / (d || 1) };
  const up = n.y < 0 ? 1 : -1;
  return { x: (a.x + b.x) / 2 + up * n.x * lift * d, y: (a.y + b.y) / 2 + up * n.y * lift * d };
}

/** When the stalk catches on the viper's lip: once its root is in past the lips. */
export const SNAG_AT = (() => {
  for (let t = BITE_AT; t < GULP_AT; t += 0.005) if (insertion(t) >= ROOT_ALONG) return t;
  return BITE_AT + 0.3;
})();
/** The light goes in last: through the lips just as the jaws snap shut. */
export const LIGHT_IN = GULP_AT + 0.06;

/** Where the lure is and how bright, or null once it has been swallowed (or before the next angler's light is on). */
export function lureAt(t: number): Lure | null {
  if (t >= LIGHT_IN && t < DESSERT_FROM) return null;
  const glow = lureLight(t);
  const a = anglerAt(t);
  if (a.kind === 'swimming') {
    const f = a.fish;
    const k = f.length / (2 * bodyProportions('angler').hl);
    const b = bob(t);
    return {
      root: onAngler(f, LURE_ROOT),
      bend: onAngler(f, { x: LURE_BEND.x + b.x * 0.5, y: LURE_BEND.y + b.y * 0.4 }),
      bulb: onAngler(f, { x: LURE_BULB.x + b.x, y: LURE_BULB.y + b.y }),
      snag: null,
      glow,
      k,
      swallowed: 0,
    };
  }
  // Being swallowed (or, in the blink after the gulp, all of it in but the light).
  const f = a.kind === 'swallowed' ? a.fish : anglerIn(t, 1);
  const [squash, stretch] = a.kind === 'swallowed' ? [a.squash, a.stretch] : [SQUEEZE, 1.08];
  const k = ANGLER_K;
  const root = onAngler(f, LURE_ROOT, squash, stretch);
  // Swept back over its head by the rush of water: from hanging in front of its face to trailing over its back.
  const sweep = ramp(t, SUCK_FROM, BITE_AT + 0.15);
  const ahead = { x: LURE_BULB.x - LURE_ROOT.x, y: LURE_BULB.y - LURE_ROOT.y };
  const angle = lerp(Math.atan2(ahead.y, ahead.x), Math.atan2(-0.32, -1), sweep);
  const trailing = onAngler(f, { x: LURE_ROOT.x + Math.cos(angle) * STALK * 0.92, y: LURE_ROOT.y + Math.sin(angle) * STALK * 0.92 }, squash, stretch);
  const m = viperMouth(t);
  // Caught on the lip, it floats out in front, up and away from the mouth, bobbing; shorter as the angler goes in.
  const pulled = ramp(insertion(t), ROOT_ALONG, 0.85);
  const reach = STALK * k * lerp(0.85, 0.5, pulled);
  const sway = -0.55 + 0.22 * Math.sin(2 * Math.PI * 1.5 * t) + 0.12 * Math.sin(2 * Math.PI * 3 * t + 2);
  const caught = { x: m.lip.x + Math.cos(sway) * reach, y: m.lip.y + Math.sin(sway) * reach };
  const hold = ramp(t, SNAG_AT - 0.15, SNAG_AT + 0.2);
  let bulb = { x: lerp(trailing.x, caught.x, hold), y: lerp(trailing.y, caught.y, hold) };
  // The last slurp: the tail goes in, and the light whips to the lips after it, last, as the jaws snap shut.
  const slurp = ramp(t, SLURP_AT + 0.1, GULP_AT - 0.02) ** 2.2;
  bulb = { x: lerp(bulb.x, m.mid.x, slurp), y: lerp(bulb.y, m.mid.y, slurp) };
  const swallowed = ramp(t, GULP_AT - 0.02, LIGHT_IN);
  bulb = { x: bulb.x + m.down.x * swallowed * 0.15 * VIPER_LEN, y: bulb.y + m.down.y * swallowed * 0.15 * VIPER_LEN };
  // The stalk runs out over the lip; once the light is at the lips, from the middle of them.
  const snag = hold > 0.5 ? (slurp < 0.8 ? m.lip : m.mid) : null;
  return { root, bend: bowed(snag ?? root, bulb, 0.18), bulb, snag, glow, k, swallowed };
}

/** The swallowed light shining through the belly: bright as it lands, flickering, out by ~6.9. */
export function bellyLight(t: number): number {
  if (t < LIGHT_IN - 0.02 || t > 7) return 0;
  const flicker = 1 - 0.55 * Math.max(0, Math.sin(2 * Math.PI * 3.1 * (t - GULP_AT))) ** 8 - (t > 6.2 && t < 6.3 ? 0.5 : 0);
  return ramp(t, LIGHT_IN - 0.02, LIGHT_IN + 0.06) * (1 - ramp(t, 5.9, 6.9)) * flicker;
}

// ---------------------------------------------------------------- the camera

/** Screen px per world px before the camera pulls back: the viper about 450 px long. */
export const BASE_ZOOM = 450 / VIPER_LEN;

/** Where the camera looks, ahead of the viper, in the viper's starting lengths (scaled with the pull-back): further ahead while the light comes on in the dark. */
const LEAD: readonly Key[] = [
  { t: 0, at: 0.5, rate: 0 },
  { t: 1.5, at: 0.4 },
  { t: 4.6, at: 0.38 },
  { t: 6.4, at: 0.15 },
  { t: 8.2, at: 0.3 },
  { t: 9.6, at: 0.42 },
  { t: 10.6, at: 0.5 },
  { t: LOOP_S, at: 0.5, rate: 0 },
];

export function viewAt(t: number): View {
  const pull = pullAt(t);
  // The camera trails the viper by a beat (an average over the last half second), so the strike moves on screen.
  const n = 10;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = unwrapped(viperPath, t - (0.5 * i) / (n - 1));
    x += p.x / n;
    y += p.y / n;
  }
  const lead = curveAt(LEAD, t).at * VIPER_LEN * SCALE ** pull;
  return { x: x + lead, y: y + 0.08 * VIPER_LEN * SCALE ** pull, zoom: BASE_ZOOM * SCALE ** -pull };
}


// ---------------------------------------------------------------- the score and the bar

/** The score for the meal, as the game counts it. */
export const SCORE_TEXT = `+${scoreFor(ANGLER_SIZE, 1)}`;
/** The growth points the angler is worth, as the game counts them. */
export const MEAL_POINTS = growthPointsFor(ANGLER_SIZE);

/** The growth bar: a few points short of the last stage, past its mark with the angler; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

/** Captions; a "\n" breaks a line. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'don’t go into the light', y: 380, size: 104, from: -0.45, to: 2.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'there is a light,\nanglerfish', y: 340, size: 104, from: 9.0, to: 11.25 },
];

export const SOUNDS: readonly SoundCue[] = [
  // The strike: water rushing in, the angler dragged to the lips, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  // The stalk catching on the lip: a little twang.
  { id: 'click', t: 1.1, pitch: 0.7, gain: 0.35, pan: 0.25 },
  // The tussle: the tail thrashing, and a heave at a time.
  { id: 'rustle', t: 1.3, pitch: 0.8, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.9, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  // The last slurp, the light whipping in last, and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'suck', t: GULP_AT - 0.2, pitch: 1.9, gain: 0.45, pan: 0.15 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // The light in the belly fizzling out.
  { id: 'zap', t: 6.2, pitch: 0.5, gain: 0.12, pan: 0 },
  { id: 'zap', t: 6.8, pitch: 0.4, gain: 0.08, pan: 0 },
  // The next light clicking on in the dark, the angler coming at you, its mouth thrown open, the "!", the strike.
  { id: 'click', t: LIGHT_ON, pitch: 0.55, gain: 0.6, pan: 0.35 },
  { id: 'click', t: LIGHT_ON + 0.2, pitch: 0.6, gain: 0.45, pan: 0.35 },
  { id: 'lunge', t: 9.3, pitch: 0.35, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: 10.1, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'suck', t: OPEN_FROM + 0.1, pitch: 0.85, gain: 0.35, pan: 0.35 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
