import { settleDunes } from '../logic/dunes';
import { createRng, rangeOf } from '../logic/rng';
import { createTerrain, setTile, surfaceRow, TILE, type Terrain } from '../logic/terrain';
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
    for (let y = top; y < H; y++) setTile(t, x, y, y >= H - BEDROCK ? TILE.rock : y < top + (spec.loose ?? 0) ? TILE.loose : TILE.sand);
  }
  for (const [cx, cy, r] of spec.rocks ?? []) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (Math.hypot((x - cx) * 0.8, y - cy) <= r + rangeOf(rng, -0.4, 0.4)) setTile(t, x, y, TILE.rock);
      }
    }
  }
  for (const [col, r] of spec.pits ?? []) pit(t, col, r);
  // Dunes pour until they rest, so a level starts still.
  if (spec.loose || spec.pits?.length) settleDunes(t);
  return t;
}

/** A funnel `r` tiles out and down from its bottom at `col`, sloped at the angle dune sand rests at. */
function pit(t: Terrain, col: number, r: number): void {
  const rim = surfaceRow(t, col);
  for (let x = col - r; x <= col + r; x++) {
    const floor = rim + r - Math.abs(x - col);
    for (let y = surfaceRow(t, x); y < floor; y++) setTile(t, x, y, TILE.air);
  }
}
