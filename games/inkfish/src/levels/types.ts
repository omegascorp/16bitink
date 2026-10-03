export type SpeciesId = 'minnow' | 'perch' | 'puffer' | 'pike' | 'angler' | 'eel';
export type PowerUpId = 'speed' | 'shrink';

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

export interface Chapter {
  readonly id: number;
  readonly name: string;
  readonly levels: readonly LevelDef[];
}
