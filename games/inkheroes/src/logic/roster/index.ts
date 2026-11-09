import type { HeroDef } from '../../level/types';
import type { TownFaction } from '../creatures';
import type { Specialty } from '../specialty';
import { GREEK_ROSTER, RENAMED } from './greek';

/**
 * Each people's heroes, as each H3 town has its own: the Taverns of a map
 * without its own recruits hire from its town's people's roster. Egypt's
 * (Neferet, Paser and the rest) comes next, the same way.
 */
const ROSTERS: Readonly<Record<TownFaction, readonly HeroDef[]>> = {
  crown: GREEK_ROSTER,
  kemet: [],
};

/** The heroes of `people` (none yet: an empty roster). */
export const rosterOf = (people: TownFaction): readonly HeroDef[] => ROSTERS[people] ?? [];

/** The roster's hero `id`, of any people, or under an id they had before (undefined: no roster has them). */
export const rosterHero = (id: string): HeroDef | undefined => {
  const now = RENAMED[id] ?? id;
  return Object.values(ROSTERS).flat().find((h) => h.id === now);
};

/** A hero's specialty: their own, else the roster's for their id. */
export const specialtyOf = (h: { readonly id: string; readonly specialty?: Specialty }): Specialty | undefined => h.specialty ?? rosterHero(h.id)?.specialty;
