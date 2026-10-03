import type { PlayerFishId } from './types';

/**
 * How each fish you swim as handles, as multipliers on the base tuning.
 * Loosely true to life, but every fish trades one strength for another, so
 * later chapters never feel like a downgrade: the deep fish are slow
 * cruisers with the hardest lunges.
 */
export interface SwimStats {
  /** Cruising speed. */
  readonly speed: number;
  /** How quickly it turns and gets up to speed. */
  readonly agility: number;
  /** Dash burst speed. */
  readonly dash: number;
  /** Leap height out of the water (sunlit chapters only). */
  readonly leap: number;
  /** One line for the chapter intro. */
  readonly trait: string;
}

export const PLAYER_STATS: Readonly<Record<PlayerFishId, SwimStats>> = {
  inkling: { speed: 1, agility: 1, dash: 1, leap: 1, trait: 'An all-rounder.' },
  // Gobies perch on the bottom and dart in short hops.
  goby: { speed: 0.9, agility: 1.25, dash: 1.1, leap: 0.8, trait: 'Slow to cruise, quick to dart.' },
  perchfry: { speed: 1, agility: 1.05, dash: 1.05, leap: 0.95, trait: 'Steady and even.' },
  // A deep, flat body that pivots in its own length around coral.
  butterfly: { speed: 0.92, agility: 1.4, dash: 0.95, leap: 0.8, trait: 'Not fast, but it turns on a coin.' },
  // Ambush hunter: lunges at around 40 km/h.
  barracuda: { speed: 1.08, agility: 0.95, dash: 1.35, leap: 1.15, trait: 'An explosive dash.' },
  // Built for endless cruising; tunas often leap clear of the water.
  tuna: { speed: 1.2, agility: 0.9, dash: 1.2, leap: 1.25, trait: 'The fastest swimmer yet, and it leaps high.' },
  // Climbs hundreds of metres to the surface and back every night.
  lanternfish: { speed: 1.05, agility: 1.1, dash: 1.1, leap: 1, trait: 'A tireless climber, quick all round.' },
  // Hangs still in the dark, then strikes.
  viperfish: { speed: 0.95, agility: 1, dash: 1.4, leap: 1, trait: 'A slow drifter with a lightning lunge.' },
  loosejaw: { speed: 1, agility: 1.05, dash: 1.35, leap: 1, trait: 'Hunts by its own red light, then strikes.' },
  // Soft-bodied and slow, but the most active fish found in the trenches.
  snailfish: { speed: 0.92, agility: 1.3, dash: 1.15, leap: 1, trait: 'Soft and slow, but nimble.' },
};
