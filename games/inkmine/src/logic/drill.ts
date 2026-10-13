import { gradeOf, TILE, type Grade, type Tile } from './terrain';

/**
 * What a block costs to drill (docs/inkmine-design.md, "Digging and
 * blocks"). It depends only on the block's grade and how the drill's mark
 * compares with the planet's number: you land on planet N with the last
 * planet's drill (behind), build planet N's own there, and come back later
 * with a better one (ahead).
 *
 * | Grade     | behind | own | ahead |
 * | soil      | 2      | 1   | 1     |
 * | stone     | —      | 2   | 1     |
 * | deep rock | —      | —   | 2     |
 *
 * Graphite, the first planet, is gentler: its soil costs 1 even with the
 * starter drill, so the first levels teach drilling before saving energy.
 */
export type DrillStanding = 'behind' | 'own' | 'ahead';

const COST: Readonly<Record<DrillStanding, readonly (number | null)[]>> = {
  behind: [2, null, null],
  own: [1, 2, null],
  ahead: [1, 1, 2],
};

/** Energy to drill a crate: a tap sets it off. */
export const CRATE_COST = 1;
/** Seconds a block of each energy cost takes to drill through. */
export const DRILL_SECONDS_PER_ENERGY = 0.16;

export interface DrillSpec {
  /** The drill's mark (0 is the starter drill). */
  readonly mk: number;
  /** The planet's number, 1..10. */
  readonly planet: number;
}

export function standing(d: DrillSpec): DrillStanding {
  if (d.mk < d.planet) return 'behind';
  return d.mk === d.planet ? 'own' : 'ahead';
}

/** Energy one block of `grade` costs with this drill, or null when it is too hard. */
export function gradeCost(d: DrillSpec, grade: Grade): number | null {
  const s = standing(d);
  if (s === 'behind' && grade === 0 && d.planet === 1) return 1;
  return COST[s][grade] ?? null;
}

/** Energy a tile costs to drill, or null when it can't be drilled (air, bedrock, too hard). */
export function tileCost(d: DrillSpec, tile: Tile): number | null {
  if (tile === TILE.crate) return CRATE_COST;
  const grade = gradeOf(tile);
  return grade === null ? null : gradeCost(d, grade);
}

/** Whether the drill can't break this grade (drawn with a heavier outline so it reads before you try). */
export function tooHard(d: DrillSpec, grade: Grade): boolean {
  return gradeCost(d, grade) === null;
}
