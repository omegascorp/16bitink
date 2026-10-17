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
 * you for), each paired with what the part is really made of (spec, "Gear"):
 * the cell's graphite anode on copper foil, the pack's carbon frame with
 * copper fittings, the drill's copper windings with graphite brushes and
 * diamond grit, a fused-quartz visor, a graphite nozzle with silver joints,
 * glass-fibre cloth for the suit.
 */
const MK1: readonly Recipe[] = [
  recipe('cell', 1, { graphite: 4, copper: 6 }),
  recipe('pack', 1, { graphite: 6, copper: 2 }),
  recipe('drill', 1, { graphite: 6, copper: 4 }),
  recipe('helmet', 1, { graphite: 4, quartz: 2 }),
  recipe('jetpack', 1, { graphite: 5, silver: 3 }),
  recipe('suit', 1, { graphite: 8, quartz: 3 }),
];

/**
 * Mycel's Mk 2 set, from what a warm, wet, living moon lays down: the
 * cell's pyrite cathode on a copper (malachite) collector, as real
 * lithium-iron disulfide cells are built; a pack of coal-pitch carbon fibre
 * bound with amber resin; the drill's iron bit (from pyrite) with copper
 * windings; a helmet visor of optical calcite under an amber filter; a
 * carbon nozzle pressed from lignite on iron joints; and a suit of mineral
 * wool spun from calcite (as rock wool is from limestone), bound in amber.
 * Amber, Mycel's signature, is in three of them. They ship with the game
 * (saves keep only known blueprints), though Mycel itself comes from the
 * server.
 */
const MK2: readonly Recipe[] = [
  recipe('cell', 2, { pyrite: 5, malachite: 3 }),
  recipe('pack', 2, { lignite: 5, amber: 2 }),
  recipe('drill', 2, { pyrite: 6, malachite: 4 }),
  recipe('helmet', 2, { calcite: 4, amber: 2 }),
  recipe('jetpack', 2, { lignite: 5, pyrite: 3 }),
  recipe('suit', 2, { calcite: 6, amber: 3 }),
];

export const RECIPES: Readonly<Record<string, Recipe>> = Object.fromEntries([...MK1, ...MK2].map((r) => [r.id, r]));

/**
 * What taking an old part apart gives back: half of each material it
 * takes to print (at least one of each). Repeats of a design you already
 * know still give this, so every broken part is worth the walk.
 */
export function salvageOf(id: string): Hold {
  const r = RECIPES[id];
  if (!r) return {};
  return Object.fromEntries(Object.entries(r.materials).map(([ore, n]) => [ore, Math.max(1, Math.floor((n ?? 0) / 2))]));
}

export function recipeOf(id: string): Recipe | undefined {
  return RECIPES[id];
}

/** Whether a blueprint's part is already built (at its mark or better). */
export function isBuilt(r: Recipe, gear: Loadout): boolean {
  return gear[r.piece] >= r.mk;
}

export type BuildCheck = 'ok' | 'built' | 'notFound' | 'materials';

/**
 * Whether a blueprint can be printed now, or why not. Marks can be skipped
 * (Oct 17, 2026): a Mk 2 found on Mycel prints over a Mk 0, whether or not
 * Graphite's Mk 1 was ever found. `has` says whether the materials are on
 * hand.
 */
export function canBuild(r: Recipe, found: readonly string[], gear: Loadout, has: (need: Hold) => boolean): BuildCheck {
  if (isBuilt(r, gear)) return 'built';
  if (!found.includes(r.id)) return 'notFound';
  return has(r.materials) ? 'ok' : 'materials';
}

/** The design to print next for a piece: the best mark found above what's built, or else (to say it's still to find) the one after it. */
export function nextMark(piece: Piece, found: readonly string[], gear: Loadout): Recipe | undefined {
  for (let mk = 10; mk > gear[piece]; mk--) {
    const r = RECIPES[blueprintId(piece, mk)];
    if (r && found.includes(r.id)) return r;
  }
  return RECIPES[blueprintId(piece, gear[piece] + 1)];
}
