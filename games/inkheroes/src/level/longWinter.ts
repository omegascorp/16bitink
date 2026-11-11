import { HLADIR_LAND } from './hladir';
import type { MapDef } from './types';

/**
 * Chapter 3, the Long Winter (docs/inkheroes-design.md, "Chapter 3: The Long
 * Winter"), as one land that grows as it is played, as the Two Lands in
 * twoLands.ts: Hladir first, at the head of its frozen fjord. Each later
 * part is laid into the land beside the parts before (`stitch`, as
 * twoLands.ts does), cut from the top-left corner so a tile keeps its place
 * from part to part (their objects `placed` as twoLands.ts does), and src/logic/chapter.ts rides the hero on into them.
 * Hladir's fjord opens west to the sea, so the land grows south (Uppsala,
 * over the mountains) and east; the far north (part 4) can be laid as the
 * Delta was, round the land won so far.
 * Part of the full game: never imported by the game's client code
 * (content/paid.ts serves it; test/twoLands.test.ts checks).
 */

interface Place {
  readonly x: number;
  readonly y: number;
}

/** Where each land lies in the chapter. */
const AT: Readonly<Record<'hladir', Place>> = {
  hladir: { x: 0, y: 0 },
};
/** Between the lands: open water (it is never walked, and costs nothing to draw). */
const SEA = '~';
/** One seed for the whole land, so its ground looks the same in every part. */
const SEED = HLADIR_LAND.seed;

/** The lands laid on one sea `w` × `h`, the later over the earlier, then single tiles changed (`patch`). */
function stitch(lands: readonly (readonly [MapDef, Place])[], w: number, h: number, patch: readonly (Place & { ch: string })[] = []): string[] {
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => SEA));
  for (const [land, at] of lands) {
    land.rows.forEach((row, y) => [...row].forEach((ch, x) => { grid[at.y + y]![at.x + x] = ch; }));
  }
  for (const p of patch) grid[p.y]![p.x] = p.ch;
  return grid.map((r) => r.join(''));
}

/** Part 1: Hervor holds Hladir; Hrimgrimnir sits on the ice at the fjord's mouth. Won, the chapter rides on south over the mountains (the narrator tells of Uppsala). */
export const HLADIR: MapDef = {
  ...HLADIR_LAND,
  rows: stitch([[HLADIR_LAND, AT.hladir]], 32, 24),
  seed: SEED,
  won: 'hladir-won',
};

/** The chapter's parts, in order (what content/paid.ts serves). */
export const LONG_WINTER_PARTS: readonly MapDef[] = [HLADIR];
