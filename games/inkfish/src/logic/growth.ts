import type { LevelDef } from '../levels/types';

export interface GrowthState {
  readonly points: number;
  /** 0-based growth stage, up to playerSizes.length - 1. */
  readonly tier: number;
  readonly complete: boolean;
}

export const initialGrowth: GrowthState = { points: 0, tier: 0, complete: false };

/** Growth points that finish the level. */
export function growthGoal(level: LevelDef): number {
  return level.tiers[level.tiers.length - 1]!;
}

export function tierForPoints(level: LevelDef, points: number): number {
  return level.tiers.slice(0, -1).filter((t) => points >= t).length;
}

export function addGrowth(level: LevelDef, state: GrowthState, gained: number): GrowthState {
  const points = state.points + gained;
  return { points, tier: tierForPoints(level, points), complete: points >= growthGoal(level) };
}

/** 0..1 progress across the whole level, for the HUD meter. */
export function growthProgress(level: LevelDef, state: GrowthState): number {
  return Math.min(1, state.points / growthGoal(level));
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
