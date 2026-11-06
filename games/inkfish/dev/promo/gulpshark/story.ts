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

export type { Caption, SoundCue, View, WorldFish };
// The viper's side of it is #21's, beat for beat: the strike, three heaves, the last slurp, the gulp, the stage-up.
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, insertion, LOOP_S, POINTS_BEFORE, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN,
  VIPER_SIZE, viperJaw, viperLength,
};
export { seam } from '../gape/story';
export { biggerText, captionAlpha, gulpSnap, shake, suction, viperEyes } from '../gape/story';
// The score floats up quicker, gone before "Bigger!" (as slurp/ has it).
export { scoreText } from '../slurp/story';

/**
 * "How did that fit 4": the fourth of gape/ (#21), slurp/ (#48) and lure/
 * (#59). You are the viperfish, whose ability is `gape` (logic/abilities.ts:
 * canSwallow lets it eat a 'peer', a fish up to 1.1 times its own size). A
 * reef shark, as big as a peer can be, circles in the dark and turns on
 * you; the viper lunges with its jaw swung impossibly wide around its nose.
 * The viper wins: the shark goes in head first, tail thrashing, three heaves,
 * the last slurp (the tail fin goes in last, a beat late, and flicks once).
 * GULP: the belly balloons as #21's does, the swallowed shark's dorsal fin
 * pressing out through the stretched skin. "+560", "Bigger!". Then the next
 * shark's fin glides out of the dark, a stage bigger, turns on you, and the
 * viper strikes, which is frame 1.
 *
 *   0     mid-lunge: the jaw on the very tip of the shark's snout, its whole wide-eyed face beside the lips, its "!"
 *   0.3   water rushes in; the shark is dragged to the lips
 *   0.75  head first into the jaws, stuck half way, tail thrashing
 *   1.9   heave, 2.8 heave, 3.65 heave: eyes squeezed, the belly filling
 *   4.55  the last slurp: the tail fin, a beat late, flicks once
 *   4.9   GULP: jaws snap shut, the belly balloons, one triangular fin pressing out of it
 *   5.0   "how did THAT fit"; two chews, eyes smiling shut
 *   5.6   "Bigger!": the next growth stage; the camera pulls back after it
 *   8.3   a fin glides out of the dark
 *   9.0   "he brought his big brother"; ~9.9 the shark turns on you
 *   11.35 "!": it sees the teeth; 11.6 the viper strikes, which is frame 1.
 */

interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- sizes, as the game has them

/**
 * The shark: as big as a peer of the 51 viper can be (relationTo: peer up to
 * 1.1 times), and a stage bigger for the second. The game's reef sharks are
 * giants (90 .. 120); this is a young one the viper's gape can still take.
 */
export const SHARK_SIZE = 56;
export const SHARK_LEN = (SHARK_SIZE / FISH_RADIUS) * 2 * bodyProportions('shark').hl;
/**
 * A deliberate cheat: the game's peer is about the viper's length, which on
 * screen reads as two equal fish, so the shark is DRAWN half as long again
 * and deeper. The game's numbers (SHARK_SIZE, the score, the growth) stay true.
 */
export const DRAWN_SHARK_LEN = 1.5 * SHARK_LEN;
/** The drawn shark's extra depth, free in the water. */
export const SHARK_DEPTH = 1.14;

/** The shark's fin shows first, out of the dark; the shark turns on you. */
export const FIN_FROM = DESSERT_FROM;
export const TURN_AT = 9.95;
export const TURN_S = 0.4;

const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);

// ---------------------------------------------------------------- the viper

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
  if (t - k * LOOP_S >= LOOP_S) k += 1;
  const p = path(Math.max(0, t - k * LOOP_S));
  const s = SCALE ** k;
  return { x: p.x * s, y: p.y * s, vx: p.vx * s, vy: p.vy * s };
}

export function viperFish(t: number): WorldFish {
  return fishAt('viperfish', viperPath(t), viperLength(t), 1, 2, t);
}

/** How much the swelling deepens the body at its fullest: a whole shark in there. */
const BELLY_SIZE = 1.7;
const FIN_GONE = 8.1;

/** The shark in the belly: the swelling's size (0 .. ~1.3), centre and length, in body lengths. Round and deep, as a whole shark is. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (t < GULP_AT) {
    const inside = Math.max(0, insertion(t) * SHARK_LEN - hinge * VIPER_LEN) / VIPER_LEN;
    return { size: Math.min(1, inside * 3.2), at: hinge + 0.05 + inside * 0.4, width: 0.2 + inside * 0.8 };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.16 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: BELLY_SIZE * pop * (1 - ramp(t, 7.4, 9.6)), at: lerp(0.47, 0.54, ramp(t, GULP_AT, 6)), width: 0.74 };
}

/** How far the swallowed shark's dorsal fin presses out through the belly's skin, 0 .. ~1.1: out with the gulp, nudging, gone as the belly goes down. */
export function finBump(t: number): number {
  if (t < GULP_AT || t >= FIN_GONE) return 0;
  return ramp(t, GULP_AT + 0.02, GULP_AT + 0.2) * (1 - ramp(t, 6.9, FIN_GONE)) * (1 + 0.1 * Math.sin(2 * Math.PI * 1.5 * t));
}

// ---------------------------------------------------------------- the shark

/** Where the shark swims while it is free, relative to the viper, in the viper's length at the time: its snout tip just inside the jaws, then out in the dark, then back at you. */
const SNOUT_DX = 0.47 + DRAWN_SHARK_LEN / VIPER_LEN / 2;
const SHARK_REL = [
  { t: 0, dx: SNOUT_DX, dy: 0.09 },
  { t: 0.22, dx: SNOUT_DX + 0.02, dy: 0.09 },
  { t: DESSERT_FROM, dx: 0.9, dy: -0.2 },
  { t: TURN_AT, dx: 1.3, dy: -0.14 },
  { t: 10.8, dx: 1.5, dy: -0.06 },
  { t: SPOT_AT, dx: 1.44, dy: -0.02 },
  { t: 11.75, dx: SNOUT_DX + 0.06, dy: 0.07 },
] as const;
const SHARK_KEYS: readonly PathKey[] = SHARK_REL.map((k) => {
  const p = viperPath(k.t);
  const len = VIPER_LEN * stageOf(k.t);
  return { t: k.t, x: p.x + k.dx * len, y: p.y + k.dy * len };
});
const sharkPath = zoomLoopPath(SHARK_KEYS, LOOP_S, SCALE);

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;

/** The turn: how far through it (0 swimming away .. 1 facing you); the shark's drawing goes narrow as it comes round. */
export const turnPhase = (t: number): number => (isDessert(t) ? ramp(t, TURN_AT - TURN_S / 2, TURN_AT + TURN_S / 2) : 1);

function freeShark(t: number): WorldFish {
  const f = fishAt('shark', sharkPath(t), DRAWN_SHARK_LEN * stageOf(t), -1, 2, t);
  const away = isDessert(t) && t < TURN_AT;
  return { ...f, facing: away ? 1 : -1, effort: Math.max(f.effort, 0.35) };
}

/** How narrow the shark is drawn as it turns: 1 side-on .. ~0.18 head-on. */
export function sharkStretch(t: number): number {
  if (!isDessert(t)) return 1;
  const u = turnPhase(t);
  return u <= 0 || u >= 1 ? 1 : Math.max(0.18, Math.abs(Math.cos(Math.PI * u)));
}

/** The turn flips the shark at its narrowest. */
function turned(f: WorldFish, t: number): WorldFish {
  if (!isDessert(t) || t >= TURN_AT + TURN_S / 2 || t < TURN_AT - TURN_S / 2) return f;
  return { ...f, facing: turnPhase(t) < 0.5 ? 1 : -1 };
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

/** The viper's mouth: the middle of the lips, and the way down its throat. */
function viperMouth(t: number): { readonly mid: Pt; readonly down: Pt } {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  return { mid, down: { x: (hinge.x - mid.x) / d, y: (hinge.y - mid.y) / d } };
}

/** The tail fin's flick: it goes in a beat late and flicks once, as the last slurp pulls it past the lips. */
export function tailFlick(t: number): number {
  const s = t - (SLURP_AT + 0.12);
  return s > 0 && s < 0.2 ? Math.sin((Math.PI * s) / 0.2) : 0;
}

/** The shark `d` of its length into the viper's mouth, head first, squeezed to fit the gape. */
function sharkIn(t: number, d: number): WorldFish {
  const { mid, down: u } = viperMouth(t);
  const back = (0.5 - d) * DRAWN_SHARK_LEN;
  const thrash = 0.09 * Math.sin(2 * Math.PI * 3 * t + 1) * (1 - d) + 0.22 * tailFlick(t);
  return {
    shape: 'shark',
    x: mid.x - u.x * back,
    y: mid.y - u.y * back,
    length: DRAWN_SHARK_LEN,
    facing: -1,
    tilt: Math.atan2(-u.y, -u.x) + thrash,
    beat: 2 * Math.PI * 3 * t * 1.6,
    effort: 1,
  };
}

export type SharkState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

/** How the shark is squeezed in the jaws: deep as the gape is wide. */
const SQUEEZE = 0.82;

export function sharkAt(t: number): SharkState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  if (t < SUCK_FROM || isDessert(t)) return { kind: 'swimming', fish: turned(freeShark(t), t) };
  if (t < BITE_AT) {
    // Dragged from where it was to the lips.
    const e = ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6;
    const from = freeShark(t);
    const to = sharkIn(t, 0);
    return {
      kind: 'swallowed',
      fish: { ...to, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), tilt: lerp(from.tilt, to.tilt, e), beat: from.beat },
      squash: lerp(SHARK_DEPTH, SQUEEZE, e),
      stretch: 1 + 0.08 * e,
    };
  }
  return { kind: 'swallowed', fish: sharkIn(t, insertion(t)), squash: SQUEEZE, stretch: 1.08 };
}

/** The shark's own jaw, 0 shut .. SHARK_GAPE: open for you as the loop comes round, yanked shut as it's dragged in. */
export const SHARK_GAPE = 0.55;
export function sharkJaw(t: number): number {
  const u = seam(t);
  const openFrom = 10.4 - LOOP_S;
  if (u < openFrom || u >= SUCK_FROM + 0.4) return 0;
  return SHARK_GAPE * ramp(u, openFrom, -0.6) * (1 - ramp(u, SUCK_FROM, SUCK_FROM + 0.32));
}

/** The next shark comes out of the dark: 1 hidden .. 0 in plain view. The fin shows first (render.ts). */
export function sharkMurk(t: number): number {
  return isDessert(t) ? 1 - ramp(t, 9.0, 10.5) : 0;
}

/** The fin shows out of the dark before the rest: 0 hidden .. 1 plain. */
export function finLight(t: number): number {
  return isDessert(t) ? ramp(t, FIN_FROM, FIN_FROM + 0.7) * sharkMurk(t) : 0;
}

/** The shark's "!" as it sees the teeth, staying up as the loop comes round. */
export const sharkAlarm = fangAlarm;

/** Its flat black eye goes wide as it sees the teeth (0 .. 1), and stays wide until it's swallowed. */
export function sharkEyeWide(t: number): number {
  const u = seam(t);
  return u < 0 ? ramp(u, SPOT_AT - LOOP_S, SPOT_AT - LOOP_S + 0.1) : t < GULP_AT ? 1 : 0;
}

// ---------------------------------------------------------------- the camera

/** Screen px per world px before the camera pulls back: the viper about 630 px long, the mouth and the shark's face filling the width (both tails may run off it). */
export const BASE_ZOOM = 630 / VIPER_LEN;

const LEAD: readonly Key[] = [
  { t: 0, at: 0.62, rate: 0 },
  { t: 1.5, at: 0.5 },
  { t: 4.6, at: 0.42 },
  { t: 5.8, at: 0.1 },
  { t: 6.5, at: 0.02 },
  { t: 8.2, at: 0.3 },
  { t: 9.6, at: 0.5 },
  { t: 10.6, at: 0.6 },
  { t: LOOP_S, at: 0.62, rate: 0 },
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
export const SCORE_TEXT = `+${scoreFor(SHARK_SIZE, 1)}`;
/** The growth points the shark is worth, as the game counts them. */
export const MEAL_POINTS = growthPointsFor(SHARK_SIZE);

/** The growth bar: a few points short of the last stage, past its mark with the shark; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

/** Captions; a "\n" breaks a line. None on the first frame. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'not the shark', y: 380, size: 124, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'he brought his\nbig brother', y: 340, size: 104, from: 9.0, to: 11.25 },
];

export const SOUNDS: readonly SoundCue[] = [
  // The strike: water rushing in, the shark dragged to the lips, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.4, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  // The tussle: the tail thrashing, and a heave at a time.
  { id: 'rustle', t: 1.3, pitch: 0.8, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.9, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  // The last slurp, the tail fin in a beat late and its flick, and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'rustle', t: SLURP_AT + 0.14, pitch: 1.3, gain: 0.45, pan: 0.2 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.55, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // The next shark: a fin out of the dark, the turn, the "!", the strike.
  { id: 'lunge', t: FIN_FROM + 0.4, pitch: 0.3, gain: 0.35, pan: 0.4 },
  { id: 'rustle', t: 9.4, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'lunge', t: TURN_AT, pitch: 0.35, gain: 0.4, pan: 0.35 },
  { id: 'suck', t: 10.7, pitch: 0.85, gain: 0.3, pan: 0.35 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
