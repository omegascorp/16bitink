/**
 * A dig site as a tile grid, one metre a tile. Ground comes in the three
 * grades of the spec (soil, stone, deep rock) over unbreakable bedrock.
 * Two more layers say what a rock tile holds: its ore, and anything that
 * can blow (a firedamp pocket, an old charge; see volatiles.ts), which sits
 * inside the rock and keeps the rock's grade round it.
 *
 * Outside the grid the sides and floor are bedrock and the sky is open,
 * unless the grid wraps: a world you can walk all the way round (spec,
 * "The world"), where column `width` is column 0 again and there are no
 * sides. Tile lookups fold x round the ring, so callers never have to.
 * A cap is one of Mycel's cap mushrooms: solid, soft as soil to drill, and
 * springy (mine.ts throws you high off one).
 * Loose rock is Talus's: a boulder as soft as soil to drill, which falls
 * when what holds it up is dug out (rocks.ts).
 * A plant is one of Talus's barrel plants: a pleated segment of a column
 * that stores water, solid, soft as soil, standing on the open ground.
 * Caps and plants are growths: they stand on the planet, not in it.
 * The grid is mutated in place: it is per-frame world state shared by the
 * simulation and the chunked ground renderer (as InkCrab's beach is).
 */
export const TILE = { air: 0, soil: 1, stone: 2, deep: 3, bedrock: 4, cap: 5, loose: 6, plant: 7 } as const;
export type Tile = (typeof TILE)[keyof typeof TILE];

/** The three grades a drill is weighed against (see drill.ts). */
export type Grade = 0 | 1 | 2;

export interface Terrain {
  readonly width: number;
  readonly height: number;
  /** Walk off the east edge and you come back from the west. */
  readonly wrap: boolean;
  readonly tiles: Uint8Array;
  /** Ore id in a rock tile, 0 for none. */
  readonly content: Uint8Array;
  /** Volatile id (volatiles.ts) in a rock tile, 0 for none. */
  readonly volatile: Uint8Array;
}

export type TilePos = readonly [number, number];

export function createTerrain(width: number, height: number, wrap = false): Terrain {
  const n = width * height;
  return { width, height, wrap, tiles: new Uint8Array(n), content: new Uint8Array(n), volatile: new Uint8Array(n) };
}

/** Column `x` folded into the grid on a wrapping world; unchanged otherwise. */
export function wrapX(t: Terrain, x: number): number {
  return t.wrap ? x - t.width * Math.floor(x / t.width) : x;
}

export const inside = (t: Terrain, x: number, y: number): boolean => y >= 0 && y < t.height && (t.wrap || (x >= 0 && x < t.width));

/** The array index of tile (x, y); only meaningful when it's inside. */
export const indexOf = (t: Terrain, x: number, y: number): number => y * t.width + wrapX(t, x);

/**
 * The shortest way from `from` to `to` along x, in units of `unit` per
 * tile (1 for columns, the tile size for px): on a wrapping world the
 * nearer way round, so things either side of the join are close.
 */
export function ringDelta(t: Terrain, from: number, to: number, unit = 1): number {
  const d = to - from;
  if (!t.wrap) return d;
  const span = t.width * unit;
  return d - span * Math.round(d / span);
}

/** An x in `unit`s (1 for columns, the tile size for px) folded into the grid on a wrapping world. */
export function foldX(t: Terrain, x: number, unit = 1): number {
  if (!t.wrap) return x;
  const span = t.width * unit;
  return x - span * Math.floor(x / span);
}

export function tileAt(t: Terrain, x: number, y: number): Tile {
  if (inside(t, x, y)) return t.tiles[indexOf(t, x, y)] as Tile;
  return y < 0 ? TILE.air : TILE.bedrock;
}

export function contentAt(t: Terrain, x: number, y: number): number {
  return inside(t, x, y) ? t.content[indexOf(t, x, y)]! : 0;
}

export function volatileAt(t: Terrain, x: number, y: number): number {
  return inside(t, x, y) ? t.volatile[indexOf(t, x, y)]! : 0;
}

/** Sets a tile; whatever it held (ore, a volatile) goes unless given again. */
export function setTile(t: Terrain, x: number, y: number, tile: Tile, content = 0, volatile = 0): void {
  if (!inside(t, x, y)) return;
  const i = indexOf(t, x, y);
  t.tiles[i] = tile;
  t.content[i] = content;
  t.volatile[i] = volatile;
}

/** Puts ore into a rock tile, leaving the rock as it is. */
export function setContent(t: Terrain, x: number, y: number, content: number): void {
  if (inside(t, x, y)) t.content[indexOf(t, x, y)] = content;
}

/** Puts something volatile into a rock tile, leaving the rock and its ore as they are. */
export function setVolatile(t: Terrain, x: number, y: number, volatile: number): void {
  if (inside(t, x, y)) t.volatile[indexOf(t, x, y)] = volatile;
}

export function isSolid(t: Terrain, x: number, y: number): boolean {
  return tileAt(t, x, y) !== TILE.air;
}

/** Whether a tile grows on the ground rather than being part of it: a cap mushroom or a barrel plant. */
export const isGrowth = (tile: Tile): boolean => tile === TILE.cap || tile === TILE.plant;

/** A tile's grade, or null for air and bedrock. */
export function gradeOf(tile: Tile): Grade | null {
  if (tile === TILE.soil || tile === TILE.cap || tile === TILE.loose || tile === TILE.plant) return 0;
  if (tile === TILE.stone) return 1;
  if (tile === TILE.deep) return 2;
  return null;
}

/** The first solid row in a column from the top (the surface), or the height if the column is open to the bottom. */
export function surfaceRow(t: Terrain, x: number): number {
  for (let y = 0; y < t.height; y++) if (isSolid(t, x, y)) return y;
  return t.height;
}
