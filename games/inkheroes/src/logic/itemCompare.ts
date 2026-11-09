import type { Hero } from './hero';
import { GEAR_STAT_NAMES, gearBonus, itemDef, SET_NAMES, SET_TIERS, setDef, setsWorn, wear, type GearStat, type ItemId } from './items';
import { bonusSays, SET_SIZE, setProgress } from './sets';

/**
 * What a piece's card says beyond the piece itself: its set and that set's
 * bonuses, and for a piece in the bag what putting it on would change.
 */

/** A piece's set as the hero wears it: pieces worn, and each bonus at 2, 4 and 6, lit once on (none: a common set). */
export interface SetInfo {
  readonly name: string;
  readonly worn: number;
  readonly size: number;
  readonly tiers: readonly { readonly at: number; readonly says: string; readonly lit: boolean }[];
}

/** The set piece `id` belongs to, as `h` wears it; null for a piece of no set. */
export function setInfo(h: Pick<Hero, 'gear'>, id: ItemId): SetInfo | null {
  const set = itemDef(id).set;
  if (!set) return null;
  const worn = setsWorn(h)[set] ?? 0;
  const bonus = setDef(set)?.bonus ?? {};
  const tiers = SET_TIERS.filter((at) => bonus[at]).map((at) => ({ at, says: bonusSays(bonus[at]!), lit: worn >= at }));
  return { name: SET_NAMES[set] ?? set, worn, size: SET_SIZE, tiers };
}

export interface StatChange {
  readonly stat: GearStat;
  readonly by: number;
}

/** What wearing a bag piece does: the piece it takes off (null: the slot was empty), each stat's change, set bonuses turned on and off. */
export interface WearPreview {
  readonly replaces: ItemId | null;
  readonly changes: readonly StatChange[];
  readonly setsOn: readonly string[];
  readonly setsOff: readonly string[];
}

/** The set bonuses `h` has on, in words: "Corinthian set, 2 pieces: +1 Morale". */
const litBonuses = (h: Pick<Hero, 'gear'>): string[] => setProgress(h).flatMap((s) => s.tiers.filter((t) => t.lit).map((t) => `${s.name}, ${t.at} pieces: ${t.says}`));

/** What putting on the bag's piece `i` would change for `h` (as Wear does it); null with nothing there. */
export function wearPreview(h: Hero, i: number): WearPreview | null {
  if (!h.bag?.[i]) return null;
  const after = wear(h, i);
  if (after === h) return null;
  const swapped = (after.bag?.length ?? 0) === h.bag.length;
  const was = gearBonus(h);
  const now = gearBonus(after);
  const stats = Object.keys(GEAR_STAT_NAMES) as GearStat[];
  const changes = stats.map((stat) => ({ stat, by: (now[stat] ?? 0) - (was[stat] ?? 0) })).filter((c) => c.by !== 0);
  const before = litBonuses(h);
  const later = litBonuses(after);
  return {
    replaces: swapped ? after.bag!.at(-1)! : null,
    changes,
    setsOn: later.filter((b) => !before.includes(b)),
    setsOff: before.filter((b) => !later.includes(b)),
  };
}

/** A change in words: "+2 Attack", "−1 Defense". */
export const changeWords = (c: StatChange): string => `${c.by > 0 ? '+' : '−'}${Math.abs(c.by)} ${GEAR_STAT_NAMES[c.stat]}`;

/** A set's bonuses in a line, for a card that names the piece: "Corinthian set: 2 pieces +1 Morale, 4 pieces +1 Defense…", or that a common set gives none. */
export function setLine(id: ItemId): string {
  const set = itemDef(id).set;
  if (!set) return '';
  const bonus = setDef(set)?.bonus ?? {};
  const tiers = SET_TIERS.filter((at) => bonus[at]).map((at) => `${at} pieces ${bonusSays(bonus[at]!)}`);
  return `${SET_NAMES[set] ?? set}: ${tiers.length ? tiers.join(', ') : 'a common set, no set bonus'}`;
}
