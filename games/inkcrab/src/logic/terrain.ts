/**
 * The beach as a tile grid (Terraria-style). Sand digs, placed sand digs
 * (and the tide will wash it away), dune sand digs and pours (see
 * dunes.ts), mud digs easily but is slow going on top, rock never digs.
 * Wood is the floor of a boat or stilt house over the sand (see decks.ts):
 * solid to stand on, never dug. Ice (a frozen pool, Frost Shingle) is
 * solid and never dug, and slippery underfoot (see sim.ts). Mangrove roots aren't tiles (see roots.ts). Outside the grid the
 * sides and floor are solid rock and the sky is open.
 *
 * The grid is mutated in place: it is per-frame world state shared by the
 * simulation and the chunked sand renderer.
 */
export const TILE = { air: 0, sand: 1, placed: 2, rock: 3, loose: 4, mud: 5, wood: 6, ice: 7 } as const;
export type Tile = (typeof TILE)[keyof typeof TILE];

export interface Terrain {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;
}

export function createTerrain(width: number, height: number): Terrain {
  return { width, height, tiles: new Uint8Array(width * height) };
}

const inside = (t: Terrain, x: number, y: number): boolean => x >= 0 && y >= 0 && x < t.width && y < t.height;

export function tileAt(t: Terrain, x: number, y: number): Tile {
  if (inside(t, x, y)) return t.tiles[y * t.width + x] as Tile;
  return y < 0 ? TILE.air : TILE.rock;
}

export function isSolid(t: Terrain, x: number, y: number): boolean {
  return tileAt(t, x, y) !== TILE.air;
}

export function isDiggable(t: Terrain, x: number, y: number): boolean {
  const tile = tileAt(t, x, y);
  return inside(t, x, y) && (tile === TILE.sand || tile === TILE.placed || tile === TILE.loose || tile === TILE.mud);
}

export function setTile(t: Terrain, x: number, y: number, tile: Tile): boolean {
  if (!inside(t, x, y)) return false;
  t.tiles[y * t.width + x] = tile;
  return true;
}

export function dig(t: Terrain, x: number, y: number): boolean {
  return isDiggable(t, x, y) && setTile(t, x, y, TILE.air);
}

export function place(t: Terrain, x: number, y: number): boolean {
  return inside(t, x, y) && tileAt(t, x, y) === TILE.air && setTile(t, x, y, TILE.placed);
}

/** First solid row from the top of column `x` (the height when it's open to the floor). */
export function surfaceRow(t: Terrain, x: number): number {
  for (let y = 0; y < t.height; y++) if (isSolid(t, x, y)) return y;
  return t.height;
}

/** First solid row of column `x` that isn't wood: the sand itself, under any boat or stilt house over it. */
export function groundRow(t: Terrain, x: number): number {
  for (let y = 0; y < t.height; y++) if (isSolid(t, x, y) && tileAt(t, x, y) !== TILE.wood) return y;
  return t.height;
}
