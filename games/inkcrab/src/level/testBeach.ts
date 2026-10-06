import { food, makeItem, shell, type Item, type ItemKind } from '../logic/items';
import { createRng } from '../logic/rng';
import type { BeachSetup } from '../logic/sim';
import type { ShellKind } from '../logic/shells';
import { setTile, surfaceRow, TILE } from '../logic/terrain';
import { carve } from './carve';
import type { ProfilePoint } from './types';

/** World px per tile. */
export const BEACH_TILE = 16;
const W = 128;
const H = 52;

/** Surface row at control columns: high dunes left, the open beach, tidepools right. */
const PROFILE: readonly ProfilePoint[] = [
  [0, 12], [14, 10], [28, 15], [40, 22], [70, 25], [92, 29], [104, 33], [116, 31], [127, 34],
];
/** Tidepool rocks poking out on the right, and a few boulders underground. */
const ROCKS: readonly (readonly [number, number, number])[] = [[100, 33, 2.6], [112, 31, 3.2], [121, 34, 2.2], [56, 40, 3.5], [32, 30, 3], [86, 44, 4]];

/** Shells set by hand: two lying on top to find quickly, the rest buried, deeper is better. */
const SHELL_SPOTS: readonly (readonly [ShellKind, number, number])[] = [
  ['snail', 20, 0], ['bulb', 62, 0],
  ['can', 34, 4], ['whelk', 48, 7], ['coconut', 10, 8], ['moonsnail', 78, 10], ['jar', 96, 9], ['conch', 20, 22],
];

/** The goal-less sandbox from build step 1: one beach to mess around on. */
export function buildTestBeach(seed: number): BeachSetup {
  const terrain = carve({ width: W, height: H, seed, profile: PROFILE, rocks: ROCKS, wobble: 2 });
  const rng = createRng(seed ^ 0x9e3779b9);
  const T = BEACH_TILE;
  const items: Item[] = [];
  const add = (kind: ItemKind, tx: number, row: number, buried: boolean): void => {
    const proto = makeItem(items.length + 1, kind, 0, 0, buried);
    const x = tx * T + T / 2 - proto.w / 2;
    const y = buried ? row * T + T / 2 - proto.h / 2 : row * T - proto.h;
    items.push({ ...proto, x, y });
  };
  for (const [kind, tx, depth] of SHELL_SPOTS) {
    const row = surfaceRow(terrain, tx) + depth;
    if (depth > 0) setTile(terrain, tx, row, TILE.sand);
    add(shell(kind), tx, row, depth > 0);
  }
  // Buried food gets richer with depth.
  for (let i = 0; i < 46; i++) {
    const tx = 2 + Math.floor(rng() * (W - 4));
    const depth = 2 + Math.floor(rng() * rng() * 22);
    const row = surfaceRow(terrain, tx) + depth;
    if (row >= H - 2) continue;
    setTile(terrain, tx, row, TILE.sand);
    add(food(depth > 9 && rng() < 0.7 ? 'clam' : 'hopper'), tx, row, true);
  }
  for (let i = 0; i < 18; i++) {
    const tx = 3 + Math.floor(rng() * (W - 6));
    add(food(rng() < 0.7 ? 'crumb' : 'hopper'), tx, surfaceRow(terrain, tx), false);
  }
  const startCol = 40;
  return {
    terrain,
    items,
    start: { x: startCol * T + T / 2, y: surfaceRow(terrain, startCol) * T },
    tileSize: T,
    startShell: 'periwinkle',
    seed,
    surfaceFood: 22,
    critters: [{ count: 4, sizes: [1, 2] }, { count: 3, sizes: [3, 5] }],
  };
}
