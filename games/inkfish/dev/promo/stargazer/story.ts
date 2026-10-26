import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This fish eats anything that swims over it": the stargazer, buried in
 * the sand with only its eyes and its grim, fringed mouth showing, lunges up
 * at whatever passes overhead in a blink. Some (Astroscopus) carry an
 * electric organ behind the eyes, up to about 50 V, and every one has two
 * venomous spines behind the gill covers. Seen face-on throughout, from low
 * on the seabed. Every beat is a function of video time t (seconds) over a
 * loop of LOOP_S, timed to the narrator's words (words.ts), with a new mood
 * on every sentence (the water's colour, the camera, the face and the sounds).
 *
 *   0     TERROR. "This fish": frame 1, the stargazer bursting up out of the
 *         sand, its huge upturned mouth wide round a silver fish, sand
 *         spraying, a beam of light from above; the jaws snap shut on "fish"
 *   0.9   EERIE. "hides in the sand…": it sinks back until only two eyes and
 *         the grim mouth line show, dusted with sand
 *   2.1   DREAD. "and eats whatever swims OVER it.": a little fish swims over
 *         the eyes, and the eyes follow it
 *   4.2   CURIOUS. "A stargazer: eyes on top, mouth pointing UP.": the sand
 *         slides off as the face rises; little stars over its upturned eyes,
 *         chalk rings round the eyes, a curved arrow up from the mouth
 *   7.3   SUSPENSE. "A fish drifts by…": it sinks again; a fish drifts over
 *   8.55  SHOCK. "gone, in a blink!": the strike, a flash, a sand burst; the
 *         fish is gone and the face sinks back, blinking innocently
 *   9.9   ELECTRIC. "Some even zap you, about fifty VOLTS.": arcs crackle round
 *         its head, a diver's hand gets zapped and jerks back; "50 V"
 *  12.6   SARCASTIC. "Plus venom spines.": close on its cheek, the spine behind
 *         the gill cover juts out and glints
 *  14.3   LAUGH. "Honestly? The most unfair fish in the ocean.": a referee's
 *         whistle and a yellow card, then an "UNFAIR!" stamp; it looks smug
 *  16.9   MISCHIEF. "Remember,": it sinks, a silver fish drifts in over it,
 *         and the strike rises into frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const FISH_AT = said('fish');
export const HIDES_AT = said('hides');
export const SAND_AT = said('sand…');
export const AND_AT = said('and');
export const EATS_AT = said('eats');
export const OVER_AT = said('OVER');
export const STARGAZER_AT = said('stargazer:');
export const EYES_AT = said('eyes');
export const TOP_AT = said('top,');
export const MOUTH_AT = said('mouth');
export const POINTING_AT = said('pointing');
export const UP_AT = said('UP.');
export const UP_END = ends('UP.');
export const A2_AT = said('A', 2);
export const FISH2_AT = said('fish', 2);
export const DRIFTS_AT = said('drifts');
export const GONE_AT = said('gone,');
export const BLINK_AT = said('blink!');
export const SOME_AT = said('Some');
export const ZAP_AT = said('zap');
export const YOU_AT = said('you,');
export const FIFTY_AT = said('fifty');
export const VOLTS_AT = said('VOLTS.');
export const PLUS_AT = said('Plus');
export const VENOM_AT = said('venom');
export const SPINES_AT = said('spines.');
export const HONESTLY_AT = said('Honestly?');
export const UNFAIR_AT = said('unfair');
export const OCEAN_AT = said('ocean.');
export const REMEMBER_AT = said('Remember,');

// ---------------------------------------------------------------- the moods

export type Mood = 'terror' | 'eerie' | 'dread' | 'curious' | 'suspense' | 'shock' | 'electric' | 'sarcastic' | 'laugh' | 'mischief';

/** The jaws shut on the hook's fish, on "fish". */
export const SNAP_T = FISH_AT + 0.02;
/** The strike on "gone,": the head bursts up, the jaws open and snap shut. */
export const STRIKE_T = GONE_AT - 0.06;
export const STRIKE_SNAP = STRIKE_T + 0.3;
/** The strike at the end of the loop, rising into frame 1. */
export const BURST_T = 17.42;

/** A new mood on every sentence, from just before its first word: [start, mood, fade s]. The end goes back to the opening's. */
export const MOOD_KEYS: readonly (readonly [number, Mood, number])[] = [
  [0, 'terror', 0.3],
  [0.85, 'eerie', 0.6],
  [AND_AT - 0.1, 'dread', 0.4],
  [said('A') - 0.1, 'curious', 0.5],
  [A2_AT - 0.15, 'suspense', 0.35],
  [STRIKE_T, 'shock', 0.08],
  [SOME_AT - 0.1, 'electric', 0.35],
  [PLUS_AT - 0.1, 'sarcastic', 0.3],
  [HONESTLY_AT - 0.1, 'laugh', 0.25],
  [16.95, 'mischief', 0.35],
  [BURST_T, 'terror', 0.3],
];

/** The mood now and the one it is fading from: `u` 0 (all `from`) .. 1 (all `to`). */
export function moodAt(t: number): { readonly from: Mood; readonly to: Mood; readonly u: number } {
  const v = wrap(t);
  let i = 0;
  while (i < MOOD_KEYS.length - 1 && v >= MOOD_KEYS[i + 1]![0]) i++;
  const [at, to, fade] = MOOD_KEYS[i]!;
  // The first key continues the last one round the loop.
  if (i === 0) return { from: MOOD_KEYS[MOOD_KEYS.length - 1]![1], to, u: 1 };
  return { from: MOOD_KEYS[i - 1]![1], to, u: ramp(v, at, at + fade) };
}

// ---------------------------------------------------------------- the stargazer

/**
 * How far the head is up out of the sand, world px: 0 buried to the mouth's
 * corners (eyes and lips showing), 290 bursting out to the chin (frame 1).
 */
const RISE: readonly Key[] = [
  { t: 0, at: 290, rate: 100 },
  { t: SNAP_T, at: 330, rate: 0 },
  { t: 1.1, at: 260, rate: -160 },
  { t: 1.7, at: 20, rate: -200 },
  { t: 2.0, at: 0, rate: 0 },
  { t: STARGAZER_AT - 0.1, at: 0, rate: 0 },
  { t: EYES_AT, at: 180, rate: 80 },
  { t: UP_END, at: 210, rate: 0 },
  { t: A2_AT, at: 0, rate: 0 },
  { t: STRIKE_T, at: 0, rate: 0 },
  { t: STRIKE_T + 0.12, at: 250, rate: 800 },
  { t: STRIKE_T + 0.28, at: 300, rate: 0 },
  { t: BLINK_AT, at: 170, rate: -380 },
  { t: BLINK_AT + 0.45, at: 0, rate: 0 },
  { t: SOME_AT, at: 0, rate: 0 },
  { t: ZAP_AT - 0.1, at: 130, rate: 0 },
  { t: PLUS_AT - 0.1, at: 135, rate: 0 },
  { t: SPINES_AT, at: 230, rate: 0 },
  { t: HONESTLY_AT, at: 225, rate: 0 },
  { t: 16.85, at: 215, rate: 0 },
  { t: 17.3, at: 0, rate: 0 },
  { t: BURST_T, at: 0, rate: 0 },
  { t: 17.7, at: 225, rate: 450 },
  { t: LOOP_S, at: 290, rate: 100 },
];
export const riseAt = (t: number): number => curveAt(RISE, wrap(t)).at;

/** The jaws, 0 shut .. 1 gaping: wide round the fish in frame 1, snapping on "fish"; a little open on "mouth pointing UP"; the strike. */
const GAPE: readonly Key[] = [
  { t: 0, at: 0.92, rate: -0.25 },
  { t: SNAP_T - 0.2, at: 0.8, rate: -1.2 },
  { t: SNAP_T, at: 0, rate: 0 },
  { t: POINTING_AT - 0.2, at: 0, rate: 0 },
  { t: UP_AT, at: 0.62, rate: 0 },
  { t: UP_END + 0.15, at: 0.62, rate: 0 },
  { t: A2_AT - 0.05, at: 0, rate: 0 },
  { t: STRIKE_T, at: 0, rate: 0 },
  { t: STRIKE_T + 0.08, at: 1, rate: 0 },
  { t: STRIKE_T + 0.2, at: 0.95, rate: 0 },
  { t: STRIKE_SNAP, at: 0, rate: 0 },
  { t: BURST_T + 0.06, at: 0, rate: 0 },
  { t: 17.68, at: 0.86, rate: 0.5 },
  { t: LOOP_S, at: 0.92, rate: -0.25 },
];
export const gapeAt = (t: number): number => clamp01(curveAt(GAPE, wrap(t)).at);

/** Where the pupils look, -1 .. 1 each way (up is -y): up by default, following the fish that pass over. */
const LOOK_X: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: AND_AT, at: 0, rate: 0 },
  { t: AND_AT + 0.35, at: -0.85 },
  { t: OVER_AT, at: 0.1 },
  { t: 4.15, at: 0.9 },
  { t: STARGAZER_AT + 0.3, at: 0, rate: 0 },
  { t: A2_AT + 0.1, at: 0, rate: 0 },
  { t: DRIFTS_AT, at: 0.85 },
  { t: STRIKE_T, at: 0.05, rate: 0 },
  { t: BLINK_AT + 0.25, at: -0.75, rate: 0 },
  { t: SOME_AT + 0.3, at: 0, rate: 0 },
  { t: ZAP_AT - 0.1, at: 0.7, rate: 0 },
  { t: YOU_AT + 0.3, at: 0.6, rate: 0 },
  { t: PLUS_AT, at: 0.15, rate: 0 },
  { t: HONESTLY_AT + 0.2, at: 0.55, rate: 0 },
  { t: 16.85, at: 0.4, rate: 0 },
  { t: 17.1, at: -0.85, rate: 0 },
  { t: BURST_T + 0.1, at: -0.2 },
  { t: LOOP_S, at: 0, rate: 0 },
];
const LOOK_Y: readonly Key[] = [
  { t: 0, at: -0.75, rate: 0 },
  { t: STARGAZER_AT, at: -0.75, rate: 0 },
  { t: STARGAZER_AT + 0.3, at: -0.95, rate: 0 },
  { t: TOP_AT + 0.2, at: -0.95, rate: 0 },
  { t: BLINK_AT, at: -0.75, rate: 0 },
  { t: SOME_AT + 0.3, at: -0.2, rate: 0 },
  { t: PLUS_AT, at: -0.2, rate: 0 },
  { t: HONESTLY_AT + 0.2, at: 0.15, rate: 0 },
  { t: 16.85, at: 0.1, rate: 0 },
  { t: 17.1, at: -0.75, rate: 0 },
  { t: LOOP_S, at: -0.75, rate: 0 },
];
export const lookAt = (t: number): { readonly x: number; readonly y: number } => ({ x: curveAt(LOOK_X, wrap(t)).at, y: curveAt(LOOK_Y, wrap(t)).at });

/** The eyelids, 0 open .. 1 shut: an innocent blink on "blink!", smug half-lids for the joke and as it sinks again. */
export function lidsAt(t: number): number {
  const u = wrap(t);
  const blink = window01(u, BLINK_AT + 0.02, BLINK_AT + 0.3, 0.1);
  const smug = 0.5 * window01(u, HONESTLY_AT + 0.1, 17.35, 0.3);
  return Math.max(blink, smug);
}

/** The sand over its face, 0 clean .. 1 dusted like the seabed: the more of it is buried, the more. */
export const dustAt = (t: number): number => 1 - ramp(riseAt(t), 30, 170);

// ---------------------------------------------------------------- the camera

/** World: the sand's surface at y 0, the head's middle at x 0. Screen = (world - centre) × zoom + (540, 960). */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const CAM_X: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: PLUS_AT - 0.1, at: 0, rate: 0 },
  { t: SPINES_AT, at: 230, rate: 0 },
  { t: HONESTLY_AT - 0.2, at: 236, rate: 0 },
  { t: HONESTLY_AT + 0.4, at: 0, rate: 0 },
  { t: LOOP_S, at: 0, rate: 0 },
];
const CAM_Y: readonly Key[] = [
  { t: 0, at: -167, rate: -25 },
  { t: SNAP_T, at: -185 },
  { t: 1.1, at: -178 },
  { t: 1.7, at: -165 },
  { t: AND_AT, at: -162 },
  { t: 4.05, at: -200 },
  { t: STARGAZER_AT, at: -215 },
  { t: EYES_AT, at: -204 },
  { t: UP_END, at: -215 },
  { t: A2_AT, at: -170 },
  { t: STRIKE_T, at: -175, rate: 0 },
  { t: STRIKE_T + 0.25, at: -225, rate: 0 },
  { t: BLINK_AT + 0.35, at: -190 },
  { t: SOME_AT, at: -200 },
  { t: ZAP_AT - 0.1, at: -273 },
  { t: PLUS_AT - 0.1, at: -275, rate: 0 },
  { t: SPINES_AT, at: -250, rate: 0 },
  { t: HONESTLY_AT - 0.2, at: -250, rate: 0 },
  { t: HONESTLY_AT + 0.4, at: -270, rate: 0 },
  { t: OCEAN_AT, at: -300 },
  { t: 17.25, at: -178 },
  { t: BURST_T + 0.15, at: -172 },
  { t: LOOP_S, at: -167, rate: -25 },
];
const CAM_Z: readonly Key[] = [
  { t: 0, at: 1.3, rate: 0.04 },
  { t: SNAP_T, at: 1.33 },
  { t: 1.1, at: 1.4 },
  { t: 1.7, at: 1.55 },
  { t: AND_AT, at: 1.6 },
  { t: 4.05, at: 1.75 },
  { t: STARGAZER_AT, at: 1.6 },
  { t: EYES_AT, at: 1.4 },
  { t: UP_END, at: 1.42 },
  { t: A2_AT, at: 1.45 },
  { t: STRIKE_T, at: 1.6, rate: 0 },
  { t: STRIKE_T + 0.25, at: 1.25, rate: 0 },
  { t: BLINK_AT + 0.35, at: 1.35 },
  { t: SOME_AT, at: 1.45 },
  { t: ZAP_AT - 0.1, at: 1.5 },
  { t: PLUS_AT - 0.1, at: 1.5, rate: 0 },
  { t: SPINES_AT, at: 1.75, rate: 0 },
  { t: HONESTLY_AT - 0.2, at: 1.78, rate: 0 },
  { t: HONESTLY_AT + 0.4, at: 1.3, rate: 0 },
  { t: OCEAN_AT, at: 1.05 },
  { t: 17.25, at: 1.45 },
  { t: BURST_T + 0.15, at: 1.38 },
  { t: LOOP_S, at: 1.3, rate: 0.04 },
];

/** Jolts of the picture: the snap in the hook, the strike, the stamp; px. */
const JOLTS: readonly (readonly [number, number, number])[] = [
  [SNAP_T, 18, 0.4],
  [STRIKE_SNAP, 30, 0.5],
  [UNFAIR_AT + 0.1, 22, 0.35],
];
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const [at, size, len] of JOLTS) {
    const s = u - at;
    if (s < 0 || s > len) continue;
    const amp = size * (1 - s / len) ** 2;
    x += amp * Math.sin(s * 115);
    y += amp * 0.7 * Math.cos(s * 140);
  }
  return { x, y };
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: curveAt(CAM_Z, u).at };
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: 540 + (p.x - cam.x) * cam.zoom, y: 960 + (p.y - cam.y) * cam.zoom });

/** The head's frame: world y of its middle (head px = world px), rising out of the sand. */
const BURIED_Y = -45;
export const headAt = (t: number): Pt => ({ x: 0, y: BURIED_Y - riseAt(t) });

// ---------------------------------------------------------------- the fish that pass over

/** A little silver fish: world position and length, and how far it's between the jaws. */
export interface Prey {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** 0 out in the water .. 1 down the throat (shrinks and darkens). */
  readonly deep: number;
  /** 0 out in the water (drawn over everything) .. 1 between the jaws (drawn behind the chin, hidden above the upper lip); in between it fades across. */
  readonly mouth: number;
}

/** Where a fish held across the mouth sits, below the head's middle, head px. */
export const IN_MOUTH_DY = 40;
export const BIG_FISH = 720;
const SMALL_FISH = 360;

/** The hook's fish, held across the mouth and slurped in, gone at the snap; the same fish drifting in at the end. */
function hookFish(u: number): Prey | null {
  if (u < SNAP_T) {
    const s = (u / SNAP_T) ** 2;
    const head = headAt(u);
    return {
      x: 0, y: head.y + IN_MOUTH_DY + 90 * s, length: BIG_FISH * (1 - 0.45 * s), facing: 1, tilt: 0.06 - 0.1 * s,
      beat: u * 26, effort: 1, deep: s, mouth: 1,
    };
  }
  if (u < 16.6) return null;
  // Drifting in from the left, unhurried, until the head rises round it.
  const x = curveAt([{ t: 16.6, at: -1250, rate: 950 }, { t: 17.55, at: -120, rate: 500 }, { t: LOOP_S, at: 0, rate: 0 }], u).at;
  const free = -430 + 12 * Math.sin(u * 5);
  const hold = ramp(u, 17.5, 17.88);
  const y = free + (headAt(u).y + IN_MOUTH_DY - free) * hold;
  const scared = ramp(u, BURST_T, BURST_T + 0.2);
  // The tail beat speeds up as it panics, reaching the hook's 26 rad/s (and phase) at the loop point.
  const beat = -(8 * (LOOP_S - u) + 18 * Math.max(0, LOOP_S - Math.max(u, BURST_T + 0.1)));
  return {
    x, y, length: BIG_FISH, facing: 1, tilt: 0.06 * hold + 0.05 * Math.sin(u * 3) * (1 - hold),
    beat, effort: 0.35 + 0.65 * scared, deep: 0, mouth: ramp(hold, 0.45, 0.9),
  };
}

/** The fish that swims over its eyes on "and eats whatever swims OVER it". */
function overFish(u: number): Prey | null {
  if (u < AND_AT - 0.3 || u > 4.45) return null;
  const s = (u - (AND_AT - 0.3)) / (4.45 - (AND_AT - 0.3));
  return { x: -980 + 1960 * s, y: -420 + 14 * Math.sin(u * 4), length: SMALL_FISH, facing: 1, tilt: 0.04 * Math.sin(u * 3), beat: u * 9, effort: 0.3, deep: 0, mouth: 0 };
}

/** The fish that drifts by and is gone on "gone,". */
function driftFish(u: number): Prey | null {
  const from = A2_AT - 0.35;
  if (u < from || u > STRIKE_SNAP) return null;
  const x = curveAt([{ t: from, at: 950, rate: -900 }, { t: STRIKE_T, at: 30, rate: -120 }, { t: STRIKE_SNAP, at: 0, rate: 0 }], u).at;
  const pull = ramp(u, STRIKE_T + 0.04, STRIKE_SNAP - 0.04);
  const free = -420 + 10 * Math.sin(u * 4);
  const y = free + (headAt(u).y + IN_MOUTH_DY + 60 - free) * pull;
  return {
    x, y, length: SMALL_FISH * (1 - 0.35 * pull), facing: -1, tilt: 0.04 * Math.sin(u * 3), beat: u * 7, effort: 0.25 + 0.75 * pull, deep: pull,
    mouth: ramp(pull, 0.3, 0.7),
  };
}

/** Every fish on screen at t. */
export function preyAt(t: number): readonly Prey[] {
  const u = wrap(t);
  return [hookFish(u), overFish(u), driftFish(u)].filter((p): p is Prey => p !== null);
}

// ---------------------------------------------------------------- sand bursts and flashes

/** A puff of sand: when, how hard, how many grains, from how wide a stretch of the seabed. */
export interface Burst {
  readonly at: number;
  readonly power: number;
  readonly count: number;
  readonly width: number;
  readonly seed: number;
}
export const BURSTS: readonly Burst[] = [
  { at: BURST_T + 0.12, power: 1, count: 150, width: 380, seed: 11 },
  { at: 1.05, power: 0.25, count: 50, width: 340, seed: 23 },
  { at: STARGAZER_AT, power: 0.3, count: 70, width: 300, seed: 31 },
  { at: UP_END + 0.05, power: 0.22, count: 50, width: 340, seed: 37 },
  { at: STRIKE_T + 0.04, power: 1.05, count: 150, width: 380, seed: 41 },
  { at: BLINK_AT + 0.1, power: 0.25, count: 50, width: 340, seed: 47 },
  { at: 16.95, power: 0.22, count: 50, width: 340, seed: 53 },
];
/** How long a grain is in the water, s. */
export const GRAIN_LIFE = 1.7;
/** Seconds since a burst (wrapping round the loop), or null if it has settled. */
export function burstAge(b: Burst, t: number): number | null {
  const age = wrap(wrap(t) - b.at);
  return age < GRAIN_LIFE ? age : null;
}

/** The white flash of the strike. */
export const flashAt = (t: number): number => 0.6 * window01(wrap(t), STRIKE_SNAP - 0.02, STRIKE_SNAP + 0.22, 0.07);
