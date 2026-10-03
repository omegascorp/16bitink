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
