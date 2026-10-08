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
  /** Feels nearby prey through its electric field (sharks): see logic/sense.ts. */
  readonly sense?: boolean;
}

export const PLAYER_STATS: Readonly<Record<PlayerFishId, SwimStats>> = {
  inkling: { speed: 1, agility: 1, dash: 1, leap: 1, trait: 'An all-rounder that squirts ink: press E or tap ink, and hunters lose you.' },
  // Gobies perch on the bottom and dart in short hops.
  goby: { speed: 0.9, agility: 1.25, dash: 1.1, leap: 0.8, trait: 'Quick to dart, and a cousin of the mudskipper: dash in mid-air to skip off the water again.' },
  perchfry: { speed: 1, agility: 1.05, dash: 1.05, leap: 0.95, trait: 'Steady, with a spiny fin: a bite gets pricked and spat out instead of costing a life (every 12 s).' },
  // A deep, flat body that pivots in its own length around coral.
  butterfly: { speed: 0.92, agility: 1.4, dash: 0.95, leap: 0.8, trait: 'Turns on a coin, and nibbles coral: you keep growing while you hide in it.' },
  // Built for endless cruising; tunas often leap clear of the water.
  tuna: { speed: 1.2, agility: 0.9, dash: 1.2, leap: 1.25, trait: 'The fastest swimmer yet: two dashes back to back.' },
  // The fastest shark, a famous leaper, and like all sharks it feels the electric field of prey.
  mako: {
    speed: 1.15, agility: 0.92, dash: 1.4, leap: 1.25, sense: true,
    trait: 'A shark: a huge dash, and it senses prey nearby, even in the dark.',
  },
  // Climbs hundreds of metres to the surface and back every night.
  lanternfish: { speed: 1.05, agility: 1.1, dash: 1.1, leap: 1, trait: 'Flashes its lights: press E or tap flash, and small fish swim to you. So do hunters.' },
  // Hangs still in the dark, then strikes.
  viperfish: { speed: 0.95, agility: 1, dash: 1.4, leap: 1, trait: 'A huge hinged jaw: it can swallow fish as big as itself.' },
  loosejaw: { speed: 1, agility: 1.05, dash: 1.35, leap: 1, trait: 'Hunts by its own red searchlight: you see much further in the dark.' },
  // Soft-bodied and slow, but the most active fish found in the trenches.
  snailfish: { speed: 0.92, agility: 1.3, dash: 1.15, leap: 1, trait: 'Soft as jelly: jellyfish stings and fish spines don’t hurt it.' },
};
