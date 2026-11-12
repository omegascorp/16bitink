import type { LootTable } from '../loot';
import type { Loadout } from '../parts';
import type { Clan } from '../match/types';

export type MissionType = 'royale' | 'raid' | 'escort' | 'hold' | 'ace' | 'salvage' | 'fortress';

export interface AceDef {
  readonly name: string;
  readonly crew: string;
  readonly clan: Clan;
  readonly loadout: Loadout;
  readonly hpMult?: number;
}

export interface BossDef {
  readonly name: string;
  readonly hp: number;
  readonly turrets: readonly { readonly gun: 'machinegun' | 'cannon' | 'rockets'; readonly dx: number; readonly dy: number; readonly hp: number }[];
  /** Road it patrols (land roads key). */
  readonly road: string;
  readonly speed: number;
}

export type MainObjective =
  | { readonly kind: 'royale'; readonly top: number }
  | { readonly kind: 'raid'; readonly tag: string; readonly need: number }
  | { readonly kind: 'escort'; readonly road: string; readonly truckHp: number; readonly speed: number }
  | { readonly kind: 'hold'; readonly point: string; readonly radius: number; readonly seconds: number; readonly waves: readonly { readonly at: number; readonly count: number }[] }
  | { readonly kind: 'ace'; readonly ace: AceDef }
  | { readonly kind: 'salvage'; readonly at: string; readonly pickup: string }
  | { readonly kind: 'fortress'; readonly boss: BossDef };

export type BonusId =
  | 'kills3' | 'kills5' | 'noKit' | 'noStorm' | 'lightOnly' | 'intel6' | 'intel10'
  | 'heavyWithRockets' | 'win' | 'fast' | 'swap2' | 'truck75' | 'top1Alive';

export interface MissionDef {
  readonly level: number;
  readonly name: string;
  readonly type: MissionType;
  readonly main: MainObjective;
  readonly bonus: readonly [BonusId, BonusId];
  readonly storm: 'on' | 'off';
  readonly supplyDrops: number;
  /** Overrides the area-scaled bot count. */
  readonly bots?: number;
  /** Seconds the storm takes to close (on), or the time limit (off). */
  readonly length?: number;
  /** The parts bots and crates use on this level (the chapter's table if absent). */
  readonly loot?: LootTable;
  readonly teaches: string;
  readonly briefing: string;
}
