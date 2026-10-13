import { blastArea, blastBreaks, CRATE, crateKeyOf, type CrateKey } from './crates';
import { contentAt, inside, setTile, TILE, tileAt, type Terrain, type TilePos } from './terrain';

/** A crate that went off: what its blast covered, what it broke and the ore it broke loose. */
export interface Blast {
  readonly kind: CrateKey;
  readonly at: TilePos;
  readonly area: readonly TilePos[];
  readonly broken: readonly TilePos[];
  /** Ore ids found in broken tiles, with their tiles. */
  readonly ores: readonly { readonly ore: number; readonly tile: TilePos }[];
}

/** A lit crate, for drawing its warning. */
export interface LitCrate {
  readonly tile: TilePos;
  readonly kind: CrateKey;
  /** Seconds to the blast. */
  readonly left: number;
}

/**
 * The crates in a dig site: their fuses, and their fall when the ground
 * under them is dug out. Crates move one tile per CRATE.fallStep and never
 * into a tile `occupied` says is taken (the prospector), so one can come to
 * rest on a helmet and drop again when they step aside.
 */
export class CrateSim {
  private readonly crates = new Set<number>();
  private readonly fuses = new Map<number, number>();
  private fallClock = 0;

  constructor(private readonly terrain: Terrain) {
    terrain.tiles.forEach((tile, i) => {
      if (tile === TILE.crate) this.crates.add(i);
    });
  }

  /** Lights the crate at (x, y), or shortens its fuse to `fuse`. */
  light(x: number, y: number, fuse: number = CRATE.fuse): void {
    if (tileAt(this.terrain, x, y) !== TILE.crate) return;
    const i = this.index(x, y);
    this.fuses.set(i, Math.min(this.fuses.get(i) ?? Infinity, fuse));
  }

  isLit(x: number, y: number): boolean {
    return inside(this.terrain, x, y) && this.fuses.has(this.index(x, y));
  }

  lit(): LitCrate[] {
    return [...this.fuses].map(([i, left]) => {
      const tile = this.tileOf(i);
      return { tile, left, kind: crateKeyOf(contentAt(this.terrain, tile[0], tile[1])) ?? 'bomb' };
    });
  }

  /** Every crate's tile, for drawing. */
  all(): TilePos[] {
    return [...this.crates].map((i) => this.tileOf(i));
  }

  /** Burns fuses and drops crates; returns the tiles that changed and the blasts. */
  step(dt: number, occupied: (x: number, y: number) => boolean): { changed: TilePos[]; blasts: Blast[] } {
    const changed: TilePos[] = [];
    const blasts: Blast[] = [];
    for (const [i, left] of [...this.fuses]) {
      if (left - dt > 0) {
        this.fuses.set(i, left - dt);
        continue;
      }
      this.fuses.delete(i);
      if (!this.crates.has(i)) continue;
      const blast = this.explode(i);
      blasts.push(blast);
      changed.push(blast.at, ...blast.broken);
    }
    this.fallClock += dt;
    while (this.fallClock >= CRATE.fallStep) {
      this.fallClock -= CRATE.fallStep;
      changed.push(...this.fall(occupied));
    }
    return { changed, blasts };
  }

  private explode(i: number): Blast {
    const t = this.terrain;
    const [x, y] = this.tileOf(i);
    const kind = crateKeyOf(contentAt(t, x, y)) ?? 'bomb';
    this.crates.delete(i);
    setTile(t, x, y, TILE.air);
    const area = blastArea(t, kind, x, y);
    const broken: TilePos[] = [];
    const ores: { ore: number; tile: TilePos }[] = [];
    for (const [bx, by] of area) {
      if (tileAt(t, bx, by) === TILE.crate) {
        this.light(bx, by, CRATE.chainFuse);
        continue;
      }
      if (!blastBreaks(t, bx, by)) continue;
      const ore = contentAt(t, bx, by);
      if (ore) ores.push({ ore, tile: [bx, by] });
      setTile(t, bx, by, TILE.air);
      broken.push([bx, by]);
    }
    return { kind, at: [x, y], area, broken, ores };
  }

  /** Every crate with open ground under it drops a tile, lowest first so a stack falls together. */
  private fall(occupied: (x: number, y: number) => boolean): TilePos[] {
    const t = this.terrain;
    const changed: TilePos[] = [];
    for (const i of [...this.crates].sort((a, b) => b - a)) {
      const [x, y] = this.tileOf(i);
      if (!inside(t, x, y + 1) || tileAt(t, x, y + 1) !== TILE.air || occupied(x, y + 1)) continue;
      setTile(t, x, y + 1, TILE.crate, contentAt(t, x, y));
      setTile(t, x, y, TILE.air);
      const below = this.index(x, y + 1);
      this.crates.delete(i);
      this.crates.add(below);
      const fuse = this.fuses.get(i);
      if (fuse !== undefined) {
        this.fuses.delete(i);
        this.fuses.set(below, fuse);
      }
      changed.push([x, y], [x, y + 1]);
    }
    return changed;
  }

  private index(x: number, y: number): number {
    return y * this.terrain.width + x;
  }

  private tileOf(i: number): TilePos {
    return [i % this.terrain.width, Math.floor(i / this.terrain.width)];
  }
}
