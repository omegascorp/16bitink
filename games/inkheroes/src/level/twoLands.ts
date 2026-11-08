import { NEKHEN_LAND } from './nekhen';
import type { MapDef } from './types';

/**
 * Chapter 2, the Two Lands, as one land that grows as it is played (as the
 * Border March in borderMarch.ts): Nekhen on the Upper Nile first; parts 5
 * and 6 are stitched on here when they are built, each cut from the
 * top-left corner so a tile keeps its place from part to part, and
 * src/logic/chapter.ts rides the hero on into them. Part of the full game:
 * never imported by the game's client code (content/paid.ts serves it).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'nekhen', Place>> = {
  nekhen: { x: 0, y: 0 },
};
const WORLD = { w: 32, h: 24 } as const;
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** One seed for the whole land, so its ground looks the same in every part. */
const SEED = NEKHEN_LAND.seed;

const WORLD_ROWS: readonly string[] = (() => {
  const grid = Array.from({ length: WORLD.h }, () => Array.from({ length: WORLD.w }, () => SEA));
  for (const [land, at] of [[NEKHEN_LAND, AT.nekhen]] as const) {
    land.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[at.y + y]![at.x + x] = ch; }));
  }
  return grid.map((r) => r.join(''));
})();

/** The land cut to its first `w` columns and `h` rows. */
const cut = (w: number, h: number): string[] => WORLD_ROWS.slice(0, h).map((r) => r.slice(0, w));

/** Part 4: Neferet holds Nekhen, on the west bank. */
export const NEKHEN: MapDef = { ...NEKHEN_LAND, rows: cut(32, 24), seed: SEED };

/** The chapter's parts, in order (what content/paid.ts serves). */
export const TWO_LANDS_PARTS: readonly MapDef[] = [NEKHEN];
