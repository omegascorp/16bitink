import { PIECES, type Loadout, type Piece } from './gear';
import { capHold, EMPTY_HOLD, holds, sumHolds, type Hold } from './hold';

/**
 * Blueprints (spec, "Gear: blueprints, materials, the fabricator"): each
 * gear piece's next mark is built from its blueprint, the planet's
 * materials (its signature material plus one of its ores or gems) and a
 * fabrication fee. Blueprints are found or earned, never bought.
 *
 * Ids are `<piece>-<mark>` and are saved: never change one.
 */
export interface Recipe {
  readonly id: string;
  readonly piece: Piece;
  readonly mk: number;
  readonly materials: Hold;
  /** Credits. */
  readonly fee: number;
}

const recipe = (piece: Piece, mk: number, materials: Hold, fee: number): Recipe => ({ id: blueprintId(piece, mk), piece, mk, materials, fee });

export const blueprintId = (piece: Piece, mk: number): string => `${piece}-${mk}`;

/**
 * Graphite's Mk 1 set. Graphite is in all of them (it's what the guild sent
 * you for), each paired with an ore the levels that hand out its blueprint
 * are rich in: copper and galena near the top, quartz and silver deeper.
 */
export const RECIPES: Readonly<Record<string, Recipe>> = Object.fromEntries([
  recipe('cell', 1, { graphite: 4, copper: 6 }, 60),
  recipe('pack', 1, { graphite: 3, copper: 8 }, 60),
  recipe('drill', 1, { graphite: 6, galena: 4 }, 100),
  recipe('helmet', 1, { graphite: 4, quartz: 2 }, 90),
  recipe('jetpack', 1, { graphite: 5, silver: 3 }, 120),
  recipe('suit', 1, { graphite: 8, quartz: 3 }, 150),
].map((r) => [r.id, r]));

export function recipeOf(id: string): Recipe | undefined {
  return RECIPES[id];
}

/** Whether a blueprint's part is already built (at its mark or better). */
export function isBuilt(r: Recipe, gear: Loadout): boolean {
  return gear[r.piece] >= r.mk;
}

/** The blueprints found and not yet built, by piece order. */
export function unbuilt(found: readonly string[], gear: Loadout): Recipe[] {
  return PIECES.flatMap((p) => found.map(recipeOf).filter((r): r is Recipe => !!r && r.piece === p && !isBuilt(r, gear)));
}

/** What the hold keeps for the found, unbuilt blueprints (the rest is sold at lift-off). */
export function reserveFor(found: readonly string[], gear: Loadout): Hold {
  return sumHolds(unbuilt(found, gear).map((r) => r.materials));
}

/**
 * The planet's signature material kept back too, up to what all its gear
 * still needs: blueprints turn up one by one, and the graphite banked before
 * the drill's is found shouldn't have been sold for 8 credits apiece.
 */
export function signatureReserve(signature: keyof Hold, gear: Loadout): Hold {
  const need = Object.values(RECIPES).filter((r) => !isBuilt(r, gear)).reduce((n, r) => n + (r.materials[signature] ?? 0), 0);
  return need ? { [signature]: need } : EMPTY_HOLD;
}

export type BuildCheck = 'ok' | 'built' | 'notFound' | 'materials' | 'credits' | 'order';

/** Whether a blueprint can be built now, or why not. A mark needs the one before it. */
export function canBuild(r: Recipe, found: readonly string[], gear: Loadout, hold: Hold, credits: number): BuildCheck {
  if (isBuilt(r, gear)) return 'built';
  if (!found.includes(r.id)) return 'notFound';
  if (gear[r.piece] !== r.mk - 1) return 'order';
  if (!holds(hold, r.materials)) return 'materials';
  if (credits < r.fee) return 'credits';
  return 'ok';
}

/** How much of a recipe the hold already covers, for ticking it off on the sheet. */
export function recipeProgress(r: Recipe, hold: Hold): Hold {
  return capHold(r.materials, hold);
}
