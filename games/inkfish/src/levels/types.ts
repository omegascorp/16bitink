import type { ItemId } from './items';
import type { SpeciesId } from './species';

export type { SpeciesId };
/** Where a chapter takes place; also how deep, since the seabed slopes down. */
export type ZoneId =
  | 'tidepool' | 'seagrass' | 'kelp' | 'reef' | 'wreck'
  | 'dropoff' | 'twilight' | 'midnight' | 'abyss' | 'trench';
/** The young fish the player swims as: a new one every chapter. */
export type PlayerFishId =
  | 'inkling' | 'goby' | 'perchfry' | 'butterfly' | 'tuna'
  | 'mako' | 'lanternfish' | 'loosejaw' | 'viperfish' | 'snailfish';

export interface SpawnEntry {
  readonly species: SpeciesId;
  readonly weight: number;
  /** Min/max fish radius in world units. */
  readonly size: readonly [number, number];
}

/**
 * What makes a level different from its neighbours. A level has one or two:
 * the first sets the goal, a second one adds a rule (current, dark, storm).
 */
export type TwistId = 'grow' | 'collect' | 'current' | 'bounty' | 'rush' | 'storm' | 'dark' | 'survive' | 'boss';

/** The extra challenge on top of growing: every level is won by reaching full size AND this. */
export type Objective =
  | { readonly kind: 'grow' }
  | { readonly kind: 'collect'; readonly count: number }
  | { readonly kind: 'bounty'; readonly count: number; readonly species: SpeciesId; readonly size: readonly [number, number] }
  | { readonly kind: 'boss'; readonly species: SpeciesId; readonly size: number };

/** Rules layered on top of the goal. */
export interface Modifiers {
  /** Seconds to reach the goal, or the level is lost. */
  readonly timeLimit?: number;
  /** Sideways current in world units per second; the sign is the direction. */
  readonly current?: number;
  /** Only a circle around the player is visible. */
  readonly dark?: boolean;
  /** Lives for this level when it differs from the usual three. */
  readonly lives?: number;
}

export interface LevelDef {
  /** Permanent: saves are keyed by it (see RecipeLevel). */
  readonly id: string;
  readonly chapter: number;
  /** 0-based position within its chapter. */
  readonly index: number;
  readonly name: string;
  /**
   * Growth points needed to reach each stage after the first; the last
   * entry finishes the level. Same length as playerSizes.
   */
  readonly tiers: readonly number[];
  /** Player radius at each growth stage, smallest first (3 to 5 stages, by chapter). */
  readonly playerSizes: readonly number[];
  readonly world: { readonly width: number; readonly height: number };
  readonly spawns: readonly SpawnEntry[];
  readonly maxFish: number;
  /** Crawlers on the seabed (crabs, shrimp, snails): spawned along the sand, not in open water. */
  readonly bottom: readonly SpawnEntry[];
  /** How many crawlers are about at once. */
  readonly maxCrawlers: number;
  readonly hazards: { readonly jellyfish: number; readonly hookEverySec: number };
  /** Kinds of human-made items that sink through this level (at most three). */
  readonly items: readonly ItemId[];
  /** Seconds to earn three ink blots. */
  readonly parTime: number;
  readonly twists: readonly TwistId[];
  readonly objective: Objective;
  readonly modifiers: Modifiers;
  /** Species seen for the first time in this level, announced on the intro card. */
  readonly debuts: readonly SpeciesId[];
}

/** What the map needs to draw a chapter, owned or not. */
export interface ChapterInfo {
  readonly id: number;
  readonly name: string;
  readonly zone: ZoneId;
  readonly player: PlayerFishId;
  /** Depth range in metres, shown on the map. */
  readonly depth: readonly [number, number];
}

export interface Chapter extends ChapterInfo {
  readonly levels: readonly LevelDef[];
}
