/**
 * The adventure map's ground: square tiles, each a terrain and maybe a cover
 * (trees, mountains, rocks block; a road speeds travel). Maps are written as
 * rows of characters, one per tile (see TILE_CHARS).
 */
export type Terrain = 'grass' | 'dirt' | 'rough' | 'sand' | 'snow' | 'swamp' | 'water' | 'ice';
export type Cover = 'none' | 'tree' | 'pine' | 'mountain' | 'rock' | 'road';

export interface Grid {
  readonly w: number;
  readonly h: number;
  readonly terrain: readonly Terrain[];
  readonly cover: readonly Cover[];
}

/** Map characters: ground letters, and covers that sit on a ground of their own ('b' is a bridge: road over water). */
export const TILE_CHARS: Readonly<Record<string, readonly [Terrain, Cover]>> = {
  g: ['grass', 'none'], d: ['dirt', 'none'], r: ['rough', 'none'], s: ['sand', 'none'], n: ['snow', 'none'], w: ['swamp', 'none'], '~': ['water', 'none'],
  b: ['water', 'road'], T: ['grass', 'tree'], P: ['grass', 'pine'], M: ['rough', 'mountain'], R: ['grass', 'rock'], '=': ['dirt', 'road'], '#': ['grass', 'road'],
  // The desert's dunes and boulders (chapter 2): mountain and rock cover on sand.
  D: ['sand', 'mountain'], k: ['sand', 'rock'],
  // The north (chapter 3): pine forest, fells and boulders on snow, and a frozen fjord's ice ('i'), walked slowly.
  p: ['snow', 'pine'], N: ['snow', 'mountain'], x: ['snow', 'rock'], i: ['ice', 'none'],
};

export function parseGrid(rows: readonly string[]): Grid {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const terrain: Terrain[] = [];
  const cover: Cover[] = [];
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`map row ${y} is ${row.length} wide, not ${w}`);
    for (const ch of row) {
      const t = TILE_CHARS[ch];
      if (!t) throw new Error(`unknown map character "${ch}" in row ${y}`);
      terrain.push(t[0]);
      cover.push(t[1]);
    }
  });
  return { w, h, terrain, cover };
}

export const inGrid = (g: Grid, x: number, y: number): boolean => x >= 0 && y >= 0 && x < g.w && y < g.h;
export const tileIndex = (g: Grid, x: number, y: number): number => x + y * g.w;

/** Movement points to leave a tile of each ground (H3). */
/** Ice is slow for everyone, the Norse too (their way over snow is no help on it). */
export const TERRAIN_COST: Readonly<Record<Terrain, number>> = { grass: 100, dirt: 100, rough: 125, sand: 150, snow: 150, swamp: 175, water: Infinity, ice: 175 };
export const ROAD_COST = 50;
/** Movement points to a tile of plain ground: what a player counts, as points mean nothing on screen. */
export const TILE_MP = 100;
/** What a Stables adds to a hero's day. */
export const STABLES_MP = 400;
/** `mp` movement points as tiles of plain ground. */
export const tilesOf = (mp: number): number => Math.floor(mp / TILE_MP);

const BLOCKING: readonly Cover[] = ['tree', 'pine', 'mountain', 'rock'];

/** Whether the ground itself can be walked on (objects aside). */
export function passable(g: Grid, x: number, y: number): boolean {
  if (!inGrid(g, x, y)) return false;
  const i = tileIndex(g, x, y);
  // Water is crossed only by a bridge (a road over it).
  return (g.terrain[i] !== 'water' || g.cover[i] === 'road') && !BLOCKING.includes(g.cover[i]!);
}
