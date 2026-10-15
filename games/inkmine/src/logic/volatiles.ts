import { inside, TILE, tileAt, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * Things in the rock that blow, each there for a reason (spec, "Firedamp
 * and old charges"), never cartoon crates:
 *
 * - Firedamp: a pocket of methane trapped in the rock, the old hazard of
 *   coal and graphite mines. Natural, scattered by the level's builder. It
 *   hisses when the drill opens it and bursts a moment later.
 * - Charge: a blasting charge an earlier crew drilled into the rock face
 *   and never fired. Only where a level places one, for a mission (blast the
 *   cave-in open) or a contract (leave the old relay standing).
 * - Line charge: charges strung on detonating cord along a seam; it breaks
 *   its whole row.
 *
 * Ids live in the terrain's volatile layer; never renumber one.
 */
export const VOLATILES = {
  firedamp: { id: 1, key: 'firedamp', name: 'firedamp', fuse: 0.7, area: 'burst' },
  charge: { id: 2, key: 'charge', name: 'old charge', fuse: 1.4, area: 'burst' },
  lineCharge: { id: 3, key: 'lineCharge', name: 'line charge', fuse: 1.4, area: 'row' },
} as const;

export type VolatileKey = keyof typeof VOLATILES;

export const BLAST = {
  /** One set off by another's blast goes almost at once, so chains ripple. */
  chainFuse: 0.18,
  /** A line charge breaks this many tiles each way along its row. */
  rowReach: 4,
} as const;

const BY_ID: ReadonlyMap<number, VolatileKey> = new Map(Object.values(VOLATILES).map((v) => [v.id, v.key]));

export function volatileKeyOf(id: number): VolatileKey | null {
  return BY_ID.get(id) ?? null;
}

/** The tiles a blast covers (in the grid, folded round a wrapping world's join), whatever is in them. */
export function blastArea(t: Terrain, kind: VolatileKey, x: number, y: number): TilePos[] {
  const out: TilePos[] = [];
  if (VOLATILES[kind].area === 'burst') {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([x + dx, y + dy]);
  } else {
    for (let dx = -BLAST.rowReach; dx <= BLAST.rowReach; dx++) out.push([x + dx, y]);
  }
  return out.filter(([bx, by]) => inside(t, bx, by)).map(([bx, by]) => [wrapX(t, bx), by] as const);
}

/** Whether a blast breaks this tile: soil and stone, never deep rock or bedrock. */
export function blastBreaks(t: Terrain, x: number, y: number): boolean {
  const tile = tileAt(t, x, y);
  return tile === TILE.soil || tile === TILE.stone;
}
