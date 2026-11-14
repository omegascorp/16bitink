import type { Ground, TerrainPatch } from '../land';
import type { LootTable } from '../loot';
import type { Part } from '../parts';
import type { Clan } from '../match/types';
import type { Pt } from '../vec';

/**
 * A hand-made level as data (design doc "A mission", "Bots", "Missions").
 * Places are named points (`points`) or literal {x, y}; routes are named
 * roads. `loadLevel` checks every name and builds the map.
 */
export type Place = string | Pt;

export type MissionType =
  | 'assault' | 'raid' | 'escort' | 'hold' | 'ace' | 'rescue' | 'ambush'
  | 'salvage' | 'breakout' | 'recon' | 'capture' | 'chase' | 'fortress';

/** A structure on the map: a kind from the chapter's kinds, at a ground origin. */
export interface StructPlace {
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  /** Default: `<kind><index>`. */
  readonly id?: string;
  /** Mission tag: 'target' (raid), 'cage' (rescue). */
  readonly tag?: string;
}

export type BotRole = 'guard' | 'patrol' | 'wave' | 'convoy' | 'hunter' | 'runner' | 'turret';

/** When a wave arrives: seconds into the level, when the alarm first goes off, or the objective's stage (salvage pick-up, first cage). */
export type WaveWhen = number | 'alarm' | 'stage';

export interface EnemyDef {
  readonly role: BotRole;
  readonly clan: Clan;
  /** "gun+mk/hull+mk/drive+mk", e.g. "cannon1/medium1/halftracks1". */
  readonly tank: string;
  /** Where it starts: a guard's post, a turret's spot, a wave's entry point. */
  readonly at: Place;
  /** Patrol: the road it drives (back and forth). Convoy, runner: the road to its exit. */
  readonly route?: string;
  /** Waves only. */
  readonly when?: WaveWhen;
  /** Guard: how far from its post it fights before going back (default 320). */
  readonly leash?: number;
  /** How far it spots you before the alarm (default by role, see ROLE_SIGHT). */
  readonly sight?: number;
  readonly name?: string;
  /** A named ace: rare intel, its wreck drops a prototype part. */
  readonly ace?: boolean;
  readonly hpMult?: number;
  readonly speedMult?: number;
  /** Repair kits it carries (default 0; an ace 1). With none it fights to the end. */
  readonly kits?: number;
  /** Drawn and driven as a truck (no gun). Convoys. */
  readonly truck?: boolean;
}

export interface CrateDef {
  readonly at: Place;
  /** Rolled from the level's loot table when absent. */
  readonly content?: Part | 'kit';
}

export interface BossDef {
  readonly name: string;
  readonly hp: number;
  readonly turrets: readonly { readonly gun: 'machinegun' | 'cannon' | 'rockets'; readonly dx: number; readonly dy: number; readonly hp: number }[];
  /** The road it drives round. */
  readonly road: string;
  readonly speed: number;
}

export type ObjectiveDef =
  | { readonly kind: 'assault' }
  | { readonly kind: 'raid'; readonly tag: string; readonly need?: number; readonly label: string }
  | { readonly kind: 'escort'; readonly road: string; readonly truckHp: number; readonly speed: number; readonly leash?: number }
  | { readonly kind: 'hold'; readonly zone: string; readonly radius: number; readonly seconds: number }
  | { readonly kind: 'ace' }
  | { readonly kind: 'rescue'; readonly tag: string; readonly home: string; readonly crewHp?: number }
  | { readonly kind: 'ambush'; readonly mayEscape?: number }
  | { readonly kind: 'salvage'; readonly at: string; readonly pickup: string }
  | { readonly kind: 'breakout'; readonly exit: string; readonly radius?: number; readonly artillery?: ArtilleryDef }
  | { readonly kind: 'recon'; readonly spots: readonly string[]; readonly radius?: number; readonly dwell?: number }
  | { readonly kind: 'capture'; readonly flags: readonly string[]; readonly radius?: number; readonly capture?: number; readonly holdAll?: number }
  | { readonly kind: 'chase'; readonly base: string }
  | { readonly kind: 'fortress'; readonly boss: BossDef };

/** Shells that mark a spot near you, then land (Breakout). */
export interface ArtilleryDef {
  /** Seconds between marks. */
  readonly every: number;
  readonly radius: number;
  readonly damage: number;
  /** Seconds from the mark to the blast. */
  readonly warn: number;
}

export type BonusDef =
  | { readonly kind: 'kills'; readonly n: number }
  | { readonly kind: 'noKit' }
  | { readonly kind: 'time'; readonly under: number }
  | { readonly kind: 'noAlarm' }
  | { readonly kind: 'truckHp'; readonly min: number }
  | { readonly kind: 'heavyWithRockets' }
  | { readonly kind: 'swaps'; readonly n: number }
  | { readonly kind: 'intel'; readonly n: number };

export interface LevelMap {
  readonly cols: number;
  readonly rows: number;
  readonly base: Ground;
  readonly terrain: readonly TerrainPatch[];
  readonly structures: readonly StructPlace[];
  readonly points: Readonly<Record<string, Pt>>;
  readonly roads: Readonly<Record<string, readonly Pt[]>>;
}

export interface LevelDef {
  readonly id: string;
  /** Level numbers run on across chapters (chapter 2 starts at 11). */
  readonly number: number;
  readonly name: string;
  readonly type: MissionType;
  readonly briefing: string;
  readonly teaches: string;
  readonly map: LevelMap;
  readonly start: Place;
  /** Facing at the start, radians (0 = east). */
  readonly startHeading?: number;
  readonly enemies: readonly EnemyDef[];
  readonly crates: readonly CrateDef[];
  readonly objective: ObjectiveDef;
  readonly bonus: readonly [BonusDef, BonusDef];
  /** Seconds; the level fails when it runs out. */
  readonly timeLimit?: number;
  /** For rolled crates. */
  readonly loot: LootTable;
}
