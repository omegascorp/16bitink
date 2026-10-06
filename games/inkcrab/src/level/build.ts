import { food, makeItem, shell, type Item, type ItemKind } from '../logic/items';
import { goalSize } from '../logic/progress';
import { createRng } from '../logic/rng';
import { SHELLS, type ShellKind } from '../logic/shells';
import type { BeachSetup } from '../logic/sim';
import { setTile, surfaceRow, TILE, type Terrain } from '../logic/terrain';
import { BEDROCK, carve } from './carve';
import type { LevelDef } from './types';

/** World px per tile, on every beach. */
export const TILE_PX = 16;
/** Surface wobble in rows: a little hand-drawn unevenness that never breaks a designed step. */
const WOBBLE = 0.3;
/** Deepest random buried food, in tiles below the surface. */
const FOOD_DEPTH = 12;

/** Places items centred on a tile: on the surface, or buried in the sand (made solid around it). */
function placer(t: Terrain, items: Item[]): (kind: ItemKind, col: number, depth: number) => void {
  return (kind, col, depth) => {
    const surface = surfaceRow(t, col);
    const row = surface + depth;
    const buried = depth > 0;
    if (buried) setTile(t, col, row, TILE.sand);
    const proto = makeItem(items.length + 1, kind, 0, 0, buried);
    const x = col * TILE_PX + TILE_PX / 2 - proto.w / 2;
    const y = buried ? row * TILE_PX + TILE_PX / 2 - proto.h / 2 : row * TILE_PX - proto.h;
    items.push({ ...proto, x, y });
  };
}

/** Every level starts here. */
export const START_SHELL: ShellKind = 'periwinkle';
export const START_SIZE = 1;

/** The level's goal size: the biggest its shells allow. */
export function levelGoal(def: LevelDef): number {
  return goalSize(START_SHELL, START_SIZE, def.shells.map(([k]) => k));
}

/** Turns a level definition into the simulation's starting state. Pure for a given definition. */
export function buildLevel(def: LevelDef): BeachSetup {
  const terrain = carve({ width: def.width, height: def.height, seed: def.seed, profile: def.profile, rocks: def.rocks, wobble: WOBBLE });
  const rng = createRng(def.seed ^ 0x9e3779b9);
  const items: Item[] = [];
  const add = placer(terrain, items);
  for (const [kind, col, depth] of def.shells) add(shell(kind), col, depth);
  for (const [col, depth] of def.food.clams ?? []) add(food('clam'), col, depth);
  for (let i = 0; i < def.food.buried; i++) {
    const col = 2 + Math.floor(rng() * (def.width - 4));
    const depth = 2 + Math.floor(rng() * rng() * FOOD_DEPTH);
    if (surfaceRow(terrain, col) + depth >= def.height - BEDROCK) continue;
    add(food(depth > 6 && rng() < 0.6 ? 'clam' : 'hopper'), col, depth);
  }
  for (let i = 0; i < def.food.surface; i++) add(food(rng() < 0.7 ? 'crumb' : 'hopper'), 3 + Math.floor(rng() * (def.width - 6)), 0);
  const col = def.startCol;
  // Dropped in above the highest ground under it, so it never starts stuck in a slope.
  const reach = Math.ceil(SHELLS[START_SHELL].maxSize / 3);
  let top = surfaceRow(terrain, col);
  for (let x = col - reach; x <= col + reach; x++) top = Math.min(top, surfaceRow(terrain, x));
  return {
    terrain,
    items,
    start: { x: col * TILE_PX + TILE_PX / 2, y: top * TILE_PX },
    tileSize: TILE_PX,
    startShell: START_SHELL,
    seed: def.seed,
    surfaceFood: def.food.surface,
    critters: def.critters ?? [],
    startGrowth: { size: START_SIZE, meter: 0, bank: 0 },
    goal: levelGoal(def),
  };
}
