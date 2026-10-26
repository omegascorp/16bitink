import type { Animal } from './timeline';

/**
 * The eight animals, as the video states them (script.md has the sources):
 * the name card's lines (US units first, metric under), the length the ruler
 * measures, the throat that the shoulder test puts the bar to, and the
 * verdict. Throats without a sourced size are drawn smaller than the bar but
 * never labelled with a number.
 */

export interface Species {
  readonly name: string;
  /** The stamp card's short name. */
  readonly short: string;
  /** Length on the ruler, feet. */
  readonly feet: number;
  readonly us: string;
  readonly metric: string;
  /** The throat ring's width on the test card, inches (drawn); `label` only when the size is sourced. */
  readonly throat: number;
  readonly throatLabel: string | null;
  readonly verdict: 'NO' | 'COULD';
  /** Body height over length (fins included), for where it floats beside "you". */
  readonly height: number;
}

/** An average man's shoulders, inches: the bar every throat is tested against. */
export const SHOULDERS_IN = 16;
/** An average man, feet (5 ft 9 in). */
export const YOU_FT = 5.75;

export const SPECIES: Readonly<Record<Animal, Species>> = {
  grouper: { name: 'THE GOLIATH GROUPER', short: 'grouper', feet: 8, us: '8 ft · 800 lb', metric: '2.5 m · 363 kg', throat: 10, throatLabel: null, verdict: 'NO', height: 0.42 },
  tiger: { name: 'THE TIGER SHARK', short: 'tiger shark', feet: 18, us: '18 ft · 2,000 lb', metric: '5.5 m · 900 kg', throat: 11, throatLabel: null, verdict: 'NO', height: 0.27 },
  white: { name: 'THE GREAT WHITE', short: 'great white', feet: 20, us: '20 ft', metric: '6 m', throat: 12, throatLabel: null, verdict: 'NO', height: 0.33 },
  croc: { name: 'THE SALTWATER CROCODILE', short: 'croc', feet: 20.25, us: '20 ft · 2,370 lb', metric: '6.17 m · 1,075 kg', throat: 9, throatLabel: null, verdict: 'NO', height: 0.16 },
  greenland: { name: 'THE GREENLAND SHARK', short: 'Greenland shark', feet: 21, us: '21 ft', metric: '6.4 m', throat: 11, throatLabel: null, verdict: 'NO', height: 0.24 },
  whaleShark: { name: 'THE WHALE SHARK', short: 'whale shark', feet: 40, us: '40 ft', metric: '12 m', throat: 4, throatLabel: '4 in · 10 cm', verdict: 'NO', height: 0.26 },
  humpback: { name: 'THE HUMPBACK WHALE', short: 'humpback', feet: 50, us: '50 ft', metric: '15 m', throat: 15, throatLabel: '15 in · 38 cm', verdict: 'NO', height: 0.3 },
  sperm: { name: 'THE SPERM WHALE', short: 'sperm whale', feet: 60, us: '60 ft', metric: '18 m', throat: 22, throatLabel: null, verdict: 'COULD', height: 0.22 },
};

/** How many of "you", laid head to toe, make one of it. */
export const yousLong = (a: Animal): number => SPECIES[a].feet / YOU_FT;
