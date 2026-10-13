/**
 * A dig site as a tile grid, one metre a tile. Ground comes in the three
 * grades of the spec (soil, stone, deep rock) over unbreakable bedrock;
 * crates sit in it as tiles of their own. A second layer says what each
 * tile holds: the ore in a rock tile, or the kind of a crate.
 *
 * Outside the grid the sides and floor are bedrock and the sky is open.
 * The grid is mutated in place: it is per-frame world state shared by the
 * simulation and the chunked ground renderer (as InkCrab's beach is).
 */
export const TILE = { air: 0, soil: 1, stone: 2, deep: 3, bedrock: 4, crate: 5 } as const;
export type Tile = (typeof TILE)[keyof typeof TILE];

/** The three grades a drill is weighed against (see drill.ts). */
export type Grade = 0 | 1 | 2;

export interface Terrain {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;
  /** Ore id in a rock tile, crate id in a crate tile, 0 for nothing. */
  readonly content: Uint8Array;
}

export type TilePos = readonly [number, number];

export function createTerrain(width: number, height: number): Terrain {
  return { width, height, tiles: new Uint8Array(width * height), content: new Uint8Array(width * height) };
}

export const inside = (t: Terrain, x: number, y: number): boolean => x >= 0 && y >= 0 && x < t.width && y < t.height;

export function tileAt(t: Terrain, x: number, y: number): Tile {
  if (inside(t, x, y)) return t.tiles[y * t.width + x] as Tile;
  return y < 0 ? TILE.air : TILE.bedrock;
}

export function contentAt(t: Terrain, x: number, y: number): number {
  return inside(t, x, y) ? t.content[y * t.width + x]! : 0;
}

export function setTile(t: Terrain, x: number, y: number, tile: Tile, content = 0): void {
  if (!inside(t, x, y)) return;
  t.tiles[y * t.width + x] = tile;
  t.content[y * t.width + x] = content;
}

export function isSolid(t: Terrain, x: number, y: number): boolean {
  return tileAt(t, x, y) !== TILE.air;
}

/** A tile's grade, or null for air, bedrock and crates (which aren't drilled by grade). */
export function gradeOf(tile: Tile): Grade | null {
  if (tile === TILE.soil) return 0;
  if (tile === TILE.stone) return 1;
  if (tile === TILE.deep) return 2;
  return null;
}

/** The first solid row in a column from the top (the surface), or the height if the column is open to the bottom. */
export function surfaceRow(t: Terrain, x: number): number {
  for (let y = 0; y < t.height; y++) if (isSolid(t, x, y)) return y;
  return t.height;
}
