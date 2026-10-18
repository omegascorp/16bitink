import type { Creature } from './creatures';
import type { DrillSpec } from './drill';
import type { Loadout } from './gear';
import type { Inventory } from './inventory';
import type { ItemDef } from './items';
import type { Ladders } from './ladders';
import type { JetSpec } from './marks';
import type { DroppedBag } from './flag';
import type { Stores } from './stores';
import type { Fuels, Gauge, SuitSpec } from './suit';
import type { Terrain } from './terrain';
import type { Water } from './water';
import type { SavedPiece } from './worldSave';

/** What a dig site (mine.ts) starts from, and the controls it's stepped with. */

/** Everything a dig site starts from. */
export interface MineSetup {
  readonly terrain: Terrain;
  readonly tileSize: number;
  readonly drill: DrillSpec;
  /** The marks of every gear piece, for how the prospector looks. */
  readonly loadout: Loadout;
  readonly suit: SuitSpec;
  /** Ladders already hanging in the world (from a save), over `terrain` (default none). */
  readonly placedLadders?: Ladders;
  /** The lander's middle column and the surface row it stands on. */
  readonly lander: { readonly col: number; readonly row: number };
  /** The jetpack's mark (default the starter's). */
  readonly jet?: JetSpec;
  /** Things to find: blueprints, and later what people ask for (default none). */
  readonly items?: readonly ItemDef[];
  /** Share of the bag a recall keeps: the ship's winch (default none). */
  readonly winchKeeps?: number;
  /** The ship's cargo, which the bag empties into at the lander (default an empty starter hold). */
  readonly cargo?: Inventory;
  /** What the suit's bag still holds from the last landing (default empty). */
  readonly bag?: Inventory;
  /** The ores that feed the cell and life support (default Graphite's: graphite and ice). */
  readonly fuels?: Fuels;
  /** A bag left in the world last time, under its flag (default none). */
  readonly dropped?: DroppedBag | null;
  /** Ore left lying loose last time, each at its tile (default none). */
  readonly pieces?: readonly SavedPiece[];
  /** The lander's air tank and battery, and what each holds (default full starter tanks). */
  readonly stores?: Stores;
  readonly storesCap?: number;
  /** Where the Lamplighters' outpost stands: its middle column and the surface row (default none). */
  readonly outpost?: { readonly col: number; readonly row: number };
  /** The world's creatures, placed for this landing (creatures.ts; default none). */
  readonly creatures?: readonly Creature[];
  /** Whether the prospector carries the pulse (pulse.ts; default not). */
  readonly armed?: boolean;
  /** The world's water (water.ts; default none). */
  readonly water?: Water | null;
  /** Whether the suit has the rebreather, so depth doesn't matter to the air (default not). */
  readonly rebreather?: boolean;
  /** A world with dust storms gives their seed (storm.ts; default none). */
  readonly storm?: number;
}

/** Graphite's fuels: graphite for the drill (it's in battery anodes), water ice for the air. */
export const GRAPHITE_FUELS: Fuels = { cell: ['graphite'], air: ['ice'] };

/** The starter ship's cargo: slots, and pieces a slot stacks. */
export const CARGO = { slots: 16, stack: 50 } as const;

/** One step's controls: held directions (-1..1), the jump button held (thrust), and buttons pressed this step. */
export interface MineInput {
  readonly ix: number;
  readonly iy: number;
  readonly jump: boolean;
  /** Jump held: in the air, the jetpack fires. */
  readonly thrust: boolean;
  readonly recall: boolean;
  /** Feed a gauge from the bag this step: a tapped one, or the lower one (the feed key). */
  readonly feed: Gauge | 'lowest' | null;
  /** Fire the pulse this step (default not). */
  readonly fire?: boolean;
}

export const NO_INPUT: MineInput = { ix: 0, iy: 0, jump: false, thrust: false, recall: false, feed: null, fire: false };
