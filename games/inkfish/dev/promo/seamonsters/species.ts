/**
 * The line-up, as the video states it (script.md has the sources): each
 * animal's name card (US units first, metric under), the length the counter
 * and the ruler measure, and the legend it started. The siphonophore, the
 * twist, isn't in the row: it runs off past the blue whale's tail.
 */

export type Monster = 'frilled' | 'manatee' | 'oarfish' | 'basking' | 'squid' | 'sperm' | 'blue';

/** Smallest to biggest, the order they join the row. */
export const MONSTERS: readonly Monster[] = ['frilled', 'manatee', 'oarfish', 'basking', 'squid', 'sperm', 'blue'];

export interface Species {
  readonly name: string;
  /** Length, feet: what the counter rolls to and the row is laid out by. */
  readonly feet: number;
  readonly us: string;
  readonly metric: string;
  /** Which script section it's in. */
  readonly section: number;
}

export const SPECIES: Readonly<Record<Monster, Species>> = {
  frilled: { name: 'THE FRILLED SHARK', feet: 6.5, us: '6.5 ft', metric: '2 m', section: 2 },
  manatee: { name: 'THE MANATEE', feet: 13, us: '13 ft', metric: '4 m', section: 3 },
  oarfish: { name: 'THE OARFISH', feet: 26, us: '26 ft', metric: '8 m', section: 4 },
  basking: { name: 'THE BASKING SHARK', feet: 33, us: '33 ft', metric: '10 m', section: 6 },
  squid: { name: 'THE GIANT SQUID', feet: 40, us: '40 ft', metric: '12 m', section: 7 },
  sperm: { name: 'THE SPERM WHALE', feet: 52, us: '52 ft', metric: '16 m', section: 8 },
  blue: { name: 'THE BLUE WHALE', feet: 100, us: '100 ft', metric: '30 m', section: 9 },
};

/** The twist: an estimate from the ROV's video of a coiled spiral (Schmidt Ocean Institute: "an estimated 150-foot siphonophore"). */
export const SIPHONOPHORE = { name: 'THE SIPHONOPHORE', feet: 150, us: '~150 ft', metric: '~45 m' } as const;

/** An average man, feet (5 ft 9 in). */
export const YOU_FT = 5.75;

/** How many of "you", head to toe, make one of it, as the counter shows it ("= 4.5 of you"). */
export function yousLabel(feet: number): string {
  const n = feet / YOU_FT;
  const shown = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return `= ${shown} of you`;
}
