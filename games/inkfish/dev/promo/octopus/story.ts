import { BOIL_FPS } from '../../../src/art/textures';
import { ramp } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This octopus eats sharks": the giant Pacific octopuses at the Seattle
 * Aquarium ate the spiny dogfish sharks that shared their big tank, so the
 * keepers moved the octopuses out. Told by a narrator (words.ts), every
 * beat timed to the words, a function of time in seconds over LOOP_S.
 *
 *   0     "This octopus EATS sharks!" (surprised): a big red octopus on dark
 *         water, its arms wrapped round a dogfish, pulling it in to its mouth
 *   2.2   "The Seattle Aquarium once kept giant octopuses in a big tank with
 *         dogfish sharks." (curious): the tank through the glass, visitors in
 *         front, "Seattle Aquarium"; in on the octopus on its rocks, back out to
 *         the big tank, a dogfish cruising past ("spiny dogfish")
 *   7.0   "Bad idea…" (nervous): close on its eye following a passing shark;
 *         an arm tip creeps out
 *   8.2   "the octopuses started EATING the sharks!" (dramatic): it crouches,
 *         lunges on "EATING", the arms engulf the shark: wrapped, and gone
 *   10.9  "So the keepers moved the octopuses out." (chuckles): a keeper hauls
 *         a grumpy octopus out in a pail, arms flopping over the rim; the
 *         sharks below relax
 *   12.9  "It wraps them in eight arms…" (mischievous): the arms wrap the shark
 *         one by one, counted 1 to 8
 *   14.6  "then bites with a beak like a parrot's." : its beak, close up,
 *         biting; a parrot's beak slides in beside it
 *   16.8  "So yes,": back to the wrapped shark, flowing into frame 1.
 */

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

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

export const EATS_AT = said('EATS');
export const SHARKS1_AT = said('sharks!');
export const THE_AT = said('The');
export const SEATTLE_AT = said('Seattle');
export const GIANT_AT = said('giant');
export const OCTOPUSES_AT = said('octopuses');
export const BIG_AT = said('big');
export const TANK_AT = said('tank');
export const DOGFISH_AT = said('dogfish');
export const BAD_AT = said('Bad');
export const IDEA_AT = said('idea…');
export const STARTED_AT = said('started');
export const EATING_AT = said('EATING');
export const SHARKS2_AT = said('sharks!', 2);
export const SO_AT = said('So');
export const KEEPERS_AT = said('keepers');
export const MOVED_AT = said('moved');
export const OUT_AT = said('out.');
export const IT_AT = said('It');
export const WRAPS_AT = said('wraps');
export const EIGHT_AT = said('eight');
export const ARMS_AT = said('arms…');
export const THEN_AT = said('then');
export const BITES_AT = said('bites');
export const BEAK_AT = said('beak');
export const PARROT_AT = said("parrot's.");
export const SO2_AT = said('So', 2);

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

// ---------------------------------------------------------------- the cuts

export type Scene = 'sea' | 'tank' | 'eye' | 'lunge' | 'keeper' | 'count' | 'beak';

export const CUTS: readonly { readonly at: number; readonly scene: Scene }[] = [
  { at: 0, scene: 'sea' },
  { at: THE_AT - 0.08, scene: 'tank' },
  { at: BAD_AT - 0.06, scene: 'eye' },
  { at: said('the') - 0.08, scene: 'lunge' },
  { at: SO_AT - 0.1, scene: 'keeper' },
  { at: IT_AT - 0.08, scene: 'count' },
  { at: THEN_AT - 0.08, scene: 'beak' },
  { at: SO2_AT - 0.1, scene: 'sea' },
];

/** The scene on screen at t, and when it began. */
export function sceneAt(t: number): { readonly scene: Scene; readonly from: number; readonly to: number } {
  const u = wrap(t);
  let i = 0;
  while (i < CUTS.length - 1 && u >= CUTS[i + 1]!.at) i++;
  return { scene: CUTS[i]!.scene, from: CUTS[i]!.at, to: i + 1 < CUTS.length ? CUTS[i + 1]!.at : LOOP_S };
}

/** The hook's own clock: video time in the hook, and negative (up to 0) as the loop comes back round to it. */
export function hookClock(t: number): number {
  const u = wrap(t);
  return u >= CUTS[CUTS.length - 1]!.at ? u - LOOP_S : u;
}

/** A white flash on a cut (0..1), fading fast. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const at = EATING_AT + 0.08;
  if (u < at || u > at + 0.25) return 0;
  return 0.32 * (1 - (u - at) / 0.25) ** 2;
}

/** Jolts of the picture, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  let x = 0;
  let y = 0;
  const u = wrap(t);
  for (const j of [{ at: EATING_AT + 0.08, amp: 22 }, { at: SO_AT + 0.02, amp: 10 }, { at: EATS_AT, amp: 7 }, { at: BITES_AT + 0.14, amp: 6 }, { at: BEAK_AT + 0.14, amp: 5 }]) {
    const s = u - j.at;
    if (s < 0 || s > 0.35) continue;
    const amp = j.amp * (1 - s / 0.35) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

/** A quick zoom punch into each new scene (1 = none), so the cuts land with the beat. */
export function punchAt(t: number): number {
  const { scene, from } = sceneAt(t);
  if (scene === 'sea' && from === 0) return 1;
  const s = wrap(t) - from;
  return 1 + 0.05 * (1 - ramp(s, 0, 0.35));
}
