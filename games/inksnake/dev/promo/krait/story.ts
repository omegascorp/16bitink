import { mix } from '../../../src/art/wash';
import { curveAt, type Key } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This snake swallows eels WHOLE!": the banded sea krait (Laticauda
 * colubrina) on an Indo-Pacific reef, drawn with InkSnake's own chapter 6
 * art and seen from above as in the game. Told by a narrator (words.ts),
 * every beat timed to the words, a function of time over a loop of LOOP_S.
 *
 *   0     "This snake swallows eels WHOLE!" (excited): close on the krait's
 *         gaping jaws, a moray's tail still sticking out; it walks its jaws
 *         over it, and the tail is gone on "WHOLE!"
 *   2.44  "The banded sea krait slides its head into cracks in the reef…"
 *         (curious): we pull back as it glides off over the reef to a coral
 *         head, tongue flicking, and pushes its head into a dark hole
 *   5.55  "hunting for hiding eels." (nervous): inside the crack, dark; two
 *         yellow eyes open in the black, a moray's face
 *   7.44  "One bite of venom," (dramatically): the strike, a flash, "venom"
 *   8.45  "and down goes the eel!": out on the reef, the limp moray slides
 *         down the krait's throat, its neck swelling
 *   10.05 "It can hold its breath for nearly TWO hours." (surprised): it swims
 *         off with the bulge, bubbles at its nostrils, the game's breath
 *         meter round its head; "up to 2 hours" and a clock spinning round
 *   12.6  "Then it crawls onto land to sleep it off." (chuckles): onto the sun-
 *         warmed sand cay, breath filling up again; it coils with its belly
 *         bulging, "z z z"
 *   15.25 "So yes," (mischievously): back underwater, the next moray swims at
 *         it, the strike, the jaws gaping round it: frame 1.
 */

/** Time folded into the loop. */
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

export const WHOLE_AT = said('WHOLE!');
export const THE_AT = said('The');
export const BANDED_AT = said('banded');
export const SLIDES_AT = said('slides');
export const HEAD_AT = said('head');
export const CRACKS_AT = said('cracks');
export const REEF_AT = said('reef…');
export const HUNTING_AT = said('hunting');
export const HIDING_AT = said('hiding');
export const EELS_AT = said('eels.');
export const ONE_AT = said('One');
export const BITE_AT = said('bite');
export const VENOM_AT = said('venom,');
export const AND_AT = said('and');
export const DOWN_AT = said('down');
export const EEL_AT = said('eel!');
export const IT_AT = said('It');
export const HOLD_AT = said('hold');
export const BREATH_AT = said('breath');
export const TWO_AT = said('TWO');
export const HOURS_AT = said('hours.');
export const THEN_AT = said('Then');
export const CRAWLS_AT = said('crawls');
export const LAND_AT = said('land');
export const SLEEP_AT = said('sleep');
export const SO_AT = said('So');

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * wrap(t)) / LOOP_S;

// ---------------------------------------------------------------- scenes

/**
 * The three sets: the reef from the hook to the head going into the crack
 * (and again from "So yes," round to the hook), the inside of the crack, and
 * the reef again from the swallow to the cay.
 */
export const CRACK_FROM = 5.55;
export const OUT_FROM = 8.45;
export const BACK_FROM = 15.25;

export type Scene = 'hook' | 'crack' | 'cay';

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u >= CRACK_FROM && u < OUT_FROM) return 'crack';
  if (u >= OUT_FROM && u < BACK_FROM) return 'cay';
  return 'hook';
}

/** The hook's own clock: 0 at the loop's start, running on past it, and negative from "So yes," (so the end flows into frame 1). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= BACK_FROM ? u - LOOP_S : u;
};

// ---------------------------------------------------------------- the mood of each line

/** How the picture is graded: darkness at the edges, a wash over everything, and how strongly. */
export interface Grade {
  readonly vignette: number;
  readonly tint: string;
  readonly tintAlpha: number;
  /** The sun's warm glow over the cay (0..1). */
  readonly sun: number;
}

const GRADES: readonly { readonly t: number; readonly g: Grade }[] = [
  // Excited hook: the jaws alone on darkened water.
  { t: 0, g: { vignette: 0.78, tint: '#06142a', tintAlpha: 0.4, sun: 0 } },
  { t: 1.9, g: { vignette: 0.78, tint: '#06142a', tintAlpha: 0.4, sun: 0 } },
  // Curious: the reef opens up, bright and clear.
  { t: 2.9, g: { vignette: 0.45, tint: '#0a2a3a', tintAlpha: 0.06, sun: 0 } },
  { t: 4.9, g: { vignette: 0.5, tint: '#0a2a3a', tintAlpha: 0.08, sun: 0 } },
  { t: 5.5, g: { vignette: 0.6, tint: '#040810', tintAlpha: 0.1, sun: 0 } },
  { t: OUT_FROM - 0.01, g: { vignette: 0.6, tint: '#040810', tintAlpha: 0.1, sun: 0 } },
  // Dramatic: the swallow, dark and close.
  { t: OUT_FROM, g: { vignette: 0.85, tint: '#12081a', tintAlpha: 0.3, sun: 0 } },
  { t: 9.75, g: { vignette: 0.85, tint: '#12081a', tintAlpha: 0.3, sun: 0 } },
  // Surprised: bright, cool light.
  { t: 10.35, g: { vignette: 0.35, tint: '#bff3ff', tintAlpha: 0.06, sun: 0 } },
  { t: 12.45, g: { vignette: 0.35, tint: '#bff3ff', tintAlpha: 0.06, sun: 0 } },
  // Chuckles: the cay warm in the sun.
  { t: 13.1, g: { vignette: 0.5, tint: '#ffb84a', tintAlpha: 0.05, sun: 1 } },
  { t: BACK_FROM - 0.01, g: { vignette: 0.55, tint: '#ffb84a', tintAlpha: 0.05, sun: 1 } },
  // Mischievous "So yes,": back to the hook's dark water.
  { t: BACK_FROM, g: { vignette: 0.78, tint: '#06142a', tintAlpha: 0.4, sun: 0 } },
  { t: LOOP_S, g: { vignette: 0.78, tint: '#06142a', tintAlpha: 0.4, sun: 0 } },
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
    sun: mixN(a.g.sun, b.g.sun),
  };
}

/** A curve through keys at time u (held at the ends). */
export const curve = (keys: readonly Key[], u: number): number => curveAt(keys, u).at;
