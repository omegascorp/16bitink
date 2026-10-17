import type { GroundStyle } from '../art/palette';
import type { ItemDef } from '../logic/items';
import type { OreKey } from '../logic/ore';
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
