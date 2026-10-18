import { BOIL_FPS } from '../../../src/art/textures';
import { TEMPO, WORDS } from './words';

/**
 * The clock of the mako short: the loop, the line boil, and when each word
 * of the voiceover (words.ts) is said in the sped-up voice.mp3. Every beat
 * in story.ts is timed from these.
 */
export const LOOP_S = 15;

/** The line boil steps at the game's 8 a second: 120 steps, 40 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export function wrap(t: number): number {
  return ((t % LOOP_S) + LOOP_S) % LOOP_S;
}

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

// [excited] "This shark can jump INTO your boat!"
export const JUMP_AT = said('jump');
export const INTO_AT = said('INTO');
export const YOUR_AT = said('your');
export const BOAT_AT = said('boat!');
// [curious] "The shortfin mako is the fastest shark in the sea,"
export const THE_AT = said('The');
export const SHORTFIN_AT = said('shortfin');
export const FASTEST_AT = said('fastest');
export const SEA_AT = said('sea,');
// [dramatically] "and it can leap up to SIX metres out of the water."
export const AND_AT = said('and');
export const LEAP_AT = said('leap');
export const SIX_AT = said('SIX');
export const METRES_AT = said('metres');
export const WATER_AT = said('water.');
// [nervous] "In twenty thirteen, off New Jersey, anglers hooked one…"
export const IN_AT = said('In');
export const TWENTY_AT = said('twenty');
export const NEW_AT = said('New');
export const ANGLERS_AT = said('anglers');
export const HOOKED_AT = said('hooked');
export const ONE_AT = said('one…');
// [surprised] "and it landed right on their boat!"
export const LANDED_AT = said('landed');
export const THEIR_AT = said('their');
export const BOAT2_AT = said('boat!', 2);
// [sarcastic] "Great fishing trip."
export const GREAT_AT = said('Great');
export const FISHING_AT = said('fishing');
export const TRIP_AT = said('trip.');
export const TRIP_END = ends('trip.');
// [mischievously] "So remember:" → "this shark can jump into your boat!"
export const SO_AT = said('So');
export const REMEMBER_AT = said('remember:');

/** The one cut: from the 6 m leap to the 2013 boat, on "In". Every other move is one continuous take round the loop. */
export const CUT_AT = IN_AT;

/**
 * Story time unwrapped from the cut: CUT_AT .. CUT_AT + LOOP_S. The take that
 * starts at the cut runs on through the loop point (the 2013 boat becomes the
 * opening's boat) to the next cut, so its keys are written in this time.
 */
export function take(t: number): number {
  const u = wrap(t);
  return u >= CUT_AT ? u : u + LOOP_S;
}

/** The two crashes onto the bow: on the first "boat!" (the hook) and the second (2013). In take time. */
export const CRASH_2013 = BOAT2_AT;
export const CRASH_HOOK = BOAT_AT + LOOP_S;
