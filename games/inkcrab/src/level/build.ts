import { boxHitsSolid } from '../logic/body';
import { KELP, wrackColumn } from '../logic/kelp';
import { buriedFood, findItem, food, makeItem, shell, type Item, type ItemKind } from '../logic/items';
import type { FindId } from '../logic/finds';
import { createRng } from '../logic/rng';
import { shellOf, type Shell } from '../logic/shells';
import type { BeachSetup } from '../logic/sim';
import { groundRow, setTile, tileAt, surfaceRow, TILE, type Terrain } from '../logic/terrain';
import type { CritterGroup } from '../logic/sim';
import { BEDROCK, carve } from './carve';
import { growRoots } from './mangrove';
import { perchRow, type Roots } from '../logic/roots';
import { VENT, type Vent } from '../logic/vents';
import { layDeck } from '../logic/decks';
import type { LevelDef } from './types';

/** World px per tile, on every beach. */
export const TILE_PX = 16;
/** Surface wobble in rows: a little hand-drawn unevenness that never breaks a designed step. */
const WOBBLE = 0.3;
/** Deepest random buried food, in tiles below the surface. */
const FOOD_DEPTH = 12;

/** Most buried food found together in one pocket. */
const POCKET = 3;

/**
 * Places items centred on a tile: on the surface (up on a boat or stilt
 * house where there's one), buried in the sand (made solid around it,
 * counting down from the sand itself, under any deck), or (depth -1) up on
 * the highest root in the column. Returns false if that tile is taken.
 */
function placer(t: Terrain, items: Item[], roots: Roots | null): (kind: ItemKind, col: number, depth: number) => boolean {
  const taken = new Set<string>();
  return (kind, col, depth) => {
    const perch = depth < 0 ? perchRow(roots, col) : null;
    const buried = depth > 0;
    const row = perch ?? (buried ? groundRow(t, col) + depth : surfaceRow(t, col));
    const key = `${col},${row}`;
    if (buried && taken.has(key)) return false;
    // Nothing is buried in rock (granite under thin sand, pool walls) or in ice.
    if (buried && tileAt(t, col, row) === TILE.rock && row < t.height - BEDROCK) return false;
    if (buried && tileAt(t, col, row) === TILE.ice) return false;
    if (buried) taken.add(key);
    // Packed sand around it, unless it's in dune sand or mud (which stay as they are).
    if (buried && tileAt(t, col, row) !== TILE.loose && tileAt(t, col, row) !== TILE.mud) setTile(t, col, row, TILE.sand);
    const proto = makeItem(items.length + 1, kind, 0, 0, buried);
    const x = col * TILE_PX + TILE_PX / 2 - proto.w / 2;
    const y = buried ? row * TILE_PX + TILE_PX / 2 - proto.h / 2 : row * TILE_PX - proto.h;
    items.push({ ...proto, ...(buried ? { x, y } : clear(t, { ...proto, x, y })) });
    return true;
  };
}

/** Px a thing on the surface may be nudged aside, or up, to sit clear of a step beside it. */
const NUDGE = [0, 4, -4, 8, -8, 12, -12] as const;

/**
 * Where to put something lying on the surface so it isn't sunk into the
 * sand: where it is, or nudged aside off a step, or (failing that) lifted
 * onto the step.
 */
function clear(t: Terrain, box: Item): { x: number; y: number } {
  for (let up = 0; up <= TILE_PX * 2; up += TILE_PX / 4) {
    for (const dx of NUDGE) {
      const at = { x: box.x + dx, y: box.y - up };
      if (!boxHitsSolid(t, { ...box, ...at }, TILE_PX)) return at;
    }
  }
  return { x: box.x, y: box.y };
}

/**
 * Buries `count` things to eat, in pockets of one to three side by side,
 * mostly shallow, what lives there depending on depth (see buriedFood).
 */
function buryFood(def: LevelDef, terrain: Terrain, rng: () => number, add: ReturnType<typeof placer>): void {
  let placed = 0;
  for (let tries = 0; placed < def.food.buried && tries < def.food.buried * 8; tries++) {
    const col = 2 + Math.floor(rng() * (def.width - 4));
    // Over granite there's only so much sand: the same spread, squeezed into it.
    const reach = def.granite ? Math.max(3, def.granite - 1) : FOOD_DEPTH;
    const depth = 2 + Math.floor(rng() * rng() * (def.granite ? reach - 1 : FOOD_DEPTH));
    const pocket = Math.min(def.food.buried - placed, 1 + Math.floor(rng() * POCKET));
    for (let k = 0; k < pocket; k++) {
      const c = Math.max(2, Math.min(def.width - 3, col + k - Math.floor(pocket / 2)));
      const d = depth + (k % 2);
      if (groundRow(terrain, c) + d >= def.height - BEDROCK) continue;
      // What lives there goes by how far down the sand it is, not in tiles: thin sand still has clams at the bottom.
      const like = 2 + Math.round(((d - 2) * (FOOD_DEPTH - 2)) / (reach - 2));
      if (add(food(buriedFood(like, rng())), c, d)) placed++;
    }
  }
}

/**
 * A mission's finds, each at its spot or, where that's rock or
 * taken, as near to it as will do: shallower, then a column either side.
 */
function buryFinds(def: LevelDef, find: FindId, spots: readonly (readonly [number, number])[], add: ReturnType<typeof placer>): void {
  for (const [col, depth] of spots) {
    const tries = [0, 1, -1, 2, -2, 3, -3].flatMap((dx) => Array.from({ length: depth }, (_, d) => [col + dx, depth - d] as const));
    tries.some(([c, d]) => c >= 2 && c < def.width - 2 && add(findItem(find), c, d));
  }
}

/** Columns past the start that a level's starter food is spread over. */
export const START_PATCH = 14;

/**
 * The level's starter food (`food.start`), one after another across the
 * columns just past the start: crumbs and hoppers on the surface, worms and
 * hoppers a dig or two down. Not stocked again: it's a first meal.
 */
function starterFood(def: LevelDef, rng: () => number, add: ReturnType<typeof placer>): void {
  const n = def.food.start ?? 0;
  for (let placed = 0, tries = 0; placed < n && tries < n * 8; tries++) {
    const col = Math.min(def.width - 3, def.startCol + 1 + Math.floor(rng() * START_PATCH));
    const buried = placed % 2 === 1;
    const kind = buried ? (rng() < 0.6 ? 'worm' : 'hopper') : rng() < 0.6 ? 'crumb' : 'hopper';
    if (add(food(kind), col, buried ? 1 + Math.floor(rng() * 2) : 0)) placed++;
  }
}

import { levelGoal, levelShells, START_SHELL, START_SIZE } from './goal';
import { findSpots, markedSpecs, missionOf, recruitSpecs } from './missions';

export { levelGoal, levelShells, START_SHELL, START_SIZE };

/** Beach columns per small slater: wider beaches keep more of them about. */
const COLS_PER_SMALL_FRY = 16;

/**
 * Easy prey in every level, on top of the authored creatures: timid slaters
 * (the level's own fry: darkling beetles in the dunes) from size 1 up to half the goal, so there's always something small to eat
 * on the way up. Kept no bigger than 1 while the goal is tiny, so a size-1
 * crab learning the ropes never bumps into one that can catch it.
 */
export function smallFry(def: LevelDef): CritterGroup {
  return { count: Math.round(def.width / COLS_PER_SMALL_FRY), sizes: [1, Math.max(1, Math.floor(levelGoal(def) / 2))], species: def.fry ?? 'slater' };
}

/** Turns a level definition into the simulation's starting state. Pure for a given definition. */
export function buildLevel(def: LevelDef): BeachSetup {
  const terrain = carve({
    width: def.width, height: def.height, seed: def.seed, profile: def.profile, rocks: def.rocks, wobble: WOBBLE,
    loose: def.loose, pits: def.pits, granite: def.granite, pools: def.pools, dens: def.dens, mud: def.mud,
    columns: def.columns, vents: def.vents?.map(([col]) => col), ice: def.ice,
  });
  // Each vent's shaft runs down from its rim to the rock floor the carving left under it.
  const vents: Vent[] = (def.vents ?? []).map(([col, height, period, offset]) => {
    const floor = surfaceRow(terrain, col);
    return { col, height, period, offset, top: floor - VENT.shaft, floor };
  });
  // Boats and stilt houses go up over the finished sand, before anything is laid on it.
  const decks = (def.decks ?? []).map((spec) => layDeck(terrain, spec));
  const roots = def.trees?.length ? growRoots(terrain, def.trees, def.seed) : null;
  const rng = createRng(def.seed ^ 0x9e3779b9);
  const items: Item[] = [];
  const add = placer(terrain, items, roots);
  const mission = missionOf(def);
  // A shell chain's line can't climb roots: its shells lie on the mud, where the line can get at the one you leave.
  for (const [kind, size, col, depth] of def.shells) add(shell(kind, size), col, mission.chain && depth < 0 ? 0 : depth);
  buryFinds(def, mission.find, findSpots(def, mission), add);
  for (const [col, depth] of def.food.clams ?? []) add(food('clam'), col, depth);
  buryFood(def, terrain, rng, add);
  for (let i = 0; i < def.food.surface; i++) {
    // Beach hoppers live in the kelp wrack: some of the food lies there.
    const kelp = def.kelp?.length && rng() < KELP.food ? wrackColumn(def.kelp, rng()) : null;
    add(food(kelp !== null || rng() >= 0.7 ? 'hopper' : 'crumb'), kelp ?? 3 + Math.floor(rng() * (def.width - 6)), 0);
  }
  starterFood(def, rng, add);
  const col = def.startCol;
  // Dropped in above the highest ground under it, so it never starts stuck in a slope.
  const reach = Math.ceil(START_SHELL.size / 3);
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
    shallowFood: def.food.shallow,
    critters: [smallFry(def), ...(def.critters ?? [])],
    pits: def.pits,
    birds: def.birds,
    tide: def.tide,
    pools: def.pools,
    dens: def.dens,
    tideBrings: def.tideBrings,
    roots: roots ?? undefined,
    vents,
    fog: def.fog,
    wrack: def.kelp,
    rivals: def.rivals,
    rain: def.rain,
    decks,
    wind: def.wind,
    moon: def.moon,
    glow: def.glow,
    startGrowth: { size: START_SIZE, meter: 0 },
    goal: levelGoal(def),
    mission,
    lives: mission.lives,
    recruits: recruitSpecs(def, mission),
    marked: markedSpecs(def, mission),
    ladder: shellLadder(def),
  };
}

/** The shell a level has at each size, starting shell included, smallest first: the climb the beach celebration retells. */
export function shellLadder(def: LevelDef): Shell[] {
  const bySize = new Map<number, Shell>();
  for (const s of [START_SHELL, ...levelShells(def)]) if (!bySize.has(s.size)) bySize.set(s.size, s);
  return [...bySize.values()].sort((a, b) => a.size - b.size);
}
