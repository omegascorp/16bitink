import { settleDunes } from '../logic/dunes';
import { createRng, rangeOf } from '../logic/rng';
import { createTerrain, setTile, surfaceRow, tileAt, TILE, type Terrain } from '../logic/terrain';
import { VENT } from '../logic/vents';
import type { ProfilePoint } from './types';

/** Rows of unbreakable rock at the bottom of every beach. */
export const BEDROCK = 2;

/** The surface row at column `x`, eased (cosine) between the profile's control points. */
export function profileAt(profile: readonly ProfilePoint[], x: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [x1, y1] = profile[i]!;
    const [x0, y0] = profile[i - 1]!;
    if (x <= x1) {
      const t = x1 === x0 ? 1 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (0.5 - Math.cos(t * Math.PI) / 2);
    }
  }
  return profile[profile.length - 1]![1];
}

export interface CarveSpec {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly profile: readonly ProfilePoint[];
  readonly rocks?: readonly (readonly [number, number, number])[];
  /** Rows of gentle waviness on the surface (0 keeps the profile exact). */
  readonly wobble?: number;
  /** Rows of loose dune sand on top of the packed sand (default none). */
  readonly loose?: number;
  /** Antlion pits: column of the bottom, and how many tiles out (and down) the funnel goes. */
  readonly pits?: readonly (readonly [number, number])[];
  /** Rows of sand over granite (default: sand down to bedrock). */
  readonly granite?: number;
  /** Rock pools: first column, width and depth in tiles of a basin cut into the surface, walled and floored with rock. */
  readonly pools?: readonly (readonly [number, number, number])[];
  /** Crevices in the rock (octopus dens): column and row of an open tile. */
  readonly dens?: readonly (readonly [number, number])[];
  /** Mud on top of the sand: first and last column, and rows deep. */
  readonly mud?: readonly (readonly [number, number, number])[];
  /** Basalt columns: first column, width, and height over the sand, in tiles. */
  readonly columns?: readonly (readonly [number, number, number])[];
  /** Steam vents: the column of each shaft (see vent). */
  readonly vents?: readonly number[];
  /** Frozen pools: first column, width, and rows of ice (see frozenPool). */
  readonly ice?: readonly (readonly [number, number, number])[];
}

/** Sand down to bedrock under the profile, with rock boulders. */
export function carve(spec: CarveSpec): Terrain {
  const rng = createRng(spec.seed);
  const { width: W, height: H } = spec;
  const t = createTerrain(W, H);
  const phase = rangeOf(rng, 0, Math.PI * 2);
  const wobble = spec.wobble ?? 0;
  for (let x = 0; x < W; x++) {
    const wave = wobble * (Math.sin(x * 0.31 + phase) * 0.4 + Math.sin(x * 0.11 + phase * 2) * 0.6);
    const top = Math.round(profileAt(spec.profile, x) + wave);
    const rockFrom = spec.granite === undefined ? H - BEDROCK : Math.min(H - BEDROCK, top + spec.granite);
    for (let y = top; y < H; y++) setTile(t, x, y, y >= rockFrom ? TILE.rock : y < top + (spec.loose ?? 0) ? TILE.loose : TILE.sand);
  }
  for (const [cx, cy, r] of spec.rocks ?? []) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (Math.hypot((x - cx) * 0.8, y - cy) <= r + rangeOf(rng, -0.4, 0.4)) setTile(t, x, y, TILE.rock);
      }
    }
  }
  for (const [x0, w, h] of spec.columns ?? []) column(t, x0, w, h);
  for (const col of spec.vents ?? []) vent(t, col);
  for (const [col, r] of spec.pits ?? []) pit(t, col, r);
  for (const [x0, w, depth] of spec.pools ?? []) pool(t, x0, w, depth);
  for (const [x, y] of spec.dens ?? []) setTile(t, x, y, TILE.air);
  for (const [x0, w, rows] of spec.ice ?? []) frozenPool(t, x0, w, rows);
  for (const [from, to, rows] of spec.mud ?? []) {
    for (let x = Math.max(0, from); x <= Math.min(W - 1, to); x++) {
      const top = surfaceRow(t, x);
      // Thinning out to a single row at either end, rather than stopping at a wall.
      const deep = Math.min(rows, 1 + Math.floor((x - from) / 2), 1 + Math.floor((to - x) / 2));
      for (let y = top; y < Math.min(top + deep, H - BEDROCK); y++) if (tileAt(t, x, y) === TILE.sand) setTile(t, x, y, TILE.mud);
    }
  }
  // Dunes pour until they rest, so a level starts still.
  if (spec.loose || spec.pits?.length) settleDunes(t);
  return t;
}

/**
 * A rock pool: a basin `w` wide and `depth` deep inside a wall and floor of
 * rock a tile thick, so water stays in it when the tide goes out. Its rim
 * is the lower of the two sides (on a slope, the downhill one), so neither
 * wall stands up out of the beach; the uphill side drops into it.
 */
function pool(t: Terrain, x0: number, w: number, depth: number): void {
  const rim = Math.max(surfaceRow(t, x0 - 1), surfaceRow(t, x0 + w));
  for (let x = x0 - 1; x <= x0 + w; x++) {
    const inside = x >= x0 && x < x0 + w;
    // Walls from their own surface down (no rock standing above the beach), the floor under the basin.
    for (let y = inside ? rim + depth : Math.max(rim, surfaceRow(t, x)); y <= rim + depth; y++) setTile(t, x, y, TILE.rock);
    if (inside) for (let y = 0; y < rim + depth; y++) setTile(t, x, y, TILE.air);
  }
}

/**
 * A frozen pool: a flat sheet of ice `rows` thick, `w` wide, set at the
 * lowest ground across it, with the sand above cut away, so its ends are
 * steps of sand down onto it (or, on a slope, one step).
 */
function frozenPool(t: Terrain, x0: number, w: number, rows: number): void {
  let floor = 0;
  for (let x = x0; x < x0 + w; x++) floor = Math.max(floor, surfaceRow(t, x));
  for (let x = x0; x < x0 + w; x++) {
    for (let y = 0; y < floor; y++) setTile(t, x, y, TILE.air);
    for (let y = floor; y < Math.min(floor + rows, t.height - BEDROCK); y++) setTile(t, x, y, TILE.ice);
  }
}

/** A basalt column: rock `h` tiles up from the sand, `w` wide, its foot sunk a couple of rows into the beach. */
function column(t: Terrain, x0: number, w: number, h: number): void {
  for (let x = x0; x < x0 + w; x++) {
    const ground = surfaceRow(t, x);
    for (let y = ground - h; y < ground + 2; y++) setTile(t, x, y, TILE.rock);
  }
}

/**
 * A steam vent: a shaft a tile wide and VENT.shaft deep, walled and
 * floored with rock, opening at the surface of column `col`.
 */
function vent(t: Terrain, col: number): void {
  const rim = surfaceRow(t, col);
  for (let x = col - 1; x <= col + 1; x++) for (let y = rim; y <= rim + VENT.shaft; y++) setTile(t, x, y, TILE.rock);
  for (let y = rim; y < rim + VENT.shaft; y++) setTile(t, col, y, TILE.air);
}

/** A funnel `r` tiles out and down from its bottom at `col`, sloped at the angle dune sand rests at. */
function pit(t: Terrain, col: number, r: number): void {
  const rim = surfaceRow(t, col);
  for (let x = col - r; x <= col + r; x++) {
    const floor = rim + r - Math.abs(x - col);
    for (let y = surfaceRow(t, x); y < floor; y++) setTile(t, x, y, TILE.air);
  }
}
