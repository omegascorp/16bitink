import type { GroundStyle } from '../art/palette';
import type { CreatureRule, GiantKind } from '../logic/creatures';
import type { ItemDef } from '../logic/items';
import type { OreKey } from '../logic/ore';
import type { TilePos } from '../logic/terrain';
import type { WorldId } from '../logic/worlds';
import type { CarveSpec } from './carve';

/**
 * A planet's world, InkCrab style: a short definition that says what
 * matters (its size, its regions' hand-placed caves, vaults and things to
 * find), carved into the full ground by the builder with a fixed seed. Each
 * planet is one small open world you can walk all the way round (spec,
 * "The world").
 */
export interface WorldDef {
  /** Permanent: the world's save is keyed by it. Never change or reuse one. */
  readonly id: WorldId;
  /**
   * Bumped whenever a released world's layout changes. Saves record it;
   * a save from another version still loads (its tunnels stay open in the
   * new rock), so change shipped worlds by adding, not moving.
   */
  readonly version: number;
  readonly site: CarveSpec;
  /** Blueprints (and later what people ask for), by column and depth below the lander's ground. */
  readonly items: readonly ItemDef[];
  /** The column the local people's outpost stands at, on the surface (none on a world without them). */
  readonly outpost?: number;
  /** The column a lost lander lies wrecked at, on the surface, its distress beacon still calling (Mycel's Aster lander). */
  readonly crash?: number;
  /** Where its creatures live (creatures.ts; none on a dead world like Graphite). */
  readonly creatures?: readonly CreatureRule[];
  /** The world's giant, where it lives: the floor of its chamber, by column and depth (a room should be carved there), and which it is (default the Mother Mycel). */
  readonly giant?: { readonly at: TilePos; readonly kind?: GiantKind };
  /** Where a lost crew made camp, by column and depth: the last open row of its cave (a room should be carved there). Mycel's Aster camp, at the end of their trail. */
  readonly camp?: { readonly at: TilePos };
  /** The column a lost crew's craft lies sunk at, on the seabed (Brine's Aster craft). */
  readonly craft?: number;
  /** Where the local people live under the water, by column and depth: the floor of their cave (Brine's Tidesingers). */
  readonly reef?: { readonly at: TilePos };
  /** Where the lost craft's drive crystal lies, by column and depth: the floor of the cave it fell into (Brine's, by the Leviathan). */
  readonly crystal?: { readonly at: TilePos };
  /** Where the search party's ship lies wrecked (Talus): its hatch, by column and depth, buried in the loose rock at a mesa's foot. */
  readonly searchShip?: { readonly at: TilePos };
  /** The world's weather: Talus has dust storms (storm.ts; default none). */
  readonly weather?: 'dust';
}

/** The card shown the first time you land on a world: its name, a line under it, a few paragraphs and the button. */
export interface Arrival {
  readonly subtitle: string;
  readonly paragraphs: readonly string[];
  readonly button: string;
}

export interface PlanetDef {
  /** 1..10. */
  readonly number: number;
  readonly name: string;
  readonly blurb: string;
  readonly style: GroundStyle;
  /** The planet's signature material; the main ingredient of its gear. */
  readonly signature: OreKey;
  readonly world: WorldDef;
  /** The card on first landing (Graphite's opening is the HUD's own). */
  readonly arrival?: Arrival;
}
