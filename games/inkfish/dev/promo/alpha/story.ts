import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "Something ate a great white shark": Shark Alpha, a 9 ft (about 3 m)
 * female great white tagged off south-western Australia in November 2003.
 * Months later her tag dived suddenly to 580 m (1,903 ft) and the
 * temperature it read jumped from 8 °C to 26 °C: it was inside a warm gut.
 * The tag washed up on a beach. What ate her is unknown.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). One scene at a time, with short
 * crossfades between them:
 *
 *   0     "Something ATE a great white shark!": deep cold water; the shark
 *         (tag on its fin) half in a vast dark mouth rising from below; the
 *         mouth shuts on "shark!"
 *   2.3   "In two thousand three, scientists tagged a nine-foot great white off
 *         Australia.": ⏪ the sunny surface, the research boat, a scientist
 *         tagging the fin; "Australia, 2003", then "9 ft (2.7 m)"
 *   6.7   "Months later, its tag plunged nearly two thousand feet…": the tag on
 *         the fin, close; then the plunge: a depth line streaking down, the
 *         readout counting to "580 m (1,900 ft)"
 *   10.4  "and the water around it turned WARM.": a thermometer by the tag shoots
 *         from 8 °C (46 °F) to 26 °C (78 °F); the cold blue turns red-orange
 *   12.9  "It was inside something's stomach.": pull back: the tag glowing inside
 *         a huge dark body, as in an X-ray
 *   14.8  "A bigger great white? An orca?": the two suspects as silhouettes, a "?"
 *         by each
 *   16.6  "Nobody knows.": the tag on a sunny beach, a crab nudging it
 *   18.2  "All we know is,": under the water again, the mouth rising round the
 *         shark into frame 1.
 */

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

export const ATE_AT = said('ATE');
export const SHARK_AT = said('shark!');
export const TWO_AT = said('two');
export const SCIENTISTS_AT = said('scientists');
export const TAGGED_AT = said('tagged');
export const NINE_AT = said('nine-foot');
export const AUSTRALIA_AT = said('Australia.');
export const MONTHS_AT = said('Months');
export const TAG_AT = said('tag');
export const PLUNGED_AT = said('plunged');
export const FEET_AT = said('feet…');
export const AND_AT = said('and');
export const WATER_AT = said('water');
export const TURNED_AT = said('turned');
export const WARM_AT = said('WARM.');
export const IT_AT = said('It');
export const INSIDE_AT = said('inside');
export const STOMACH_AT = said('stomach.');
export const A_AT = said('A');
export const BIGGER_AT = said('bigger');
export const AN_AT = said('An');
export const ORCA_AT = said('orca?');
export const ORCA_END = ends('orca?');
export const NOBODY_AT = said('Nobody');
export const KNOWS_AT = said('knows.');
export const ALL_AT = said('All');

// ---------------------------------------------------------------- scenes

export type SceneId = 'deep' | 'surface' | 'dive' | 'belly' | 'suspects' | 'beach';

/** The jaws shut on the shark in the hook, just after "shark!" starts. */
export const SHUT_T = SHARK_AT + 0.12;

/** Crossfades: [from, to, the scene before, the scene after]. The last is a dive under the waterline. */
const CUTS: readonly (readonly [number, number, SceneId, SceneId])[] = [
  [2.3, 2.66, 'deep', 'surface'],
  [MONTHS_AT - 0.2, MONTHS_AT, 'surface', 'dive'],
  [IT_AT - 0.08, IT_AT + 0.12, 'dive', 'belly'],
  [A_AT - 0.18, A_AT - 0.02, 'belly', 'suspects'],
  [ORCA_END + 0.04, ORCA_END + 0.26, 'suspects', 'beach'],
];
/** The waterline sweeping up the screen as we go under again, from the beach to the deep. */
export const DUNK = { from: ALL_AT - 0.18, to: ALL_AT + 0.2 } as const;

/** What's on screen at t: one scene, or two mixing (`mix` of the second over the first). */
export interface SceneMix {
  readonly a: SceneId;
  readonly b: SceneId | null;
  readonly mix: number;
}

export function sceneAt(t: number): SceneMix {
  const u = wrap(t);
  if (u >= DUNK.to || u < CUTS[0]![0]) return { a: 'deep', b: null, mix: 0 };
  if (u >= DUNK.from) return { a: 'beach', b: 'deep', mix: ramp(u, DUNK.from, DUNK.to) };
  for (let i = CUTS.length - 1; i >= 0; i--) {
    const [from, to, before, after] = CUTS[i]!;
    if (u >= to) return { a: after, b: null, mix: 0 };
    if (u >= from) return { a: before, b: after, mix: ramp(u, from, to) };
  }
  return { a: 'deep', b: null, mix: 0 };
}

/** The ⏪ over the picture as the story jumps back to 2003, 0 .. 1. */
export const rewindAt = (t: number): number => window01(wrap(t), 2.15, 2.98, 0.16);

// ---------------------------------------------------------------- the gulp (frame 1 and the end)

/**
 * The gulp runs on its own clock: 0 is frame 1 (the shark a third into the
 * open mouth), 1 the jaws shut, below 0 the mouth still rising out of the
 * dark. The hook plays it in slow motion, then snaps it shut on "shark!";
 * the end runs it up from far below to 0, at the same pace as the start.
 */
const OPENING_RATE = 0.14;
const HOOK_CLOCK: readonly Key[] = [
  { t: 0, at: 0, rate: OPENING_RATE },
  { t: 1.45, at: 0.3, rate: 0.35 },
  { t: SHUT_T, at: 1, rate: 1.1 },
  { t: 2.7, at: 1.7, rate: 0.6 },
];
const END_CLOCK: readonly Key[] = [
  { t: DUNK.from, at: -1.35, rate: 0.5 },
  { t: ALL_AT + 0.4, at: -0.95, rate: 0.75 },
  { t: LOOP_S, at: 0, rate: OPENING_RATE },
];

export function gulpAt(t: number): number {
  const u = wrap(t);
  return u < 5 ? curveAt(HOOK_CLOCK, u).at : curveAt(END_CLOCK, u).at;
}

/** Jolts of the picture as the jaws shut, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const s = wrap(t) - SHUT_T;
  if (s < 0 || s > 0.45) return { x: 0, y: 0 };
  const amp = 26 * (1 - s / 0.45) ** 2;
  return { x: amp * Math.sin(s * 115), y: amp * 0.7 * Math.cos(s * 140) };
}

// ---------------------------------------------------------------- the dive

/** The tag's depth, m: at the surface until "plunged", down to 580 m on "feet…". */
/** Back to the surface's values once the dive is off screen (after the stomach), so every value is where it started at the seam. */
const reset = (u: number): number => 1 - ramp(u, A_AT, A_AT + 0.2);
export const depthAt = (t: number): number => 580 * ramp(wrap(t), PLUNGED_AT, FEET_AT + 0.05) ** 1.15 * reset(wrap(t));
/** How fast it's falling, 0 .. 1 (streaks, the line's glow). */
export const fallAt = (t: number): number => window01(wrap(t), PLUNGED_AT - 0.05, FEET_AT + 0.35, 0.25);
/** The water's temperature at the tag, °C: 8 until "turned", shooting to 26 on "WARM". */
export const tempAt = (t: number): number => 8 + 18 * ramp(wrap(t), TURNED_AT + 0.1, WARM_AT + 0.25) * reset(wrap(t));
/** How far the picture has turned warm, 0 cold blue .. 1 red-orange glow. */
export const warmAt = (t: number): number => ramp(wrap(t), TURNED_AT + 0.05, WARM_AT + 0.5) * reset(wrap(t));

/** The depth readout, 0 .. 1: from "plunged" until the thermometer takes over. */
export const depthReadoutAt = (t: number): number => window01(wrap(t), PLUNGED_AT, AND_AT + 0.25, 0.2);
/** The thermometer and its reading, 0 .. 1: from "and the water" to the cut. */
export const thermoAt = (t: number): number => window01(wrap(t), AND_AT - 0.05, IT_AT + 0.4, 0.22);
