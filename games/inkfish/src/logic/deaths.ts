import type { SpeciesId } from '../levels/types';

/** How the player's fish met its end; each has its own animation and result screen. */
export type DeathCause = 'eaten' | 'spiked' | 'hooked';

export interface Death {
  readonly cause: DeathCause;
  /** The fish responsible, when there was one. */
  readonly killer?: SpeciesId;
}

const SPIKY: ReadonlySet<SpeciesId> = new Set<SpeciesId>(['puffer']);

/** What happens when a bigger fish touches you: spiky fish prick, the rest bite. */
export function causeOfBite(species: SpeciesId): DeathCause {
  return SPIKY.has(species) ? 'spiked' : 'eaten';
}

const EATEN_BY: Readonly<Record<SpeciesId, string>> = {
  minnow: 'A school of minnows nibbled you up.',
  perch: 'A perch had you for lunch.',
  puffer: 'A puffer gulped you down.',
  pike: 'Swallowed whole by a pike.',
  angler: "Lured in by the angler's lantern.",
  eel: 'Snapped up by an eel.',
};

export function deathText(death: Death): { readonly title: string; readonly line: string } {
  switch (death.cause) {
    case 'hooked':
      return { title: 'Cooked!', line: 'Reeled up and fried for supper.' };
    case 'spiked':
      return { title: 'Spiked!', line: 'You bumped into a puffed-up puffer.' };
    case 'eaten':
      return { title: 'Eaten!', line: death.killer ? EATEN_BY[death.killer] : 'Something bigger got you.' };
  }
}

/** Floating text for a hit that costs a life but not the level. */
export function hitText(cause: DeathCause): string {
  return { eaten: 'Chomp!', spiked: 'Ouch!', hooked: 'Hooked!' }[cause];
}
