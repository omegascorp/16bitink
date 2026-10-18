import { isSolid, setTile, TILE, tileAt, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * Loose rock (spec, "Talus: its new mechanic"): Talus is named for the
 * slopes of broken rock that pile up under its cliffs. A loose tile sits
 * where it is while something solid is under it. Dig that out and it
 * shakes for a moment, then drops straight down until it lands, and stays
 * loose where it lands. Whatever loose rock was stacked on it comes down
 * with it, so a whole column falls one block on another (Mr. Driller,
 * SteamWorld Dig).
 *
 * Pure simulation on the tile grid: the Mine decides what a falling rock
 * hits (the prospector, a creature). The terrain is mutated in place.
 */
export const ROCK = {
  /** Seconds a rock shakes before it drops: time to get out from under it. */
  shake: 0.5,
  /** px/s² and px/s, as the prospector falls. */
  gravity: 900,
  maxFall: 520,
} as const;

/** A loose rock about to drop, at its tile. */
export interface Shaking {
  readonly col: number;
  readonly row: number;
  /** Seconds before it drops. */
  readonly left: number;
}

/** A loose rock in the air: its column and the top of it, px, and the row it fell from (it keeps that rock's look). */
export interface FallingRock {
  readonly col: number;
  readonly y: number;
  readonly vy: number;
  readonly from: number;
}

/** What a step of falling did to the ground. */
export interface RockStep {
  /** Rocks that just started to shake. */
  readonly shook: readonly TilePos[];
  /** Tiles rocks dropped out of: open now. */
  readonly freed: readonly TilePos[];
  /** Tiles rocks came to rest in: loose rock now. */
  readonly landed: readonly TilePos[];
}

const EPS = 1e-6;

/** Whether the loose rock at (x, y) has nothing under it to stand on. */
export function unsupported(t: Terrain, x: number, y: number): boolean {
  return tileAt(t, x, y) === TILE.loose && !isSolid(t, x, y + 1);
}

export class Rocks {
  shaking: Shaking[] = [];
  falling: FallingRock[] = [];
  /** Shaken rocks waiting for the next step to say so. */
  private shook: TilePos[] = [];

  constructor(
    private readonly t: Terrain,
    private readonly tile: number,
  ) {}

  /** Whether any rock is shaking or falling. */
  get moving(): boolean {
    return this.shaking.length > 0 || this.falling.length > 0;
  }

  /** Ground just opened: a loose rock left standing on nothing starts to shake. */
  opened(tiles: readonly TilePos[]): void {
    for (const [x, y] of tiles) {
      const col = wrapX(this.t, x);
      if (!unsupported(this.t, col, y - 1) || this.isShaking(col, y - 1)) continue;
      this.shaking.push({ col, row: y - 1, left: ROCK.shake });
      this.shook.push([col, y - 1]);
    }
  }

  /** Shakes run down and drop their columns; falling rocks fall, and land. */
  step(dt: number): RockStep {
    const shook = this.shook;
    this.shook = [];
    const freed: TilePos[] = [];
    const landed: TilePos[] = [];
    const due = this.shaking.map((s) => ({ ...s, left: s.left - dt }));
    this.shaking = due.filter((s) => s.left > 0);
    for (const s of due) if (s.left <= 0 && unsupported(this.t, s.col, s.row)) freed.push(...this.drop(s.col, s.row));
    // Lowest first, so a rock lands on the one under it after that one has landed.
    const order = [...this.falling].sort((a, b) => b.y - a.y);
    const still: FallingRock[] = [];
    for (const r of order) {
      const vy = Math.min(ROCK.maxFall, r.vy + ROCK.gravity * dt);
      const y = r.y + vy * dt;
      const under = Math.floor((y + this.tile - EPS) / this.tile);
      if (!isSolid(this.t, r.col, under)) {
        still.push({ ...r, y, vy });
        continue;
      }
      const row = this.restRow(r.col, under - 1);
      setTile(this.t, r.col, row, TILE.loose);
      landed.push([r.col, row]);
    }
    this.falling = still;
    return { shook, freed, landed };
  }

  /**
   * A rock shaken loose from a cave's roof (the Rockslide's doing): it
   * drops from the open tile under the roof over column `col`, the first
   * roof up from `row`, if there's one within `reach` rows. Returns whether
   * one came down.
   */
  fromRoof(col: number, row: number, reach: number): boolean {
    const c = wrapX(this.t, col);
    let y = row;
    while (y > 0 && row - y < reach && !isSolid(this.t, c, y - 1)) y--;
    if (y <= 0 || isSolid(this.t, c, y) || !isSolid(this.t, c, y - 1) || tileAt(this.t, c, y - 1) === TILE.bedrock) return false;
    this.falling.push({ col: c, y: y * this.tile, vy: 0, from: y });
    return true;
  }

  /** A falling rock broke apart on something (the prospector): it's gone. */
  shatter(rock: FallingRock): void {
    this.falling = this.falling.filter((r) => r !== rock);
  }

  /** The rock at (col, row) and every loose rock stacked on it leave the ground together and fall. Returns the tiles they left. */
  private drop(col: number, row: number): TilePos[] {
    const freed: TilePos[] = [];
    for (let y = row; y >= 0 && tileAt(this.t, col, y) === TILE.loose; y--) {
      setTile(this.t, col, y, TILE.air);
      this.falling.push({ col, y: y * this.tile, vy: 0, from: y });
      freed.push([col, y]);
    }
    const left = new Set(freed.map(([, y]) => y));
    this.shaking = this.shaking.filter((s) => s.col !== col || !left.has(s.row));
    return freed;
  }

  /** The row a rock comes to rest in: `row`, or the first open one above it if something got there first. */
  private restRow(col: number, row: number): number {
    let y = row;
    while (y > 0 && isSolid(this.t, col, y)) y--;
    return y;
  }

  private isShaking(col: number, row: number): boolean {
    return this.shaking.some((s) => s.col === col && s.row === row);
  }
}

/**
 * Settles the ground at once: every loose rock with nothing under it drops
 * straight to rest, as if it always had. For a world as it's carved or
 * loaded, never in play. Returns the tiles that changed.
 */
export function settleRocks(t: Terrain): TilePos[] {
  const changed: TilePos[] = [];
  for (let x = 0; x < t.width; x++) {
    // Bottom up, so a column lands in order and a rock never falls through one that hasn't moved yet.
    for (let y = t.height - 2; y >= 0; y--) {
      if (!unsupported(t, x, y)) continue;
      let to = y + 1;
      while (to + 1 < t.height && !isSolid(t, x, to + 1)) to++;
      setTile(t, x, y, TILE.air);
      setTile(t, x, to, TILE.loose);
      changed.push([x, y], [x, to]);
    }
  }
  return changed;
}

/** One per tile: 1 where loose rock lies now (the world save's `rubble`). */
export function rubbleOf(t: Terrain): Uint8Array {
  const mask = new Uint8Array(t.width * t.height);
  for (let i = 0; i < mask.length; i++) if (t.tiles[i] === TILE.loose) mask[i] = 1;
  return mask;
}
