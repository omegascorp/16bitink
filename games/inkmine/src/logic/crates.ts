import { inside, TILE, tileAt, type Terrain, type TilePos } from './terrain';

/**
 * Crates in the rock (the heart of Pocket Mine): they fall when the block
 * under them is dug out, and a hit or a blast sets them off. Blasts break
 * soil and stone without spending energy and set off other crates, so a few
 * well-placed hits clear half a cave. Crate ids live in the terrain's
 * content layer; never renumber one.
 */
export const CRATES = {
  bomb: { id: 1, key: 'bomb', name: 'bomb crate' },
  dynamite: { id: 2, key: 'dynamite', name: 'dynamite crate' },
} as const;

export type CrateKey = keyof typeof CRATES;

export const CRATE = {
  /** Seconds from a hit to the blast: long enough to step clear. */
  fuse: 1.2,
  /** A crate set off by another's blast goes almost at once, so chains ripple. */
  chainFuse: 0.18,
  /** Seconds a falling crate takes to drop one tile. */
  fallStep: 0.09,
  /** Dynamite breaks this many tiles each way along its row. */
  dynamiteReach: 4,
} as const;

export function crateKeyOf(id: number): CrateKey | null {
  if (id === CRATES.bomb.id) return 'bomb';
  if (id === CRATES.dynamite.id) return 'dynamite';
  return null;
}

/** The tiles a crate's blast covers (in the grid), whatever is in them. */
export function blastArea(t: Terrain, kind: CrateKey, x: number, y: number): TilePos[] {
  const out: TilePos[] = [];
  if (kind === 'bomb') {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([x + dx, y + dy]);
  } else {
    for (let dx = -CRATE.dynamiteReach; dx <= CRATE.dynamiteReach; dx++) out.push([x + dx, y]);
  }
  return out.filter(([bx, by]) => inside(t, bx, by));
}

/** Whether a blast breaks this tile: soil and stone, never deep rock or bedrock. */
export function blastBreaks(t: Terrain, x: number, y: number): boolean {
  const tile = tileAt(t, x, y);
  return tile === TILE.soil || tile === TILE.stone;
}
