import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { type View, type WorldFish } from '../gameplay/fish';
import {
  BITE_AT, DESSERT_FROM, fangAlarm, GULP_AT, HEAVES, LOOP_S, pullAt, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, viperJaw as gapeJaw,
  type Caption, type SoundCue,
} from '../gape/story';
import { lipsOf } from '../gape/swimmer';
import { viperFish, viperLength, VIPER_LEN, VIPER_SIZE, SCALE, BAR_MARKS, GOAL, POINTS_BEFORE } from '../lure/story';

export type { Caption, SoundCue, View, WorldFish };
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, LOOP_S, POINTS_BEFORE, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN, VIPER_SIZE,
  viperFish, viperLength,
};
export { biggerText, captionAlpha, gulpSnap, shake, suction } from '../gape/story';
export { scoreText } from '../slurp/story';

/**
 * "How did that fit 4": the fourth of gape/ (#21), slurp/ (#48) and lure/
 * (#59). You are the viperfish (ability `gape`: canSwallow eats a 'peer'). A
 * swordfish a touch bigger than you cruises ahead, sword first; the viper
 * lunges, jaw swung impossibly wide, and takes it by the TAIL: on frame 1 its
 * rear third is already deep in the jaws. So the sword goes in last: three heaves, eyes squeezed, the body shrinking away until
 * only the sword sticks out of the lips like a toothpick. A beat of
 * stillness, the viper's eyes cross at it, then the last slurp sucks it in
 * with a pop. GULP, the belly balloons with a long thin straight line
 * pressing out from inside, score, "Bigger!". Then the next swordfish, a
 * stage bigger, hangs in the dark ahead, sees the teeth ("!"), and the viper
 * strikes, which is frame 1.
 *
 *   0     mid-lunge: the jaw forced wide round the swordfish's body, its rear third inside, sword out front, its "!"
 *   0.3   water rushes in; 0.75 the bite; heaves at 1.9, 2.8, 3.65
 *   3.85  all in but the sword: a toothpick; 4.1 the viper's eyes cross
 *   4.55  the last slurp; 4.9 GULP (pop, belly balloons, straight line in it, score)
 *   5.6   "Bigger!"; the camera pulls back
 *   8.3   the next swordfish fades up out of the dark ahead
 *   11.35 "!"; 11.6 the viper strikes, which is frame 1.
 */
// ---------------------------------------------------------------- sizes, as the game has them

/** A touch bigger than the viper (51) and its peer (up to 1.1 times: 56). Its sword makes it longer than the viper, and it is drawn bigger still (DRAWN). */
export const SWORD_SIZE = 52;
/** The swordfish's drawing, texture px: body half-length 74, sword 46 past the nose, the tail fin past the stalk. */
const BODY_HL = bodyProportions('swordfish').hl;
export const SWORD_TIP = 46;
export const TAIL_EXT = 26;
export const SWORD_TEX = BODY_HL * 2 + SWORD_TIP + TAIL_EXT;
/** World px per texture px of the first swordfish, and its body length (nose to stalk) and whole length (sword to tail fin). */
export const SWORD_K = (SWORD_SIZE / FISH_RADIUS) * 2 * BODY_HL / (2 * BODY_HL);
export const SWORD_LEN = SWORD_K * 2 * BODY_HL;
export const SWORD_WHOLE = SWORD_K * SWORD_TEX;
/** Share of the whole length that is the sword past the nose. */
export const SWORD_SHARE = SWORD_TIP / SWORD_TEX;
/**
 * A deliberate cheat: the game's peer (the sizes above, which the test holds to)
 * is drawn this much bigger, so that it reads as the big one and its body
 * forces the jaw wide. DRAWN_DEEP adds a little depth on top, where it meets the lips.
 */
export const DRAWN = 1.55;
export const DRAWN_DEEP = 1.1;

const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);
const K_BASE = SWORD_K * DRAWN;

interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- the viper

/** The jaw: swung impossibly wide through the lunge (already wide on frame 1), as #21 has it; then it clamps shut on the sword for the toothpick, and the last slurp is made with the lips nearly shut. */
export const PINCH = 0.55;
export function viperJaw(t: number): number {
  const u = seam(t);
  if (u >= -0.8 && u < 0.3) return 3 * smooth((u + 0.8) / 1.1);
  const base = gapeJaw(t);
  if (t >= TOOTH_JAW && t < GULP_AT) return lerp(base, PINCH + 0.5 * ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.2), ramp(t, TOOTH_JAW, TOOTH_JAW + 0.25));
  if (t >= GULP_AT && t < GULP_AT + 0.1) return (PINCH + 0.5) * (1 - ramp(t, GULP_AT, GULP_AT + 0.07));
  return base;
}
const TOOTH_JAW = HEAVES[2] + 0.2;

/** The swordfish's share of its whole length that is in the viper's mouth: all but the sword at the toothpick, all of it on the gulp. */
export const TOOTHPICK = 1 - SWORD_SHARE;
/** Pointing out of the lips as a toothpick: from the third heave until the last slurp. */
export const TOOTH_FROM = HEAVES[2] + 0.25;

/** On frame 1 the rear third is deep in the jaws: tail fin gone, the lips on the body. */
export const D_START = 0.38;
/** Dragged further in by the rush of water, then the bite. */
const D_BITE = 0.42;

/** How far in it is, `d` of its whole length past the lips (negative: that far ahead of them). */
export function insertion(t: number): number {
  if (t >= GULP_AT) return 1.03;
  if (t >= TOOTH_FROM) return TOOTHPICK + (1.03 - TOOTHPICK) * ramp(t, SLURP_AT, GULP_AT) ** 1.6;
  if (t >= BITE_AT) {
    // A step at each heave, slipping back a little between.
    const steps = (x: number): number => {
      let d = 0;
      for (const h of HEAVES) d += 0.3 * ramp(x, h, h + 0.2) - 0.02 * ramp(x, h - 0.5, h - 0.1);
      return d;
    };
    return D_BITE + (TOOTHPICK - D_BITE) * (steps(t) / steps(TOOTH_FROM));
  }
  if (t >= SUCK_FROM) return lerp(D_START, D_BITE, ((t - SUCK_FROM) / (BITE_AT - SUCK_FROM)) ** 1.6);
  return D_START;
}

/** The gap ahead of the lips (in whole lengths) while it is still free: hanging in the dark, then the strike closes it. */
const GAP: readonly Key[] = [
  { t: DESSERT_FROM, at: 0.2, rate: 0 },
  { t: 9.4, at: 0.1 },
  { t: 10.6, at: 0.04 },
  { t: SPOT_AT, at: 0.02 },
  { t: STRIKE_AT, at: 0.01 },
  { t: LOOP_S, at: -D_START },
];
const freeGap = (t: number): number => curveAt(GAP, t).at;

/** Its place relative to the lips, as the d the swordfish is in (negative: ahead of the lips). */
export const swordD = (t: number): number => (t >= DESSERT_FROM ? -freeGap(t) : insertion(t));

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;

export function viperEyes(t: number): 'squeeze' | 'happy' | 'cross' | null {
  if (t >= TOOTH_FROM && t < SLURP_AT - 0.05) return t > TOOTH_FROM + 0.15 ? 'cross' : null;
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  if (t >= GULP_AT + 0.3 && t < 7.6) return 'happy';
  return null;
}

/** The viper's own lure, kept low. */
export const viperLureGlow = (_t: number): number => 0.5;

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

// ---------------------------------------------------------------- the swordfish

/** Squeezed to fit the shutting lips, by the time only the sword is left. */
const SQUEEZE = 0.8;

/** The swordfish in line with the viper's mouth, tail first, `d` of its whole length past the lips: facing away, so its sword points out of the mouth. */
function swordIn(t: number, d: number): WorldFish {
  const { mid, down: u } = viperMouth(t);
  const k = K_BASE * stageOf(t);
  const whole = SWORD_TEX * k;
  // Along the axis out of the mouth: its tail tip is d into the throat, its centre (BODY_HL + TAIL_EXT) from that.
  const s = -d * whole + (BODY_HL + TAIL_EXT) * k;
  const grip = clamp01(d / 0.12);
  const thrash = 0.05 * Math.sin(2 * Math.PI * 3 * t + 1) * (1 - clamp01((d - 0.1) / 0.7)) * grip;
  return {
    shape: 'swordfish',
    x: mid.x - u.x * s,
    y: mid.y - u.y * s,
    length: SWORD_LEN * DRAWN * stageOf(t),
    facing: 1,
    tilt: Math.atan2(u.y, -u.x) + thrash,
    beat: 2 * Math.PI * 5 * t,
    effort: 0.55 + 0.45 * smooth(grip),
  };
}

export type SwordState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'there'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

export function swordAt(t: number): SwordState {
  if (t >= GULP_AT && t < DESSERT_FROM) return { kind: 'gone' };
  const d = swordD(t);
  const grip = smooth(clamp01(d / 0.14));
  return { kind: 'there', fish: swordIn(t, d), squash: lerp(DRAWN_DEEP, SQUEEZE, ramp(d, 0.5, TOOTHPICK)), stretch: 1 + 0.06 * grip };
}

/** The next swordfish fades up out of the dark: 1 hidden .. 0 in plain view. */
export function swordMurk(t: number): number {
  return isDessert(t) ? 1 - ramp(t, 8.7, 10.2) : 0;
}

/** The viper's swelling: the swordfish going in is long, so a long, rounded belly; its tail is past the hinge already on frame 1. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (t < GULP_AT || (isDessert(t) && swordD(t) > 0)) {
    const inside = Math.max(0, swordD(t) * (SWORD_WHOLE / VIPER_LEN) - hinge);
    return { size: Math.min(0.8, inside * 2.2), at: hinge + 0.05 + inside * 0.45, width: 0.2 + inside * 0.8 };
  }
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 0.95 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.46, 0.52, ramp(t, GULP_AT, 6)), width: 0.74 };
}

/** The sword pressing out through the belly: 0 .. 1, in with the gulp, gone as it is digested. */
export function bellySword(t: number): number {
  if (t < GULP_AT || t > 7.8) return 0;
  return ramp(t, GULP_AT, GULP_AT + 0.08) * (1 - ramp(t, 6.2, 7.6));
}

/** The swordfish's "!": it sees the teeth. */
export const swordAlarm = fangAlarm;

// ---------------------------------------------------------------- the camera

/** Screen px per world px before the camera pulls back: the viper about 500 px long, the swordfish out in front of it. */
export const BASE_ZOOM = 540 / VIPER_LEN;

/** The whole scene is turned this much (radians, counter-clockwise on screen) about the focus, so the lunge climbs the frame and the picture can be big. */
export const ROT = 0.36;
export const FOCUS = { x: 540, y: 800 } as const;
/** A screen point as the turned camera shows it. */
export function rotated(p: Pt): Pt {
  const dx = p.x - FOCUS.x;
  const dy = p.y - FOCUS.y;
  return { x: FOCUS.x + dx * Math.cos(ROT) + dy * Math.sin(ROT), y: FOCUS.y - dx * Math.sin(ROT) + dy * Math.cos(ROT) };
}

function viperWorld(t: number): Pt {
  let k = Math.floor(t / LOOP_S);
  if (t - k * LOOP_S >= LOOP_S) k += 1;
  const p = viperFish(Math.max(0, t - k * LOOP_S));
  const s = SCALE ** k;
  return { x: p.x * s, y: p.y * s };
}

/** Where the camera looks, ahead of the viper, in the viper's starting lengths. */
const LEAD: readonly Key[] = [
  { t: 0, at: 1.03, rate: 0 },
  { t: 0.5, at: 1.05 },
  { t: 1.5, at: 0.8, rate: -0.037 },
  { t: 4.6, at: 0.72 },
  { t: 6.4, at: 0.3 },
  { t: 8.2, at: 0.5, rate: 0.156 },
  { t: 9.6, at: 1.05 },
  { t: 10.6, at: 1.12 },
  { t: 11.3, at: 1.14 },
  { t: LOOP_S, at: 1.03, rate: 0 },
];

/** The camera pushed in round the seam, so the viper's head and the swordfish fill the frame's width; 1 from the third second to past the pull-back. */
const PUSH = 1.12;
const pushAt = (t: number): number => lerp(1, PUSH, Math.max(1 - ramp(t, 0.8, 3), ramp(t, 11, LOOP_S)));

export function viewAt(t: number): View {
  const pull = pullAt(t);
  const n = 10;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = viperWorld(t - (0.5 * i) / (n - 1));
    x += p.x / n;
    y += p.y / n;
  }
  const lead = curveAt(LEAD, t).at * VIPER_LEN * SCALE ** pull;
  return { x: x + lead, y: y + 0.08 * VIPER_LEN * SCALE ** pull, zoom: pushAt(t) * BASE_ZOOM * SCALE ** -pull };
}

// ---------------------------------------------------------------- the score and the bar

export const SCORE_TEXT = `+${scoreFor(SWORD_SIZE, 1)}`;
export const MEAL_POINTS = growthPointsFor(SWORD_SIZE);

export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

export const CAPTIONS: readonly Caption[] = [
  { text: 'wrong end first', y: 380, size: 124, from: 0.2, to: 2.5 },
  { text: 'toothpick?', y: 390, size: 140, from: 3.9, to: 4.6 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'same plan,\nbigger sword', y: 340, size: 104, from: 9.0, to: 11.25 },
];

export const SOUNDS: readonly SoundCue[] = [
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.1, pan: 0.15 },
  { id: 'rustle', t: 1.3, pitch: 0.8, gain: 0.5, pan: 0.3 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  { id: 'rustle', t: 2.35, pitch: 0.9, gain: 0.45, pan: 0.3 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  // The toothpick: a small, dry tick as the eyes cross.
  { id: 'click', t: 4.2, pitch: 0.8, gain: 0.35, pan: 0.2 },
  // The last slurp, the pop as the sword goes in, and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'click', t: GULP_AT - 0.06, pitch: 1.9, gain: 0.6, pan: 0.15 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.35, pan: 0 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // The next swordfish out of the dark, the "!", the strike.
  { id: 'lunge', t: 9.3, pitch: 0.35, gain: 0.4, pan: 0.4 },
  { id: 'rustle', t: 10.1, pitch: 0.6, gain: 0.3, pan: 0.3 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
