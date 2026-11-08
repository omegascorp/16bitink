import { UNIT_ART, type UnitArt } from '../../art/pixel/manifest';
import { creature, isCreatureId, lineOf, lineUnits, tierOf, type CreatureId } from '../../logic/creatures';

/** A unit's art, and the tint a stand-in wears so it reads as someone else. */
export type FigureArt = UnitArt & { readonly tint?: number };

/** Egypt's sand and the desert neutrals' dust: the tints stand-ins wear. */
const STAND_IN_TINT = { kemet: 0xffd49a, neutral: 0xd8c4a4 } as const;

/**
 * Lines not drawn yet (Egypt's art is still to come) and the drawn line of
 * the same make each stands in as, level for level, tinted: so content can
 * be built and played before the art lands. The one place this is decided.
 */
const STAND_INS: Readonly<Partial<Record<CreatureId, CreatureId>>> = {
  levy: 'spearman', nubian: 'bowman', jackal: 'swordsman', chariot: 'lancer', mummy: 'skeleton', sphinx: 'griffin', bennu: 'seraph',
};

/** The drawn creature `id` borrows its art from (its line's stand-in at the same level), if it has none of its own. */
export function standInFor(id: CreatureId): CreatureId | null {
  const from = STAND_INS[lineOf(id)];
  if (UNIT_ART[id] || !from) return null;
  const same = lineUnits(from)[tierOf(id) - 1] ?? from;
  return UNIT_ART[same] ? same : from;
}

/** A unit's battle art: its own; a stand-in's, tinted; or (an upgrade not drawn yet) its line's base unit's. Never missing. */
export function figureArt(id: string): FigureArt {
  if (UNIT_ART[id]) return UNIT_ART[id]!;
  const standIn = isCreatureId(id) ? standInFor(id) : null;
  if (standIn && UNIT_ART[standIn]) {
    const faction = creature(id as CreatureId).faction;
    return { ...UNIT_ART[standIn]!, tint: faction === 'kemet' ? STAND_IN_TINT.kemet : STAND_IN_TINT.neutral };
  }
  return (isCreatureId(id) ? UNIT_ART[lineOf(id)] : undefined) ?? Object.values(UNIT_ART)[0]!;
}
