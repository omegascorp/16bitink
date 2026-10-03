import type { LevelDef } from '../levels/types';

export interface GrowthState {
  readonly points: number;
  /** 0, 1 or 2 */
  readonly tier: number;
  readonly complete: boolean;
}

export const initialGrowth: GrowthState = { points: 0, tier: 0, complete: false };

export function tierForPoints(level: LevelDef, points: number): number {
  if (points >= level.tiers[1]) return 2;
  if (points >= level.tiers[0]) return 1;
  return 0;
}

export function addGrowth(level: LevelDef, state: GrowthState, gained: number): GrowthState {
  const points = state.points + gained;
  return { points, tier: tierForPoints(level, points), complete: points >= level.tiers[2] };
}

/** 0..1 progress across the whole level, for the HUD meter. */
export function growthProgress(level: LevelDef, state: GrowthState): number {
  return Math.min(1, state.points / level.tiers[2]);
}

export function playerSizeFor(level: LevelDef, tier: number): number {
  const sizes = level.playerSizes;
  return sizes[Math.max(0, Math.min(sizes.length - 1, tier))]!;
}

/** Ink-blot rating: 3 at/under par, 2 within 1.5x par, otherwise 1. */
export function blotsFor(level: LevelDef, seconds: number): 1 | 2 | 3 {
  if (seconds <= level.parTime) return 3;
  if (seconds <= level.parTime * 1.5) return 2;
  return 1;
}
