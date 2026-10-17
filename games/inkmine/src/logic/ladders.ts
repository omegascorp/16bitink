import { indexOf, inside, type Terrain, type TilePos } from './terrain';

/**
 * Ladders hanging in a world. They can no longer be placed; this keeps the
 * ones an older save left behind, still climbable. They hang in open tiles
 * and aren't ground, so digging is unaffected.
 */
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
