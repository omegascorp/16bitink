import type { CreatureId } from '../../logic/creatures';
import { itemQuality, QUALITIES, type ItemId, type Quality } from '../../logic/items';
import { rankOf, type Rarity } from '../../logic/rarity';
import type { RimName } from './pixelFrames';
import { RIMS } from './pixelFrames';
import type { Rgba } from './pixelRaster';

/**
 * The one rarity palette, units' ranks and gear's grades alike
 * (docs/inkheroes-design.md, "Rarity: five ranks"): Common grey, Uncommon
 * green, Rare blue, Epic purple, Legendary orange. Gold stays the UI's
 * mark for what is picked.
 */
export const RANK_RIM: Readonly<Record<Rarity, RimName>> = { 1: 'grey', 2: 'green', 3: 'blue', 4: 'purple', 5: 'orange' };

/** A grade of gear as a rank: its place in QUALITIES (gray, the first, is Common; the saved id 'gold' is Legendary, drawn orange). */
export const qualityRank = (q: Quality): Rarity => (QUALITIES.indexOf(q) + 1) as Rarity;
/** A piece's grade shows in its frame, in the ranks' colours. */
export const QUALITY_RIM: Readonly<Record<Quality, RimName>> = Object.fromEntries(QUALITIES.map((q) => [q, RANK_RIM[qualityRank(q)]])) as Record<Quality, RimName>;
/** The ink a piece's name is written in: its grade's colour, lit. */
export const qualityInk = (id: ItemId): Rgba => RIMS[QUALITY_RIM[itemQuality(id)]].light;

/** The frame round a unit's face: its rank's, or (a neutral, a war machine) the plain bronze. */
export const rimOfUnit = (id: CreatureId): RimName => {
  const r = rankOf(id);
  return r ? RANK_RIM[r] : 'bronze';
};

/** The ink a unit's name is written in: its rank's colour, lit (null: no rank, the usual ink). */
export const rankInk = (id: CreatureId): Rgba | null => {
  const r = rankOf(id);
  return r ? RIMS[RANK_RIM[r]].light : null;
};

/** How much of a rank's colour a dark well takes: a soft tint, the text still crisp on it. */
const TINT = 0.16;

/** A dark panel fill `base` tinted toward `rank`'s colour (no rank: `base` as it is). */
export function rankTint(rank: Rarity | null, base: Rgba): Rgba {
  if (!rank) return base;
  const c = RIMS[RANK_RIM[rank]].mid;
  const mix = (i: number): number => Math.round(base[i]! + (c[i]! - base[i]!) * TINT);
  return [mix(0), mix(1), mix(2), base[3]];
}
