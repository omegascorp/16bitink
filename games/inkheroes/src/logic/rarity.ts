import { creature, tierOf, type CreatureId } from './creatures';

/**
 * A unit's level in its line is its rarity (docs/inkheroes-design.md,
 * "Rarity: five ranks"), shown by colour wherever it is drawn, as gear's
 * qualities are. Towns hire and upgrade up to Rare; Epic and Legendary are
 * trained at sites on the map (src/logic/training.ts). Neutrals and war
 * machines have no rank.
 */

export type Rarity = 1 | 2 | 3 | 4 | 5;

/** The highest rank a town hires or upgrades to. */
export const TOWN_TOP: Rarity = 3;
/** The highest rank there is. */
export const TOP_RANK: Rarity = 5;

export const RARITY_NAMES: Readonly<Record<Rarity, string>> = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary' };
/** Each rank's colour, in words (the scenes' rim and ink for it: src/scenes/battle/rankLook.ts). */
export const RARITY_COLOURS: Readonly<Record<Rarity, 'grey' | 'green' | 'blue' | 'purple' | 'orange'>> = { 1: 'grey', 2: 'green', 3: 'blue', 4: 'purple', 5: 'orange' };

/** A town people's unit's rank (its level in its line); null for neutrals and war machines. */
export function rankOf(id: CreatureId): Rarity | null {
  const c = creature(id);
  return c.faction === 'crown' || c.faction === 'kemet' ? tierOf(id) : null;
}

/** "Epic · level 4 of 5": a ranked unit's rank as its card names it (null: no rank). */
export function rankLine(id: CreatureId): string | null {
  const r = rankOf(id);
  return r ? `${RARITY_NAMES[r]} · level ${r} of ${TOP_RANK}` : null;
}
