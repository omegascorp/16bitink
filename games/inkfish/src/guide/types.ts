import type { BirdId } from '../logic/birds';
import type { JellyId } from '../levels/jellies';
import type { PlayerFishId, SpeciesId } from '../levels/types';

/** Everything the fish guide can describe: fish and seabed critters, the fish you swim as, jellyfish and birds. */
export type GuideId = SpeciesId | PlayerFishId | BirdId | JellyId;

/**
 * One real-life fact card. Short phrases, not sentences, so a card reads at a
 * glance; figures are typical adult maximums, approximate ("~", "up to").
 */
export interface GuideEntry {
  /** Scientific name of the species (or genus/family when the game means a group). */
  readonly latin: string;
  /** Maximum length, e.g. "up to 1.5 m". */
  readonly length: string;
  /** Maximum weight, e.g. "up to 25 kg". */
  readonly weight: string;
  /** Typical maximum lifespan, e.g. "up to 20 years". */
  readonly lifespan: string;
  /** Cruising and burst speed, or how it moves when speed isn't measured. */
  readonly speed: string;
  /** Depth range it lives at, e.g. "0-30 m". */
  readonly depth: string;
  /** Where in the world it lives. */
  readonly range: string;
  /** What it eats. */
  readonly eats: string;
  /** One striking true fact. */
  readonly fact: string;
}

/** Field limits, so every card fits its panel. */
export const GUIDE_LIMITS = { field: 64, fact: 120 } as const;
