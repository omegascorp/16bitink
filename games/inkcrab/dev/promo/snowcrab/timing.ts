import { BOIL } from '../../../src/art/palette';
import { curveAt, type Key } from '../short';
import { BOIL_FPS } from '../sprites';
import { TEMPO, WORDS } from './words';

/**
 * The clock of the snow crab short: the loop's length, the boil, and when
 * each word the beats hang on is said (in the sped-up voice.mp3).
 */
export const LOOP_S = 21;

/** The line boil steps at the game's 8 a second: 168 steps, 56 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS % BOIL;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

/** When a word of the voiceover ends, in voice.mp3. */
export function ended(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const TEN_AT = said('TEN');
export const BILLION_AT = said('BILLION');
export const VANISHED_AT = said('vanished.');
export const VANISHED_END = ended('vanished.');
export const BETWEEN_AT = said('Between');
export const Y2018_AT = said('2018');
export const Y2021_AT = said('2021,');
/** The years nobody says, ticked off evenly between the two that are. */
export const YEAR_TICKS: readonly number[] = [Y2018_AT, Y2018_AT + (Y2021_AT - Y2018_AT) / 3, Y2018_AT + (2 * (Y2021_AT - Y2018_AT)) / 3, Y2021_AT];
export const SNOW_AT = said('snow');
export const ALASKAS_AT = said("Alaska's");
export const BERING_AT = said('Bering');
export const SEA_AT = said('Sea');
export const DISAPPEARED_AT = said('disappeared.');
export const DISAPPEARED_END = ended('disappeared.');
export const A_AT = said('A');
export const HEATWAVE_AT = said('heatwave');
export const WARMED_AT = said('warmed');
export const ICY_AT = said('icy');
export const WATER_END = ended('water,');
export const WARM_AT = said('warm');
export const BURN_AT = said('burn');
export const ENERGY_AT = said('energy,');
export const LIKELY_AT = said('likely');
export const STARVED_AT = said('starved.');
export const IN_AT = said('In');
export const Y2022_AT = said('2022,');
export const ALASKA_AT = said('Alaska');
export const CANCELLED_AT = said('cancelled');
export const SNOW2_AT = said('snow', 2);
export const SEASON_AT = said('season');
export const SEASON_END = ended('season');
export const FIRST_AT = said('first');
export const EVER_AT = said('EVER.');
export const EVER_END = ended('EVER.');
export const THE_COUNT_AT = said('The');
export const COUNT_AT = said('count');
export const SAYS_AT = said('says:');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
export function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

/** A sine that turns a whole number of times a loop, so it comes round seamlessly. */
export const cycle = (t: number, turns: number, phase = 0): number => Math.sin((2 * Math.PI * turns * t) / LOOP_S + phase);
