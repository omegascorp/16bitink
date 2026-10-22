import { BOIL_FPS } from '../../../src/art/textures';
import { LOOP_S, TEMPO, WORDS } from './words';

/**
 * The beats of "These sharks eat birds that fall out of the SKY!", timed
 * from the words of the voiceover (words.ts), in seconds of the sped-up
 * voice.mp3 (the video's own clock).
 */
export { LOOP_S };

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
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

// 1. SHOCK, the hook: "These sharks eat birds that fall out of the SKY!"
export const SKY_AT = said('SKY!');
// 2. TENDER: "Every autumn, millions of songbirds fly across the Gulf…"
export const EVERY_AT = said('Every');
export const MILLIONS_AT = said('millions');
export const SONGBIRDS_AT = said('songbirds');
export const GULF_AT = said('Gulf…');
// 3. TENSE: "and when a storm hits, some drop into the sea."
export const AND_AT = said('and');
export const STORM_AT = said('storm');
export const HITS_AT = said('hits,');
export const SOME_AT = said('some');
export const DROP_AT = said('drop');
export const SEA_AT = said('sea.');
// 4. DREAD: "Right below: young tiger sharks."
export const RIGHT_AT = said('Right');
export const BELOW_AT = said('below:');
export const YOUNG_AT = said('young');
export const TIGER_AT = said('tiger');
export const SHARKS_END = ends('sharks.');
// 5. SHOCK NUMBER: "Scientists found birds inside FORTY-ONE of a hundred and five!"
export const SCIENTISTS_AT = said('Scientists');
export const FOUND_AT = said('found');
export const INSIDE_AT = said('inside');
export const FORTY_ONE_AT = said('FORTY-ONE');
export const FORTY_ONE_END = ends('FORTY-ONE');
export const HUNDRED_AT = said('hundred');
export const FIVE_AT = said('five!');
// 6. CHEEKY: "Bird, fish… whatever floats."
export const BIRD_AT = said('Bird,');
export const FISH_AT = said('fish…');
export const WHATEVER_AT = said('whatever');
export const FLOATS_AT = said('floats.');
// 7. "So yes," round into the hook.
export const SO_AT = said('So');
export const YES_AT = said('yes,');

/** Each beat's mood, from when it takes over (video seconds); the hook's storm comes back on "So yes,". */
export type Mood = 'shock' | 'tender' | 'storm' | 'dread' | 'number' | 'cheeky';
export const MOODS: readonly { readonly mood: Mood; readonly from: number }[] = [
  { mood: 'shock', from: 0 },
  { mood: 'tender', from: 2.95 },
  { mood: 'storm', from: AND_AT - 0.25 },
  { mood: 'dread', from: RIGHT_AT - 0.2 },
  { mood: 'number', from: SCIENTISTS_AT - 0.1 },
  { mood: 'cheeky', from: BIRD_AT - 0.2 },
  { mood: 'shock', from: SO_AT - 0.05 },
];

/** The beat's mood at time t. */
export function moodAt(t: number): Mood {
  const u = wrap(t);
  let mood: Mood = 'shock';
  for (const m of MOODS) if (u >= m.from) mood = m.mood;
  return mood;
}
