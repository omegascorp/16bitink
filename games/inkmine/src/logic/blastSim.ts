import { contentAt, setTile, TILE, volatileAt, type Terrain, type TilePos } from './terrain';
import { BLAST, blastArea, blastBreaks, VOLATILES, volatileKeyOf, type VolatileKey } from './volatiles';

/** Something that went off: what its blast covered, what it broke and the ore it broke loose. */
export interface Blast {
  readonly kind: VolatileKey;
  readonly at: TilePos;
  readonly area: readonly TilePos[];
  readonly broken: readonly TilePos[];
  /** Ore ids found in broken tiles, with their tiles. */
  readonly ores: readonly { readonly ore: number; readonly tile: TilePos }[];
}

/** A placed charge, for drawing (firedamp is drawn into the ground). */
export interface Placed {
  readonly tile: TilePos;
  readonly kind: 'charge' | 'lineCharge';
}

/** A lit volatile, for drawing its warning. */
export interface Lit {
  readonly tile: TilePos;
  readonly kind: VolatileKey;
  /** Seconds to the blast. */
  readonly left: number;
}

/**
 * The fuses of everything in a dig site that can blow (volatiles.ts).
 * Volatiles sit fixed in the rock: drilling one lights it, a blast lights
 * any its area reaches, and when one goes it breaks the soil and stone
 * round it (never deep rock or bedrock) along with its own tile.
 */
export class BlastSim {
  private readonly fuses = new Map<number, number>();
  /** Where the placed charges are (by tile index), so they needn't be searched for every frame. */
  private readonly charges = new Set<number>();

  constructor(private readonly terrain: Terrain) {
    terrain.volatile.forEach((id, i) => {
      const kind = volatileKeyOf(id);
      if (kind === 'charge' || kind === 'lineCharge') this.charges.add(i);
    });
  }

  placed(): Placed[] {
    return [...this.charges].map((i) => {
      const tile = this.tileOf(i);
      return { tile, kind: volatileKeyOf(volatileAt(this.terrain, tile[0], tile[1])) === 'lineCharge' ? 'lineCharge' : 'charge' };
    });
  }

  /** Lights the volatile at (x, y) on its own fuse, or shortens a lit one to `fuse`. */
  light(x: number, y: number, fuse?: number): void {
    const kind = volatileKeyOf(volatileAt(this.terrain, x, y));
    if (!kind) return;
    const i = this.index(x, y);
    this.fuses.set(i, Math.min(this.fuses.get(i) ?? Infinity, fuse ?? VOLATILES[kind].fuse));
  }

  isLit(x: number, y: number): boolean {
    return volatileAt(this.terrain, x, y) !== 0 && this.fuses.has(this.index(x, y));
  }

  lit(): Lit[] {
    return [...this.fuses].map(([i, left]) => {
      const tile = this.tileOf(i);
      return { tile, left, kind: volatileKeyOf(volatileAt(this.terrain, tile[0], tile[1])) ?? 'firedamp' };
    });
  }

  /** Burns fuses; returns the tiles that changed and the blasts. */
  step(dt: number): { changed: TilePos[]; blasts: Blast[] } {
    const changed: TilePos[] = [];
    const blasts: Blast[] = [];
    for (const [i, left] of [...this.fuses]) {
      if (left - dt > 0) {
        this.fuses.set(i, left - dt);
        continue;
      }
      this.fuses.delete(i);
      const [x, y] = this.tileOf(i);
      const kind = volatileKeyOf(volatileAt(this.terrain, x, y));
      if (!kind) continue;
      const blast = this.explode(kind, x, y);
      blasts.push(blast);
      changed.push(blast.at, ...blast.broken);
    }
    return { changed, blasts };
  }

  private explode(kind: VolatileKey, x: number, y: number): Blast {
    const t = this.terrain;
    const own = contentAt(t, x, y);
    this.charges.delete(this.index(x, y));
    // Its own pocket or bore hole is blown open, whatever rock it sat in.
    setTile(t, x, y, TILE.air);
    const area = blastArea(t, kind, x, y);
    const broken: TilePos[] = [[x, y]];
    const ores: { ore: number; tile: TilePos }[] = own ? [{ ore: own, tile: [x, y] }] : [];
    for (const [bx, by] of area) {
      if (bx === x && by === y) continue;
      if (volatileAt(t, bx, by)) {
        this.light(bx, by, BLAST.chainFuse);
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

  private index(x: number, y: number): number {
    return y * this.terrain.width + x;
  }

  private tileOf(i: number): TilePos {
    return [i % this.terrain.width, Math.floor(i / this.terrain.width)];
  }
}
