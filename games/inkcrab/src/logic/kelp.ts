import type { Box } from './body';
import { surfaceRow, type Terrain } from './terrain';

/**
 * Kelp wrack (Fog & Kelp, beach 6): heaps of bull kelp washed up on the
 * sand. A crab down among it on the ground can't be seen by anything, nor
 * smelt through its reek; beach hoppers live in it, so food turns up there.
 * It lies where it fell: dig under it and it settles into the hole.
 */
export type WrackSpec = readonly [col: number, width: number];

export const KELP = {
  /** Share of the surface food the beach restocks that turns up in the wrack. */
  food: 0.5,
  /** How far (tiles) above the sand under it a crab's feet can be and still be among the kelp. */
  depth: 0.6,
} as const;

/** The wrack heap a column lies under, or null. */
export function wrackAt(wrack: readonly WrackSpec[], col: number): WrackSpec | null {
  return wrack.find(([c, w]) => col >= c && col < c + w) ?? null;
}

/** Whether a body is down among the kelp: its middle over a heap, its feet on (or in) the sand there. */
export function underKelp(t: Terrain, wrack: readonly WrackSpec[], b: Box, tile: number): boolean {
  if (!wrack.length) return false;
  const col = Math.floor((b.x + b.w / 2) / tile);
  if (!wrackAt(wrack, col)) return false;
  return b.y + b.h >= (surfaceRow(t, col) - KELP.depth) * tile;
}

/** A column somewhere in the wrack, for food turning up there; `roll` in 0..1. */
export function wrackColumn(wrack: readonly WrackSpec[], roll: number): number | null {
  const total = wrack.reduce((n, [, w]) => n + w, 0);
  if (total === 0) return null;
  let k = Math.floor(roll * total);
  for (const [c, w] of wrack) {
    if (k < w) return c + k;
    k -= w;
  }
  return null;
}
