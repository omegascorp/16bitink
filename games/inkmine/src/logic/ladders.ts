import { indexOf, inside, isSolid, type Terrain, type TilePos } from './terrain';

/**
 * The ladder gadget: it unrolls up from where you stand until it reaches a
 * way out (a row with open ground to one side, plus a rung above it to
 * step off from) or the roof, up to LADDER_MAX rungs. Ladders hang in open
 * tiles; they aren't ground, so digging is unaffected.
 */
export const LADDER_MAX = 12;

/** The rungs a ladder placed at (col, row) would cover, bottom first; empty if that tile isn't open. */
export function ladderRungs(t: Terrain, col: number, row: number): TilePos[] {
  const rungs: TilePos[] = [];
  let exit = false;
  for (let y = row; y >= 0 && rungs.length < LADDER_MAX; y--) {
    if (isSolid(t, col, y)) break;
    rungs.push([col, y]);
    if (exit) break;
    // A row you can walk off into: one more rung so your feet clear it.
    if (y < row && (!isSolid(t, col - 1, y) || !isSolid(t, col + 1, y))) exit = true;
  }
  return rungs;
}

/** A set of rung tiles, by index. */
export class Ladders {
  private readonly rungs = new Set<number>();

  constructor(private readonly terrain: Terrain) {}

  has(x: number, y: number): boolean {
    return inside(this.terrain, x, y) && this.rungs.has(indexOf(this.terrain, x, y));
  }

  add(tiles: readonly TilePos[]): void {
    for (const [x, y] of tiles) if (inside(this.terrain, x, y)) this.rungs.add(indexOf(this.terrain, x, y));
  }

  /** How many rungs hang. */
  get count(): number {
    return this.rungs.size;
  }

  /** Every rung, for drawing. */
  all(): TilePos[] {
    return [...this.rungs].map((i) => [i % this.terrain.width, Math.floor(i / this.terrain.width)] as const);
  }
}
