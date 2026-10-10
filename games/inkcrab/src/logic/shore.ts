import type { TilePos } from './dig';
import { food, shell, type ItemKind } from './items';
import type { Rng } from './rng';
import type { ShellKind } from './shells';
import { isSolid, surfaceRow, type Terrain } from './terrain';
import { highWaters, tideY, type TideSpec } from './tide';
import { createWater, updateWater, washStep, type Water } from './water';

/** Seconds between updates of the water (the tide moves slowly; a tile a tick is plenty). */
const WATER_EVERY = 0.1;

/** What each high water washes in: food along the strandline, and shells in order (kind, size and column), one a tide. */
export interface TideBrings {
  readonly food: number;
  readonly shells?: readonly (readonly [ShellKind, number, number])[];
}

/** A rock pool as carved: first column, width, depth. */
export type Pool = readonly [number, number, number];

/**
 * A tidal beach's sea: the water following the tide up and down, sand
 * put down in the sea washing flat, and what each high water brings in.
 */
export class Shore {
  readonly water: Water;
  private timer = 0;
  /** High waters so far, and how many of the washed-in shells have come. */
  private tides = 0;
  private shellsIn = 0;

  constructor(
    private readonly terrain: Terrain,
    private readonly tile: number,
    readonly tide: TideSpec,
    private readonly brings: TideBrings | undefined,
    pools: readonly Pool[],
  ) {
    this.water = this.flood(pools);
  }

  /** World y of the sea's surface at `time`. */
  seaY(time: number): number {
    return tideY(this.tide, time, this.tile);
  }

  /**
   * One step at `time`: water and washing sand at their own pace; each new
   * high water hands what it brings to `drop`. Returns tiles the sea moved,
   * as from/to pairs.
   */
  step(dt: number, time: number, rng: Rng, drop: (kind: ItemKind, col: number) => void): TilePos[] {
    let washed: TilePos[] = [];
    this.timer += dt;
    if (this.timer >= WATER_EVERY) {
      this.timer = 0;
      updateWater(this.terrain, this.water, this.seaY(time), this.tile);
      washed = washStep(this.terrain, this.water, Math.floor(time * 10) % 2 === 0);
    }
    const high = highWaters(this.tide, time);
    if (high > this.tides) {
      this.tides = high;
      this.washIn(rng, drop);
    }
    return washed;
  }

  /**
   * The water at the start: the sea at high water, then out to low (where
   * every level starts), leaving its pools full; pools above the high-water
   * line are filled by hand.
   */
  private flood(pools: readonly Pool[]): Water {
    const t = this.terrain;
    const w = createWater(t);
    for (const [x0, width, depth] of pools) {
      const rim = Math.max(surfaceRow(t, x0 - 1), surfaceRow(t, x0 + width));
      for (let x = x0; x < x0 + width; x++) for (let y = rim; y < rim + depth; y++) if (!isSolid(t, x, y)) w.wet[y * t.width + x] = 1;
    }
    for (const seaY of [this.tide.high * this.tile, this.seaY(0)]) for (let i = 0; i < t.height * 2 && updateWater(t, w, seaY, this.tile); i++);
    return w;
  }

  /** At high water: food along the strandline (where the high water meets the sand), and the level's next shell. */
  private washIn(rng: Rng, drop: (kind: ItemKind, col: number) => void): void {
    if (!this.brings) return;
    const t = this.terrain;
    const line: number[] = [];
    for (let x = 1; x < t.width - 1; x++) {
      const s = surfaceRow(t, x);
      if (s >= this.tide.high && s <= this.tide.high + 3) line.push(x);
    }
    for (let i = 0; i < this.brings.food && line.length; i++) drop(food(rng() < 0.5 ? 'hopper' : 'worm'), line[Math.floor(rng() * line.length)]!);
    const next = this.brings.shells?.[this.shellsIn];
    if (next) {
      this.shellsIn++;
      drop(shell(next[0], next[1]), next[2]);
    }
  }
}
