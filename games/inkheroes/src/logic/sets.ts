import type { Hero } from './hero';
import { GEAR_STAT_NAMES, itemDef, SET_NAMES, SET_TIERS, setDef, setsWorn, type GearStat } from './items';

/** The pieces in a whole set (one per armor slot). */
export const SET_SIZE = 6;

/** One set a hero wears: how many pieces, and each bonus with whether it is on. */
export interface SetProgress {
  readonly id: string;
  readonly name: string;
  readonly worn: number;
  readonly tiers: readonly { readonly at: number; readonly says: string; readonly lit: boolean }[];
}

/** A bonus in words: "+1 Morale", "+1 Speed to every company". */
export function bonusSays(gives: Readonly<Partial<Record<GearStat, number>>>): string {
  return (Object.entries(gives) as [GearStat, number][]).map(([s, n]) => `+${n} ${GEAR_STAT_NAMES[s]}`).join(', ');
}

/** Every set `h` wears a piece of, the most worn first: its bonuses at 2, 4 and 6 (none for a gray set), lit once worn. */
export function setProgress(h: Pick<Hero, 'gear'>): SetProgress[] {
  return Object.entries(setsWorn(h))
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
    .map(([id, worn]) => {
      const bonus = setDef(id)?.bonus ?? {};
      const tiers = SET_TIERS.filter((at) => bonus[at]).map((at) => ({ at, says: bonusSays(bonus[at]!), lit: worn >= at }));
      return { id, name: SET_NAMES[id] ?? id, worn, tiers };
    });
}

/** What `h` wears, for a foe's card: "wearing Bronze Helm, War Belt and Catapult" (empty when nothing). */
export function wearsWords(h: Pick<Hero, 'gear'>): string {
  const names = Object.values(h.gear ?? {}).map((id) => itemDef(id).name);
  if (!names.length) return '';
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`;
  return `wearing ${list}`;
}
