import { SPECIES_INFO, type SpeciesInfo } from '../levels/species';
import type { SpeciesId } from '../levels/types';
import { BIRD_INFO, type BirdId } from './birds';

/** How the player's fish met its end; each has its own animation and result screen. */
export type DeathCause = 'eaten' | 'spiked' | 'pinched' | 'hooked' | 'snagged' | 'snatched' | 'timeout';

export interface Death {
  readonly cause: DeathCause;
  /** The fish responsible, when there was one. */
  readonly killer?: SpeciesId;
  /** The bird responsible, for 'snatched'. */
  readonly bird?: BirdId;
}

/** What happens when a bigger creature touches you: spiky ones prick, crabs pinch, the rest bite. */
export function causeOfBite(species: SpeciesId): DeathCause {
  const info = SPECIES_INFO[species] as SpeciesInfo;
  return info.spiky ? 'spiked' : info.pinches ? 'pinched' : 'eaten';
}

/** A few fish get their own line; everyone else gets the plain one. */
const EATEN_BY: Partial<Record<SpeciesId, string>> = {
  minnow: 'A school of minnows nibbled you up.',
  pike: 'Swallowed whole by a pike.',
  angler: "Lured in by the angler's lantern.",
  gulper: 'The gulper eel opened wide. Very wide.',
  moray: 'A moray shot out of a porthole.',
  shark: 'The reef shark finally stopped circling.',
  swordfish: 'Slashed, then swallowed, by the swordfish.',
};

const article = (name: string): string => (/^[aeiou]/.test(name) ? 'an' : 'a');
const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export function deathText(death: Death): { readonly title: string; readonly line: string } {
  switch (death.cause) {
    case 'hooked':
      return { title: 'Cooked!', line: 'Reeled up and fried for supper.' };
    case 'spiked':
      return { title: 'Spiked!', line: death.killer ? `You bumped into ${article(SPECIES_INFO[death.killer].name)} ${SPECIES_INFO[death.killer].name}.` : 'You bumped into something spiky.' };
    case 'pinched':
      return { title: 'Pinched!', line: death.killer ? `${capital(article(SPECIES_INFO[death.killer].name))} ${SPECIES_INFO[death.killer].name} caught you in its claws.` : 'Something with claws got you.' };
    case 'snatched':
      return { title: 'Snatched!', line: death.bird ? `${capital(article(BIRD_INFO[death.bird].name))} ${BIRD_INFO[death.bird].name} plucked you out of the sea.` : 'Something swooped down and took you.' };
    case 'snagged':
      return { title: 'Snagged!', line: 'That shiny lure was hiding a hook.' };
    case 'timeout':
      return { title: 'Time’s up!', line: 'The school swam off before you were full.' };
    case 'eaten':
      if (!death.killer) return { title: 'Eaten!', line: 'Something bigger got you.' };
      return { title: 'Eaten!', line: EATEN_BY[death.killer] ?? `Eaten by ${article(SPECIES_INFO[death.killer].name)} ${SPECIES_INFO[death.killer].name}.` };
  }
}

/** Floating text for a hit that costs a life but not the level. */
export function hitText(cause: DeathCause): string {
  return { eaten: 'Chomp!', spiked: 'Ouch!', pinched: 'Pinch!', hooked: 'Hooked!', snatched: 'Peck!', snagged: 'Snagged!', timeout: 'Hurry!' }[cause];
}
