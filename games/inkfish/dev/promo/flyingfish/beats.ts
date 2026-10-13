import { BOIL_FPS } from '../../../src/art/textures';
import { TEMPO, WORDS } from './words';

/**
 * The loop's clock and the narrator's beats. Every moment in the short is
 * timed from when a word is said in the sped-up voice.mp3.
 *
 * "This fish flew for forty-five seconds. A Japanese TV crew filmed the
 * record in 2008. Flying fish burst out of the water, spread their fins like
 * wings, and flick their tails on the waves to keep going, up to four hundred
 * metres. Mahi-mahi hunt them from below, and seabirds from above. To get
 * away, / this fish flew for forty-five seconds."
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

/** When a word ends. */
export function ended(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const FLEW_AT = said('flew');
export const SECONDS_AT = said('seconds.');
export const SECONDS_END = ended('seconds.');
export const JAPANESE_AT = said('Japanese');
export const TV_AT = said('TV');
export const FILMED_AT = said('filmed');
export const RECORD_AT = said('record');
export const YEAR_AT = said('2008.');
export const YEAR_END = ended('2008.');
export const FLYING_AT = said('Flying');
export const BURST_AT = said('burst');
export const WATER_AT = said('water,');
export const SPREAD_AT = said('spread');
export const FINS_AT = said('fins');
export const WINGS_AT = said('wings,');
export const WINGS_END = ended('wings,');
export const FLICK_AT = said('flick');
export const TAILS_AT = said('tails');
export const WAVES_AT = said('waves');
export const KEEP_AT = said('keep');
export const UP_AT = said('up');
export const FOUR_AT = said('four');
export const METRES_AT = said('metres.');
export const METRES_END = ended('metres.');
export const MAHI_AT = said('Mahi-mahi');
export const HUNT_AT = said('hunt');
export const BELOW_AT = said('below,');
export const SEABIRDS_AT = said('seabirds');
export const ABOVE_AT = said('above.');
export const TO_AT = said('To');
export const GET_AT = said('get');
export const AWAY_AT = said('away,');
