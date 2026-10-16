import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "To a shark, you look like THIS": Ryan et al. (2021, Journal of the Royal
 * Society Interface, Macquarie University) filmed surfers, swimmers and seals
 * from below and modelled what a young white shark's eyes make of them: by
 * silhouette, it can't tell a paddling surfer from a seal. Told by a narrator
 * (words.ts) from under the water, looking up at the bright surface, every
 * beat timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     from below: a surfer paddling on a short board, a dark silhouette
 *         against the bright surface, tagged "you"; the shark beneath,
 *         looking up; a seal swims in, and on "THIS" it's beside the surfer,
 *         "you = seal"
 *   3.0   "Scientists filmed surfers and seals from below": a camera on the
 *         seabed, its sight lines up to the two silhouettes
 *   5.6   "…then saw them the way a young white shark does": the shark's
 *         view turns grey and blurred ("shark vision"), the shark tagged
 *   8.0   "The shark's eyes couldn't tell them APART": its eye ringed, a "?"
 *         over it, a dashed "=" between the two blurred blobs
 *   10.1  "It may be why sharks bite people: they think you're a seal": back
 *         to clear water, the seal swims off, the shark rises towards the
 *         surfer, who is tagged "seal?"; it veers away well short of him
 *   14.3  "So next time you paddle out, remember:": the surfer paddles on,
 *         the shark circles below, the seal swims in again, and the loop
 *         finishes the sentence.
 */
export const LOOP_S = 16.5;

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
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

export const THIS_AT = said('THIS.');
export const SCIENTISTS_AT = said('Scientists');
export const FILMED_AT = said('filmed');
export const SURFERS_AT = said('surfers');
export const SEALS_AT = said('seals');
export const BELOW_AT = said('below,');
export const THEN_AT = said('then');
export const SAW_AT = said('saw');
export const YOUNG_AT = said('young');
export const EYES_AT = said('eyes');
export const COULDNT_AT = said("couldn't");
export const APART_AT = said('APART.');
export const IT_AT = said('It');
export const SHARKS_AT = said('sharks');
export const PEOPLE_AT = said('people:');
export const SEAL_AT = said('seal.');
export const SO_AT = said('So');
export const YOU_AGAIN_AT = said('you', 2);
export const PADDLE_AT = said('paddle');
export const REMEMBER_AT = said('remember:');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => { readonly at: number; readonly rate: number } {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t));
}

/** Fades in over `fade` s from `from`, holds, and out by `to`, even across the loop point (`to` before `from`). */
export function span01(t: number, from: number, to: number, fade: number): number {
  const u = wrap(t - from);
  const len = wrap(to - from);
  return window01(u, 0, len, fade);
}

// ---------------------------------------------------------------- the surface

/** The water's surface, seen from below, and the surfer lying on it. */
export const SURFACE_Y = 500;
export const SEABED_Y = 1150;
export const SURFER_X = 360;
/** Paddle strokes a loop: each arm in turn, one every 1.5 s. */
const STROKES = 11;

export interface Surfer {
  readonly x: number;
  readonly y: number;
  /** The near arm's stroke phase (radians); the far arm is half a stroke behind. */
  readonly stroke: number;
}

/** The surfer paddles on the spot all loop (the water drifts past), bobbing on the swell. */
export const surferAt = (t: number): Surfer => ({
  x: SURFER_X + 6 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S),
  y: SURFACE_Y + 4 * Math.sin((2 * Math.PI * 5 * t) / LOOP_S),
  // Half-way through a pull at the loop's start, so the first frame shows an arm deep in the water.
  stroke: Math.PI / 2 + (2 * Math.PI * STROKES * t) / LOOP_S,
});

// ---------------------------------------------------------------- the fish

/** One swimmer on screen: the shark, or the seal. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** -1 (left) .. 1 (right): passes through 0 as it turns. */
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

const TURN_S = 0.5;
export const SHARK_LEN = 420;
const SHARK_Y = 960;

/**
 * The shark circles below: left under the surfer, round, right under the
 * pair while it looks at them, round again, then up towards the surfer on
 * "sharks bite people". On "seal." it turns away and dives, swims off right,
 * and comes round once more as the loop finishes the sentence.
 */
export const SHARK_TURNS = [THEN_AT - 0.55, IT_AT - 0.45, SEAL_AT + 0.05, PADDLE_AT + 0.2] as const;
export const RISE_FROM = SHARKS_AT - 0.3;
/** The closest it comes, below the surfer's hands: well short of him. */
export const RISE_TOP = 790;

const sharkX = looped([
  { t: 0, at: 760, rate: -58 },
  { t: SHARK_TURNS[0], at: 480, rate: -30 },
  { t: SHARK_TURNS[0] + TURN_S, at: 475, rate: 30 },
  { t: SHARK_TURNS[1], at: 660, rate: 40 },
  { t: SHARK_TURNS[1] + TURN_S, at: 665, rate: -40 },
  { t: SEAL_AT - 0.05, at: 570, rate: -35 },
  { t: SHARK_TURNS[2] + TURN_S, at: 580, rate: 160 },
  { t: SHARK_TURNS[3], at: 800, rate: 60 },
  { t: SHARK_TURNS[3] + TURN_S, at: 805, rate: -55 },
]);

const sharkY = looped([
  { t: 0, at: SHARK_Y },
  { t: RISE_FROM, at: SHARK_Y },
  { t: SEAL_AT, at: RISE_TOP },
  { t: SHARK_TURNS[2] + TURN_S + 0.3, at: 945, rate: 50 },
  { t: SHARK_TURNS[3], at: SHARK_Y + 10 },
]);

/** Looking up at the surface all along, nose right up as it rises, and down as it dives away. */
const sharkTilt = looped([
  { t: 0, at: 0.14 },
  { t: SAW_AT, at: 0.2 },
  { t: RISE_FROM, at: 0.16 },
  { t: SHARKS_AT + 0.5, at: 0.38 },
  { t: SEAL_AT, at: 0.34 },
  { t: SHARK_TURNS[2] + TURN_S, at: -0.28 },
  { t: SHARK_TURNS[3], at: 0.02 },
  { t: REMEMBER_AT + 0.3, at: 0.14 },
]);

/** How far it has been turned, -1 .. 1: left, right, left, right, and left again for the loop. */
const sharkFace = (t: number): number =>
  -1 + 2 * (SHARK_TURNS.reduce((s, at, i) => s + (i % 2 === 0 ? 1 : -1) * ramp(t, at, at + TURN_S), 0));

export function sharkAt(t: number): Fish {
  const x = sharkX(t);
  const turning = Math.max(...SHARK_TURNS.map((at) => Math.sin(Math.PI * ramp(t, at, at + TURN_S))));
  const rising = window01(t, RISE_FROM, SHARK_TURNS[2] + TURN_S + 0.4, 0.5);
  return {
    x: x.at,
    y: sharkY(t).at + 10 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S),
    len: SHARK_LEN,
    face: sharkFace(t),
    tilt: sharkTilt(t).at,
    beat: (2 * Math.PI * 18 * t) / LOOP_S,
    effort: 0.3 + 0.3 * Math.max(turning, rising) + 0.3 * ramp(Math.abs(x.rate), 60, 220),
  };
}

/** Where the shark's eye is on screen (the game's shark has it 37% of a length ahead of its middle). */
export function eyeOf(f: Fish): { readonly x: number; readonly y: number } {
  const px = 0.37 * f.len;
  const py = -0.03 * f.len;
  return {
    x: f.x + f.face * (px * Math.cos(f.tilt) + py * Math.sin(f.tilt)),
    y: f.y - px * Math.sin(f.tilt) + py * Math.cos(f.tilt),
  };
}

/** Where its nose is. */
export function noseOf(f: Fish): { readonly x: number; readonly y: number } {
  return { x: f.x + f.face * 0.5 * f.len * Math.cos(f.tilt), y: f.y - 0.5 * f.len * Math.sin(f.tilt) };
}

// ---------------------------------------------------------------- the seal

export const SEAL_LEN = 260;
export const SEAL_X = 860;
/**
 * The seal swims in from the right on "So…", stopping beside the surfer as
 * "THIS" is said; it turns away on "It may be…" and swims off right, and
 * turns back out of sight to come in again.
 */
export const SEAL_IN = SO_AT;
export const SEAL_ARRIVES = THIS_AT - 0.05;
export const SEAL_TURN = IT_AT - 0.35;
export const SEAL_GONE = PEOPLE_AT;
const SEAL_OFF = 1320;

const sealX = looped([
  { t: SEAL_ARRIVES, at: SEAL_X + 5, rate: -6 },
  { t: SEAL_TURN, at: SEAL_X - 20, rate: -6 },
  { t: SEAL_TURN + TURN_S, at: SEAL_X - 15, rate: 80 },
  { t: SEAL_GONE, at: SEAL_OFF, rate: 450 },
  { t: SEAL_IN, at: SEAL_OFF, rate: -330 },
]);

/** Facing left, turned right to swim off, and back to facing left while it's off screen. */
const sealFace = (t: number): number => {
  if (t > (SEAL_GONE + SEAL_IN) / 2) return -1;
  return -1 + 2 * ramp(t, SEAL_TURN, SEAL_TURN + TURN_S);
};

/** The seal, just under the surface (null while it's off to the right). */
export function sealAt(t: number): Fish | null {
  const x = sealX(t).at;
  if (x - 0.6 * SEAL_LEN > 1080) return null;
  const swim = Math.abs(sealX(t).rate);
  return {
    x,
    y: SURFACE_Y + 48 + 6 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S + 1),
    len: SEAL_LEN,
    face: sealFace(t),
    tilt: 0.04 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S),
    beat: (2 * Math.PI * 14 * t) / LOOP_S,
    effort: 0.3 + 0.6 * ramp(swim, 20, 300),
  };
}

// ---------------------------------------------------------------- the study

/** The scientists' camera on the seabed, from "Scientists" until the shark's view takes over. */
export const CAMERA = { x: 175, y: SEABED_Y } as const;
export const cameraAt = (t: number): number => window01(t, SCIENTISTS_AT - 0.1, SAW_AT + 0.5, 0.35);
/** Its sight lines up to the surfer and the seal, on "filmed…from below". */
export const filmingAt = (t: number): number => window01(t, FILMED_AT - 0.05, SAW_AT + 0.3, 0.25);
/** The red recording light, blinking twice a second while it films. */
export const recAt = (t: number): boolean => filmingAt(t) > 0.5 && Math.floor(t * 4) % 2 === 0;

/** Shark vision: its view of the surface turns grey and blurred on "saw", and clears on "It may be…". */
export const visionAt = (t: number): number => window01(t, SAW_AT - 0.1, IT_AT + 0.45, 0.5);
