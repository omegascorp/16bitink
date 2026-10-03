export type SpeciesId = 'minnow' | 'perch' | 'puffer' | 'pike' | 'angler' | 'eel';
export type PowerUpId = 'speed' | 'shrink';
/** Where a chapter takes place; also how deep, since the seabed slopes down. */
export type ZoneId =
  | 'tidepool' | 'seagrass' | 'kelp' | 'reef' | 'wreck'
  | 'dropoff' | 'twilight' | 'midnight' | 'abyss' | 'trench';
/** The young fish the player swims as in a chapter. */
export type PlayerFishId = 'inkling' | 'perchfry' | 'barracuda' | 'lanternfish';

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
  readonly id: string;
  readonly chapter: number;
  readonly name: string;
  /** Growth points needed for tier 2, tier 3 and to finish the level. */
  readonly tiers: readonly [number, number, number];
  /** Player radius at tier 1, 2 and 3. */
  readonly playerSizes: readonly [number, number, number];
  readonly world: { readonly width: number; readonly height: number };
  readonly spawns: readonly SpawnEntry[];
  readonly maxFish: number;
  readonly hazards: { readonly jellyfish: number; readonly hookEverySec: number };
  readonly powerUps: readonly PowerUpId[];
  /** Seconds to earn three ink blots. */
  readonly parTime: number;
  readonly twists: readonly TwistId[];
  readonly objective: Objective;
  readonly modifiers: Modifiers;
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
