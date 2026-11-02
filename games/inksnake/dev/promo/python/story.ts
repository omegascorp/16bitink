import { mix } from '../../../src/art/wash';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This snake swallowed a whole CROCODILE!": an olive python and a
 * freshwater crocodile, Lake Moondarra, Queensland, 2014, seen from above
 * as in the game and drawn with InkSnake's own art. Told by a narrator
 * (words.ts), every beat timed to the words, a function of time over a loop
 * of LOOP_S.
 *
 *   hook    "This snake swallowed a whole CROCODILE!" (excited): close on the
 *           python's gaping jaws round the croc's hindquarters, tail and hind
 *           legs sticking out; it walks its jaws on until the tail is gone
 *   tag     "Australia, twenty fourteen." (calm): the lake at dawn, the croc
 *           basking in the shallows; "Lake Moondarra, Australia" and "2014"
 *   lake    "A ten-foot python grabbed a three-foot croc in a lake…" (curious)
 *           and "and they fought, and fought." (nervous): the python swims in,
 *           bars of 10 ft and 3 ft, the grab, then it coils round the croc,
 *           thrashing, spray, camera shake, a clock spinning
 *   dusk    "Hours later, it swallowed the croc… HEAD first!" (surprised):
 *           the day sinks to dusk; its jaws close over the croc's snout
 *   belly   "Its belly looked like a suitcase." (chuckles): a croc-shaped lump,
 *           a suitcase drawn beside it
 *   days    "Then it barely moved for ten days." (softly): still at night, a
 *           counter of days, the sun and moon going round
 *   face    "Who would YOU have bet on?" (mischievously): python and croc
 *           face to face, a "?" between
 *   hook    "Because" (lead-in): back to the swallow, frame 1
 */

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins in voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

/** When a word of the voiceover ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const WHOLE_AT = said('CROCODILE!');
export const AUSTRALIA_AT = said('Australia,');
export const FOURTEEN_AT = said('twenty fourteen.');
export const A_AT = said('A');
export const TENFOOT_AT = said('ten-foot');
export const PYTHON_AT = said('python');
export const GRABBED_AT = said('grabbed');
export const THREEFOOT_AT = said('three-foot');
export const CROC_AT = said('croc');
export const LAKE_AT = said('lake…');
export const THEY_AT = said('they');
export const FOUGHT_AT = said('fought,');
export const FOUGHT2_AT = said('fought.');
export const HOURS_AT = said('Hours');
export const SWALLOWED_AT = said('swallowed', 2);
export const CROC2_AT = said('croc…');
export const HEAD_AT = said('HEAD first!');
export const ITS_AT = said('Its');
export const BELLY_AT = said('belly');
export const SUITCASE_AT = said('suitcase.');
export const THEN_AT = said('Then');
export const BARELY_AT = said('barely');
export const TEN_AT = said('ten');
export const DAYS_AT = said('days.');
export const WHO_AT = said('Who');
export const YOU_AT = said('YOU');
export const BET_AT = said('bet');
export const BECAUSE_AT = said('Because');

// ---------------------------------------------------------------- scenes

export const TAG_FROM = AUSTRALIA_AT - 0.06;
export const LAKE_FROM = A_AT - 0.04;
export const DUSK_FROM = HOURS_AT - 0.02;
export const BELLY_FROM = ITS_AT - 0.06;
export const DAYS_FROM = THEN_AT - 0.08;
export const FACE_FROM = WHO_AT - 0.1;
export const BACK_FROM = BECAUSE_AT - 0.1;

export type Scene = 'hook' | 'tag' | 'lake' | 'dusk' | 'belly' | 'days' | 'face';

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u >= BACK_FROM) return 'hook';
  if (u >= FACE_FROM) return 'face';
  if (u >= DAYS_FROM) return 'days';
  if (u >= BELLY_FROM) return 'belly';
  if (u >= DUSK_FROM) return 'dusk';
  if (u >= LAKE_FROM) return 'lake';
  if (u >= TAG_FROM) return 'tag';
  return 'hook';
}

/** The hook's own clock: 0 at the loop's start, running on past it, and negative from "Because" (so the end flows into frame 1). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= BACK_FROM ? u - LOOP_S : u;
};

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * wrap(t)) / LOOP_S;

// ---------------------------------------------------------------- the mood of each line

export interface Grade {
  readonly vignette: number;
  readonly tint: string;
  readonly tintAlpha: number;
  readonly sun: number;
}

const g = (vignette: number, tint: string, tintAlpha: number): Grade => ({ vignette, tint, tintAlpha, sun: 0 });
const DARK_HOOK = g(0.52, '#1c1426', 0.12);

const GRADES: readonly { readonly t: number; readonly g: Grade }[] = [
  // Excited hook: the swallow on the shore at dusk.
  { t: 0, g: DARK_HOOK },
  { t: 2.0, g: DARK_HOOK },
  // Calm: the lake at dawn, warm and pale.
  { t: TAG_FROM + 0.2, g: g(0.4, '#ffe2a8', 0.1) },
  { t: LAKE_FROM - 0.02, g: g(0.4, '#ffe2a8', 0.1) },
  // Curious: bright day.
  { t: LAKE_FROM + 0.3, g: g(0.32, '#d8f0ff', 0.05) },
  { t: GRABBED_AT, g: g(0.36, '#d8f0ff', 0.05) },
  // Nervous: the fight, reddish and close.
  { t: THEY_AT + 0.2, g: g(0.66, '#3a1010', 0.24) },
  { t: DUSK_FROM - 0.02, g: g(0.66, '#3a1010', 0.24) },
  // Surprised: day sinking to dusk.
  { t: DUSK_FROM + 0.05, g: g(0.4, '#ffc27a', 0.1) },
  { t: HEAD_AT, g: g(0.55, '#ff8f4a', 0.22) },
  { t: BELLY_FROM - 0.01, g: g(0.6, '#5a2a5a', 0.3) },
  // Chuckles: warm lamp-lit, playful.
  { t: BELLY_FROM, g: g(0.46, '#ffcf7a', 0.16) },
  { t: DAYS_FROM - 0.01, g: g(0.46, '#ffcf7a', 0.16) },
  // Soft: night over the lake, then dawn.
  { t: DAYS_FROM + 0.25, g: g(0.72, '#081a46', 0.46) },
  { t: TEN_AT, g: g(0.72, '#081a46', 0.46) },
  { t: FACE_FROM - 0.01, g: g(0.6, '#ffb27a', 0.16) },
  // Mischievous: a warm spotlight.
  { t: FACE_FROM, g: g(0.58, '#ffb84a', 0.14) },
  { t: BACK_FROM - 0.01, g: g(0.58, '#ffb84a', 0.14) },
  // The lead-in: back to the hook's dark water.
  { t: BACK_FROM, g: DARK_HOOK },
  { t: LOOP_S, g: DARK_HOOK },
];

/** The grade at time t, eased between its keys. */
export function gradeAt(t: number): Grade {
  const u = wrap(t);
  let i = 0;
  while (i < GRADES.length - 2 && u >= GRADES[i + 1]!.t) i++;
  const a = GRADES[i]!;
  const b = GRADES[i + 1]!;
  const s = b.t > a.t ? Math.min(1, Math.max(0, (u - a.t) / (b.t - a.t))) : 1;
  const e = s * s * (3 - 2 * s);
  const mixN = (x: number, y: number): number => x + (y - x) * e;
  return {
    vignette: mixN(a.g.vignette, b.g.vignette),
    tint: mix(a.g.tint, b.g.tint, e),
    tintAlpha: mixN(a.g.tintAlpha, b.g.tintAlpha),
    sun: 0,
  };
}
