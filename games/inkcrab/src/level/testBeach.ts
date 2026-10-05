import { food, makeItem, shell, type Item, type ItemKind } from '../logic/items';
import { createRng, rangeOf } from '../logic/rng';
import type { BeachSetup } from '../logic/sim';
import type { ShellKind } from '../logic/shells';
import { createTerrain, setTile, surfaceRow, TILE, type Terrain } from '../logic/terrain';

/** World px per tile. */
export const BEACH_TILE = 16;
const W = 128;
const H = 52;

/** Surface row at control columns: high dunes left, the open beach, tidepools right. */
const PROFILE: readonly (readonly [number, number])[] = [
  [0, 12], [14, 10], [28, 15], [40, 22], [70, 25], [92, 29], [104, 33], [116, 31], [127, 34],
];

function profileAt(x: number): number {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x1, y1] = PROFILE[i]!;
    const [x0, y0] = PROFILE[i - 1]!;
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (0.5 - Math.cos(t * Math.PI) / 2);
    }
  }
  return PROFILE[PROFILE.length - 1]![1];
}

function carveTerrain(seed: number): Terrain {
  const rng = createRng(seed);
  const t = createTerrain(W, H);
  const phase = rangeOf(rng, 0, Math.PI * 2);
  for (let x = 0; x < W; x++) {
    const top = Math.round(profileAt(x) + Math.sin(x * 0.31 + phase) * 0.8 + Math.sin(x * 0.11 + phase * 2) * 1.2);
    for (let y = top; y < H; y++) setTile(t, x, y, y >= H - 2 ? TILE.rock : TILE.sand);
  }
  // Tidepool rocks poking out on the right, and a few boulders underground.
  const blobs: [number, number, number][] = [[100, 33, 2.6], [112, 31, 3.2], [121, 34, 2.2], [56, 40, 3.5], [32, 30, 3], [86, 44, 4]];
  for (const [cx, cy, r] of blobs) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (Math.hypot((x - cx) * 0.8, y - cy) <= r + rangeOf(rng, -0.4, 0.4)) setTile(t, x, y, TILE.rock);
      }
    }
  }
  return t;
}

/** Shells set by hand: two lying on top to find quickly, the rest buried, deeper is better. */
const SHELL_SPOTS: readonly (readonly [ShellKind, number, number])[] = [
  ['snail', 20, 0], ['bulb', 62, 0],
  ['can', 34, 4], ['whelk', 48, 7], ['coconut', 10, 8], ['moonsnail', 78, 10], ['jar', 96, 9], ['conch', 20, 22],
];

/** The goal-less sandbox from build step 1: one beach to mess around on. */
export function buildTestBeach(seed: number): BeachSetup {
  const terrain = carveTerrain(seed);
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
    startShell: 'bottlecap',
    seed,
    surfaceFood: 22,
  };
}
