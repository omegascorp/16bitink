import { BOIL_FPS } from '../../../src/art/textures';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This fish comes out of the WATER to eat pigeons": on the river Tarn at
 * Albi, wels catfish lunge onto a gravel island and seize pigeons (Cucherousset
 * et al. 2012). Told by a narrator (words.ts), one world and one moving
 * camera, every beat a pure function of time over a loop of LOOP_S:
 *
 *   0     "This fish comes out of the WATER to eat pigeons!" (shock): frame 1,
 *         from low on the wet gravel, the catfish in three-quarter profile, its
 *         head huge, its long body curving back into the river, jaws clamped
 *         round a pigeon with its wings up, water pouring.
 *   2.7   "Albi, France. Pigeons washing on a gravel island…" (sweet): the
 *         brick bridge and cathedral, then close on pigeons bathing and preening.
 *   5.9   "and something huge sliding up behind them." (nervous): the colour
 *         drains, a long dark fish glides along the channel behind the island,
 *         whiskers first, one bird's eye turns.
 *   8.8   "WHAM! A five-foot catfish, half out of the river!" (surprise): the
 *         head bursts towards us, spray, a shake, 1.5 m over 5 ft; the rest
 *         of the flock flies.
 *  12.0   "Four seconds, tops, and it's gone, with lunch!" (laugh): the
 *         fish slides backwards along its own length into the river while a
 *         timer counts to 4 s; one feather is left.
 *  14.9   "The trick? Pigeons that stand still get ignored." (cheeky): the
 *         pigeons frozen like statues, the fish curled in to the shore with its
 *         long whiskers feeling past their feet.
 *  17.7   "It only grabs the ones that MOVE." (tension): close on a foot that
 *         twitches; a whisker snaps to it.
 *  19.7   "So if a pigeon ever looks nervous… it's because" (comic): one
 *         pigeon close, side-eye to the river; on "it's because" the water
 *         bursts, and the loop lands on frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** A phase that goes round `n` whole times per loop, so every motion built on it loops. */
export const cyc = (t: number, n: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const WATER_AT = said('WATER');
export const PIGEONS_AT = said('pigeons!');
export const ALBI_AT = said('Albi,');
export const WASHING_AT = said('washing');
export const AND_AT = said('and');
export const HUGE_AT = said('huge');
export const THEM_AT = said('them.');
export const WHAM_AT = said('WHAM!');
export const FIVEFOOT_AT = said('five-foot');
export const RIVER_AT = said('river!');
export const FOUR_AT = said('Four');
export const GONE_AT = said('gone,');
export const LUNCH_AT = said('lunch!');
export const TRICK_AT = said('trick?');
export const STILL_AT = said('still');
export const IGNORED_AT = said('ignored.');
export const GRABS_AT = said('grabs');
export const MOVE_AT = said('MOVE.');
export const SO_AT = said('So');
export const NERVOUS_AT = said('nervous…');
export const BECAUSE_AT = said('because');

export const PLACE_FROM = ALBI_AT - 0.3;
export const NERVOUS_FROM = AND_AT - 0.2;
export const LUNGE_FROM = WHAM_AT - 0.1;
export const BURST_AT = said('it\'s', 2) + 0.05;

// ---------------------------------------------------------------- the camera

/** The slide back: tail first off the gravel and into the channel, the bird still in its jaws. */
export const SLIDE_FROM = 12.0;
export const SLIDE_TO = 14.1;
