import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { fishAt, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey, type PathPoint } from '../gameplay/zoomPath';
import {
  BITE_AT, DESSERT_FROM, fangAlarm, GULP_AT, HEAVES, LOOP_S, pullAt, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, seam, viperJaw, type Caption, type SoundCue,
} from '../gape/story';
import { lipsOf } from '../gape/swimmer';
import { BAR_MARKS, GOAL, POINTS_BEFORE, SCALE, VIPER_LEN, VIPER_SIZE, viperLength } from '../slurp/story';

export type { Caption, SoundCue, View, WorldFish };
// The viper's side of it is #21's, beat for beat: the strike, three heaves, the last slurp, the gulp, the stage-up.
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, LOOP_S, POINTS_BEFORE, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN, VIPER_SIZE,
  viperJaw, viperLength,
};
export { seam } from '../gape/story';
export { biggerText, captionAlpha, gulpSnap, shake, suction, viperEyes } from '../gape/story';
export { scoreText } from '../slurp/story';

/**
 * "How did that fit 7": the viperfish (ability `gape`: canSwallow eats a
 * 'peer', up to 1.1 times its size) takes an OARFISH, "the longest bony fish
 * in the sea": a silver ribbon with a scarlet dorsal fin and a crest of red
 * rays. The joke is the length: on frame 1 the viper's jaws are round the
 * crested head and the ribbon snakes away across the frame and out of it. It
 * slurps in head first like a noodle (it whips side to side as it goes, three
 * heaves, "still going…"), its tail tip goes in last and flicks once; GULP,
 * the belly balloons with the ribbon COILED inside, "Bigger!". Then the next,
 * longer one ribbons in out of the dark, sees the teeth ("!") and the viper
 * strikes, which is frame 1.
 *
 *   0     mid-lunge: the jaw wide round the crested head, the ribbon snaking out of frame
 *   0.3   water rushes in; 0.75 the bite; heaves at 1.9, 2.8, 3.65 (it keeps coming between)
 *   4.3   the tail tip, last out, flicks once; 4.55 the last slurp
 *   4.9   GULP (belly balloons, the ribbon coiled inside, score); 5.6 "Bigger!"
 *   8.3   the next oarfish ribbons in out of the dark
 *   11.35 "!"; 11.6 the viper strikes, which is frame 1.
 */

interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- sizes, as the game has them

/** The oarfish's size: as big as a peer of the 51 viper can be (relationTo: peer up to 1.1 times: 56). Its drawing is the longest in the game. */
export const OAR_SIZE = 56;
export const OAR_BODY_HL = bodyProportions('oarfish').hl;
/** How long the game draws it: its true ribbon length (nose to tail tip). */
export const OAR_LEN = (OAR_SIZE / FISH_RADIUS) * 2 * OAR_BODY_HL;
/**
 * A deliberate cheat, like the other shorts': drawn this much longer than the
 * game's peer, so that it runs across the whole frame. The numbers (OAR_SIZE,
 * the score, the growth) stay true.
 */
export const DRAWN = 2;
/** How deep it is drawn, free in the water and squeezed to the gape. */
export const FREE_DEPTH = 1;
export const SQUEEZE = 0.72;

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
export function viperMouth(t: number): { readonly mid: Pt; readonly down: Pt } {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  return { mid, down: { x: (hinge.x - mid.x) / d, y: (hinge.y - mid.y) / d } };
}

// ---------------------------------------------------------------- how far in it is

/** On frame 1 the crested head is just inside the jaws, then dragged in by the rush of water, and the bite. */
export const D_START = 0.05;
const D_BITE = 0.12;
/** Share of its length in by the time only the tail tip is out. */
export const HOLD = 0.88;
/** The last slurp starts here. */
const LAST_FROM = SLURP_AT - 0.1;

/** How far in it is, `d` of its whole length past the lips (negative: that far ahead of them). */
export function insertion(t: number): number {
  if (t >= GULP_AT) return 1.03;
  if (t >= LAST_FROM) return HOLD + (1.03 - HOLD) * ramp(t, LAST_FROM, GULP_AT) ** 1.5;
  if (t >= BITE_AT) {
    // A step at each heave, slipping back a little, and never quite stopping between: it keeps coming.
    const raw = (x: number): number => {
      let d = 0.09 * ramp(x, BITE_AT, LAST_FROM);
      for (const h of HEAVES) d += 0.2 * ramp(x, h, h + 0.22) - 0.02 * ramp(x, h - 0.5, h - 0.1);
      return d;
    };
    return D_BITE + (HOLD - D_BITE) * (raw(t) / raw(LAST_FROM));
  }
  if (t >= SUCK_FROM) return lerp(D_START, D_BITE, ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6);
  return D_START;
}

/** The gap ahead of the lips (in whole lengths) while it is still free: out in the dark, ribboning in, then the strike closes it. */
const GAP: readonly Key[] = [
  { t: DESSERT_FROM, at: 0.5, rate: 0 },
  { t: 9.4, at: 0.34 },
  { t: 10.6, at: 0.17 },
  { t: SPOT_AT, at: 0.07 },
  { t: STRIKE_AT, at: 0.04 },
  { t: LOOP_S, at: -D_START },
];
export const isDessert = (t: number): boolean => t >= DESSERT_FROM;
/** Its place relative to the lips, as the d the oarfish is in (negative: ahead of the lips). */
export const oarD = (t: number): number => (isDessert(t) ? -curveAt(GAP, t).at : insertion(t));

/** The tail tip's flick: it is the last out of the lips, and flicks once before the final slurp. */
export function tailFlick(t: number): number {
  const s = t - 4.2;
  return s > 0 && s < 0.28 ? Math.sin((Math.PI * s) / 0.28) : 0;
}

// ---------------------------------------------------------------- the ribbon

/** Whole waves along its length, and how hard it whips (share of its length) at its middle; the tail whips more. */
const WAVES = 3;
const WHIP = 0.085;
/** Beats per second of the whip: a whole number of loops. */
const WHIP_HZ = 2;

export interface Ribbon {
  /** Its length in world px (nose to tail tip). */
  readonly length: number;
  /** Its depth, as the squash its drawing gets. */
  readonly squash: number;
  /** The world point `s` px from the nose along the ribbon. */
  readonly at: (s: number) => Pt;
}

export type OarState = { readonly kind: 'gone' } | { readonly kind: 'there'; readonly d: number; readonly ribbon: Ribbon };

/** The head turns on you as it sees the teeth: how far it has swung (0 .. 1). */
function headSwing(t: number): number {
  return ramp(t, 9.6, 10.4) * (1 - ramp(t, 11.3, 11.7));
}

export function oarAt(t: number): OarState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  const W = OAR_LEN * DRAWN * stageOf(t);
  const d = oarD(t);
  const { mid, down } = viperMouth(t);
  const n = { x: -down.y, y: down.x };
  const flick = tailFlick(t);
  const swing = headSwing(t);
  const at = (s: number): Pt => {
    const q = s - d * W;
    if (q <= 0) return { x: mid.x - down.x * q, y: mid.y - down.y * q };
    const f = s / W;
    const env = smooth((q - 0.07 * W) / (0.3 * W));
    const wave = Math.sin(2 * Math.PI * WAVES * f - 2 * Math.PI * WHIP_HZ * t);
    let lat = WHIP * W * env * (0.5 + 0.9 * f) * wave;
    lat += 0.14 * W * flick * smooth((f - 0.88) / 0.1);
    lat -= 0.09 * W * swing * Math.exp(-f * 3) * (d < 0 ? 1 : 0);
    return { x: mid.x - down.x * q + n.x * lat, y: mid.y - down.y * q + n.y * lat };
  };
  return { kind: 'there', d, ribbon: { length: W, squash: lerp(FREE_DEPTH, SQUEEZE, clamp01(d / 0.1)), at } };
}

/** The next oarfish comes out of the dark: 1 hidden .. 0 in plain view. */
export function oarMurk(t: number): number {
  return isDessert(t) ? 1 - ramp(t, 8.7, 10.2) : 0;
}

/** The oarfish's "!" as it sees the teeth, staying up as the loop comes round. */
export const oarAlarm = fangAlarm;

// ---------------------------------------------------------------- the belly

/** The viper's swelling: a long ribbon going in swells it round, and it only grows once the ribbon is past the throat. */
const BELLY_SIZE = 1.6;
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  const d = oarD(t);
  if (t < GULP_AT || (isDessert(t) && d > 0)) {
    const inside = Math.max(0, d * OAR_LEN * DRAWN - hinge * VIPER_LEN) / VIPER_LEN;
    return { size: Math.min(1.15, inside * 1.7), at: hinge + 0.05 + Math.min(inside, 1) * 0.15, width: Math.min(0.74, 0.2 + inside * 0.45) };
  }
  const s = t - GULP_AT;
  const pop = 1 + 0.16 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: BELLY_SIZE * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.47, 0.54, ramp(t, GULP_AT, 6)), width: 0.74 };
}

/** How much of the ribbon shows coiled in the belly through the stretched skin: 0 .. 1, filling as it goes in, gone as it is digested. */
export function bellyCoil(t: number): number {
  const d = oarD(t);
  if (t < GULP_AT) return d > 0 ? 0.85 * ramp(d, 0.3, 0.95) : 0;
  if (t > 7.8 || isDessert(t)) return 0;
  return ramp(t, GULP_AT, GULP_AT + 0.08) * (1 - ramp(t, 6.2, 7.6));
}

// ---------------------------------------------------------------- the camera

/** Screen px per world px before the camera pulls back: the viper about 630 px long. */
export const BASE_ZOOM = 630 / VIPER_LEN;

const LEAD: readonly Key[] = [
  { t: 0, at: 1.0, rate: 0 },
  { t: 1.5, at: 0.8 },
  { t: 4.6, at: 0.6 },
  { t: 5.8, at: 0.1 },
  { t: 6.5, at: 0.02 },
  { t: 8.2, at: 0.3 },
  { t: 9.6, at: 0.6 },
  { t: 10.6, at: 0.9 },
  { t: LOOP_S, at: 1.0, rate: 0 },
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

export const SCORE_TEXT = `+${scoreFor(OAR_SIZE, 1)}`;
export const MEAL_POINTS = growthPointsFor(OAR_SIZE);

export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

/** Captions; a "\n" breaks a line. None on the first frame. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'the LONGEST\nfish in the sea', y: 340, size: 108, from: 0.2, to: 2.6 },
  { text: 'still going…', y: 390, size: 140, from: 3.0, to: 4.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'he brought a\nlonger friend', y: 340, size: 104, from: 9.0, to: 11.25 },
];

export const SOUNDS: readonly SoundCue[] = [
  // The strike: water rushing in, the oarfish dragged to the lips, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  // The ribbon slurping in, a slurp a heave and a rustle of it whipping between.
  { id: 'rustle', t: 1.3, pitch: 0.8, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.55, gain: 0.65, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.9, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  { id: 'suck', t: 3.95, pitch: 0.8, gain: 0.35, pan: 0.1 },
  // The tail tip's flick, the last slurp and the gulp.
  { id: 'rustle', t: 4.3, pitch: 1.4, gain: 0.45, pan: 0.3 },
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.55, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // The next oarfish: ribboning in out of the dark, the "!", the strike.
  { id: 'lunge', t: DESSERT_FROM + 0.4, pitch: 0.3, gain: 0.35, pan: 0.4 },
  { id: 'rustle', t: 9.4, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'rustle', t: 10.4, pitch: 0.7, gain: 0.3, pan: 0.3 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
