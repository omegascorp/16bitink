import type { Loadout, Piece } from './gear';
import type { Hold } from './hold';

/**
 * Blueprints (spec, "Gear: blueprints, materials, the fabricator"): each
 * gear piece's next mark is printed from its blueprint and the planet's
 * materials (its signature material plus one of its ores or gems). There's
 * no money: what you dig is what you print with. Blueprints are found or
 * earned, never bought.
 *
 * Ids are `<piece>-<mark>` and are saved: never change one.
 */
export interface Recipe {
  readonly id: string;
  readonly piece: Piece;
  readonly mk: number;
  readonly materials: Hold;
}

const recipe = (piece: Piece, mk: number, materials: Hold): Recipe => ({ id: blueprintId(piece, mk), piece, mk, materials });

export const blueprintId = (piece: Piece, mk: number): string => `${piece}-${mk}`;

/**
 * Graphite's Mk 1 set. Graphite is in all of them (it's what the guild sent
 * you for), each paired with an ore the levels that hand out its blueprint
 * are rich in: copper and galena near the top, quartz and silver deeper.
 */
export const RECIPES: Readonly<Record<string, Recipe>> = Object.fromEntries([
  recipe('cell', 1, { graphite: 4, copper: 6 }),
  recipe('pack', 1, { graphite: 3, copper: 8 }),
  recipe('drill', 1, { graphite: 6, galena: 4 }),
  recipe('helmet', 1, { graphite: 4, quartz: 2 }),
  recipe('jetpack', 1, { graphite: 5, silver: 3 }),
  recipe('suit', 1, { graphite: 8, quartz: 3 }),
].map((r) => [r.id, r]));

export function recipeOf(id: string): Recipe | undefined {
  return RECIPES[id];
}

/** Whether a blueprint's part is already built (at its mark or better). */
export function isBuilt(r: Recipe, gear: Loadout): boolean {
  return gear[r.piece] >= r.mk;
}

export type BuildCheck = 'ok' | 'built' | 'notFound' | 'materials' | 'order';

/** Whether a blueprint can be printed now, or why not. A mark needs the one before it. `has` says whether the materials are on hand. */
export function canBuild(r: Recipe, found: readonly string[], gear: Loadout, has: (need: Hold) => boolean): BuildCheck {
  if (isBuilt(r, gear)) return 'built';
  if (!found.includes(r.id)) return 'notFound';
  if (gear[r.piece] !== r.mk - 1) return 'order';
  return has(r.materials) ? 'ok' : 'materials';
}
