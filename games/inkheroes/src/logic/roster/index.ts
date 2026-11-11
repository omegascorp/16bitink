import type { HeroDef } from '../../level/types';
import type { TownFaction } from '../creatures';
import type { Specialty } from '../specialty';
import { GREEK_ROSTER, RENAMED } from './greek';
import { KEMET_ROSTER } from './kemet';
import { NORSE_ROSTER } from './norse';

/**
 * Each people's heroes, as each H3 town has its own: the Taverns of a map
 * without its own recruits hire from its town's people's roster. Egypt's
 * (Neferet, Paser and the rest) is kemet.ts, the Norse (Hervor, Heid and the rest) norse.ts, the same way.
 */
const ROSTERS: Readonly<Record<TownFaction, readonly HeroDef[]>> = {
  crown: GREEK_ROSTER,
  kemet: KEMET_ROSTER,
  norse: NORSE_ROSTER,
};

/** The heroes of `people` (none: an empty roster). */
export const rosterOf = (people: TownFaction): readonly HeroDef[] => ROSTERS[people] ?? [];

/** The roster's hero `id`, of any people, or under an id they had before (undefined: no roster has them). */
export const rosterHero = (id: string): HeroDef | undefined => {
  const now = RENAMED[id] ?? id;
  return Object.values(ROSTERS).flat().find((h) => h.id === now);
};

/** A hero's specialty: their own, else the roster's for their id. */
export const specialtyOf = (h: { readonly id: string; readonly specialty?: Specialty }): Specialty | undefined => h.specialty ?? rosterHero(h.id)?.specialty;
