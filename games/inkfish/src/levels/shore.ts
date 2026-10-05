import { createRng, rangeOf } from '../logic/rng';
import { hashUnit } from '../logic/water';
import type { ZoneId } from './types';

/**
 * Land on the horizon above sunlit levels: rocks, lighthouses, palm islands.
 * Pure scenery, planned per level so each one has its own skyline.
 */
export type ShoreKind = 'rocks' | 'lighthouse' | 'palms' | 'dunes' | 'headland' | 'volcano';

export const ZONE_SHORE: Readonly<Partial<Record<ZoneId, readonly ShoreKind[]>>> = {
  tidepool: ['rocks', 'lighthouse', 'headland'],
  seagrass: ['dunes', 'rocks', 'lighthouse'],
  kelp: ['headland', 'rocks', 'lighthouse'],
  reef: ['palms', 'dunes', 'palms'],
  wreck: ['lighthouse', 'rocks', 'volcano'],
  dropoff: ['volcano', 'palms'],
};

export interface ShorePiece {
  readonly kind: ShoreKind;
  /** Position along the skyline, in parallax space (see SHORE_PARALLAX); it repeats every world width. */
  readonly x: number;
  readonly scale: number;
  /** Further away: smaller and paler. */
  readonly far: boolean;
}

/** Land scrolls at this fraction of the camera's speed, so it feels far off. */
export const SHORE_PARALLAX = 0.6;
/** Minimum gap between pieces along the skyline, px. */
export const SHORE_GAP = 420;

/** The skyline for a level; empty where there's no sky. `width` is the world width. */
export function planShore(levelId: string, zone: ZoneId, width: number): ShorePiece[] {
  const kinds = ZONE_SHORE[zone];
  if (!kinds?.length) return [];
  const rng = createRng(Math.floor(hashUnit(levelId, 33) * 1e6) + 1);
  // The skyline repeats every `width` px of parallax space as you swim round the ring (see Ring.addParallax).
  const span = width;
  const count = 3 + Math.floor(rng() * 2);
  const slice = span / count;
  return Array.from({ length: count }, (_, i): ShorePiece => {
    const far = rng() < 0.4;
    return {
      kind: kinds[Math.floor(rng() * kinds.length)]!,
      x: slice * (i + 0.5) + rangeOf(rng, -slice * 0.15, slice * 0.15),
      scale: far ? rangeOf(rng, 0.3, 0.42) : rangeOf(rng, 0.5, 0.7),
      far,
    };
  });
}
