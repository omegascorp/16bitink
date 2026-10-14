import type { GroundStyle } from '../art/palette';
import type { ItemDef } from '../logic/items';
import type { ContractDef, MissionDef } from '../logic/mission';
import type { OreKey } from '../logic/ore';
import type { CarveSpec } from './carve';

/**
 * One landing site, InkCrab style: a short definition that says what
 * matters, carved into the full map by the builder with a fixed seed.
 */
export interface LevelDef {
  /** Permanent: saves are keyed by it. Never change or reuse one, even when renaming. */
  readonly id: string;
  readonly name: string;
  /** What the level teaches, shown on its intro card. */
  readonly hint: string;
  readonly site: CarveSpec;
  /** Mission items, contract specimens and blueprints, by column and depth below the lander's ground. */
  readonly items: readonly ItemDef[];
  readonly mission: MissionDef;
  /** The two contracts on planet 1 (fixed); from planet 2 a board to pick two from. */
  readonly contracts: readonly ContractDef[];
  /** The drill mark the main path is built for: the reachability test checks the mission with it. */
  readonly drill: number;
}

export interface PlanetDef {
  /** 1..10. */
  readonly number: number;
  readonly name: string;
  readonly blurb: string;
  readonly style: GroundStyle;
  /** The material the guild sent you for; the main ingredient of the planet's gear. */
  readonly signature: OreKey;
  readonly levels: readonly LevelDef[];
  /** Levels drawn as pencil drafts after the built ones, by name. */
  readonly drafts: readonly string[];
}
