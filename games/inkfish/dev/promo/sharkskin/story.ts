import { heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, ramp, smooth } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "Shark skin is covered in tiny teeth": a shark's scales are dermal
 * denticles, built like teeth (a pulp cavity, dentine, an enameloid cap),
 * and they all point back towards the tail, so the skin feels smooth
 * stroked nose to tail and like sandpaper the other way. In Japan, wasabi
 * is grated on shark skin stretched over a wooden paddle (samegawa oroshi).
 * Told by a narrator (words.ts) over the game's shark holding station in a
 * current, every beat timed to the words, a function of time in seconds
 * over a loop of LOOP_S (script.ts has the notes and sounds).
 *
 *   0     the hook: a magnifying glass on the shark's flank shows rows of
 *         tiny tooth-shaped scales, "tiny teeth"
 *   2.6   "Every scale is built like a tooth": one scale, cut through, next
 *         to a tooth, the same layers; "…they all point to the tail":
 *         arrows on the scales, and one along the shark to its tail
 *   6.4   "Stroke a shark from nose to tail…": a hand comes down and strokes
 *         it nose to tail, the shark's eyes close happily, "smooth ✓"
 *   9.6   "The other way?": the hand turns and strokes tail to nose, in
 *         nervous fits and starts, scratchy lines behind it; "SANDPAPER":
 *         a sheet of sandpaper
 *   12.1  "In Japan, some chefs grate wasabi on shark skin": a chef rubs a
 *         wasabi root in circles on a shark-skin paddle, a mound of paste
 *   15.9  "So next time you have sushi, remember:": a plate of sushi with a
 *         dab of wasabi; the magnifier comes back to the flank, and the loop
 *         finishes the sentence.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const TEETH_AT = said('TEETH.');
export const EVERY_AT = said('Every');
export const SCALE_AT = said('scale');
export const LIKE_AT = said('like');
export const TOOTH_AT = said('tooth,');
export const POINT_AT = said('point');
export const TAIL_AT = said('tail.');
export const STROKE_AT = said('Stroke');
export const NOSE_AT = said('nose');
export const TO_TAIL_AT = said('tail,');
export const FEELS_AT = said('feels');
export const SMOOTH_AT = said('smooth.');
export const OTHER_AT = said('other');
export const WAY_AT = said('way?');
export const SANDPAPER_AT = said('SANDPAPER.');
export const JAPAN_AT = said('Japan,');
export const CHEFS_AT = said('chefs');
export const GRATE_AT = said('grate');
export const WASABI_AT = said('wasabi');
export const ON_SKIN_AT = said('shark', 2);
export const SKIN_AT = said('skin.');
export const SO_AT = said('So');
export const SUSHI_AT = said('sushi,');
export const REMEMBER_AT = said('remember:');

// ---------------------------------------------------------------- the shark

/** One fish on screen. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: -1 | 1;
  /** Nose up, radians (as drawSwimmer takes it). */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** Eyes shut happily, 0 .. 1 (it likes being stroked the right way). */
  readonly content: number;
}

/** Where the shark holds station, nose to the left, swimming against the current (which streams past it to the right). */
export const SHARK = { x: 545, y: 880, len: 700 } as const;

export function sharkAt(t: number): Fish {
  const w = (2 * Math.PI * t) / LOOP_S;
  return {
    x: SHARK.x + 16 * Math.sin(2 * w) + 8 * Math.sin(5 * w + 2),
    y: SHARK.y + 14 * Math.sin(3 * w + 1),
    len: SHARK.len,
    face: -1,
    tilt: 0.03 * Math.cos(3 * w + 1),
    beat: 30 * w,
    effort: 0.45 + 0.1 * Math.sin(4 * w),
    content: Math.min(ramp(t, SMOOTH_AT - 0.2, SMOOTH_AT + 0.1), 1 - ramp(t, OTHER_AT - 0.3, OTHER_AT)),
  };
}

// ---------------------------------------------------------------- the magnifier

/** On the flank, a little ahead of the middle: `along` 0 nose .. 1 tail stalk. */
export const LENS_ALONG = 0.42;
export const LENS_R = 175;

/**
 * How much of the magnifying glass shows, 0 .. 1: up from the first frame,
 * away once the arrows have pointed to the tail (before the hand comes), and
 * back on "remember:" for the loop.
 */
export const lensAt = (t: number): number =>
  t < LOOP_S / 2 ? 1 - ramp(t, TAIL_AT + 0.4, STROKE_AT - 0.05) : ramp(t, REMEMBER_AT - 0.1, REMEMBER_AT + 0.3);

/** The red arrows on each scale, pointing tailwards: drawn on "…point to the tail" (gone with the glass, and not back with it). */
export const arrowsAt = (t: number): number => (t < LOOP_S / 2 ? ramp(t, POINT_AT - 0.15, POINT_AT + 0.35) : 0);

// ---------------------------------------------------------------- the hand

/** The hand's stroke, nose to tail on "from nose to tail", tail to nose on "Like SANDPAPER". */
export const DOWN_FROM = STROKE_AT - 0.3;
export const DOWN_TO = STROKE_AT + 0.35;
export const SMOOTH_FROM = NOSE_AT - 0.08;
export const SMOOTH_TO = TO_TAIL_AT + 0.4;
export const TURN_FROM = OTHER_AT - 0.45;
export const TURN_TO = OTHER_AT - 0.05;
export const ROUGH_FROM = WAY_AT;
export const ROUGH_TO = SANDPAPER_AT + 0.3;
export const AWAY_FROM = ROUGH_TO + 0.1;
export const AWAY_TO = JAPAN_AT - 0.35;
/** Where along the shark the strokes start and end. */
export const NOSE_ALONG = 0.1;
export const TAIL_ALONG = 0.86;
/** How far up the hand lifts away: out of the frame's top at 1. */
const LIFT_PX = 640;

/** Progress over [from, to] in fits and starts: `n` pauses, never going back. */
function halting(t: number, from: number, to: number, n: number): number {
  const u = clamp01((t - from) / (to - from));
  return u - Math.sin(2 * Math.PI * n * u) / (2 * Math.PI * n);
}

export interface Hand {
  /** Where its palm touches (or hovers over) the shark. */
  readonly x: number;
  readonly y: number;
  /** 1 fingers to the right (stroking nose to tail) .. -1 to the left, through 0 as it turns over. */
  readonly face: number;
  /** Where along the shark it is, 0 nose .. 1 tail. */
  readonly along: number;
  readonly alpha: number;
}

/** How far up off the shark the hand is, 0 touching .. 1 gone up out of the frame. */
export function liftAt(t: number): number {
  return 1 - ramp(t, DOWN_FROM, DOWN_TO) + 0.3 * (ramp(t, SMOOTH_TO, SMOOTH_TO + 0.35) - ramp(t, TURN_TO, ROUGH_FROM)) + ramp(t, AWAY_FROM, AWAY_TO);
}

/** Where along the shark the hand is: down at the nose, smoothly to the tail, then back in nervous fits. */
export const handAlong = (t: number): number =>
  NOSE_ALONG + (TAIL_ALONG - NOSE_ALONG) * (ramp(t, SMOOTH_FROM, SMOOTH_TO) - halting(t, ROUGH_FROM, ROUGH_TO, 5));

/** The hand (null when it's out of the picture). */
export function handAt(t: number): Hand | null {
  if (t < DOWN_FROM || t > AWAY_TO) return null;
  const along = handAlong(t);
  const touch = bodyPoint(sharkAt(t), along, -0.55);
  // A nervous tremble while it goes against the grain.
  const rough = Math.min(ramp(t, ROUGH_FROM, ROUGH_FROM + 0.1), 1 - ramp(t, ROUGH_TO - 0.1, ROUGH_TO));
  return {
    x: touch.x,
    y: touch.y - LIFT_PX * liftAt(t) + 4 * rough * Math.sin(t * 73),
    face: 1 - 2 * ramp(t, TURN_FROM, TURN_TO),
    along,
    alpha: Math.min(ramp(t, DOWN_FROM, DOWN_FROM + 0.2), 1 - ramp(t, AWAY_TO - 0.25, AWAY_TO)),
  };
}

/** The trail a stroke leaves on the skin: from where it started to where the hand is, fading after. */
export interface Trail {
  readonly from: number;
  readonly to: number;
  readonly alpha: number;
}

/** Soft, smooth lines behind the hand going with the grain. */
export function smoothTrail(t: number): Trail | null {
  if (t < SMOOTH_FROM || t > OTHER_AT) return null;
  return { from: NOSE_ALONG, to: handAlong(Math.min(t, SMOOTH_TO)), alpha: 1 - ramp(t, SMOOTH_AT + 0.3, OTHER_AT) };
}

/** Scratchy zigzags behind the hand going against it. */
export function roughTrail(t: number): Trail | null {
  if (t < ROUGH_FROM || t > JAPAN_AT) return null;
  return { from: TAIL_ALONG, to: handAlong(Math.min(t, ROUGH_TO)), alpha: 1 - ramp(t, AWAY_FROM, JAPAN_AT) };
}

// ---------------------------------------------------------------- the grater

/** The wasabi root rubbing round in circles on the paddle, from "grate" until the beat ends; its offset from the paddle's middle. */
export function rubAt(t: number): { readonly x: number; readonly y: number } {
  const turns = 2.2 * Math.max(0, t - GRATE_AT);
  const going = Math.min(ramp(t, GRATE_AT - 0.1, GRATE_AT + 0.2), 1 - ramp(t, SO_AT - 0.3, SO_AT));
  const a = 2 * Math.PI * turns;
  return { x: going * 34 * Math.cos(a), y: going * 12 * Math.sin(a) };
}

/** The mound of grated wasabi, 0 .. 1: it builds up from "wasabi" to "skin". */
export const pasteAt = (t: number): number => smooth((t - WASABI_AT) / (SKIN_AT + 0.6 - WASABI_AT));

// ---------------------------------------------------------------- points on the shark

/**
 * A point of the shark on screen: `along` 0 nose .. 1 tail stalk, `side` -1
 * its back .. 1 its belly. Read off the game's drawing (texture px, facing
 * right), bent with the tail as drawSwimmer bends it, then tilted and turned.
 */
export function bodyPoint(f: Fish, along: number, side: number): { readonly x: number; readonly y: number } {
  const a = ANATOMY.shark;
  const k = f.len / (2 * a.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = a.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (a.hl - 2 * a.hl * along) * k;
  const ly = (side * heightAt(a, along) + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}
