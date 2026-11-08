import type { PreyKind } from '../logic/preyTypes';
import type { SnakeId } from '../logic/species';
import type { Pt } from '../logic/vec';

/** Every level is laid out on this board, seen from above, scaled to fit the screen. */
export const BOARD = { w: 960, h: 540 } as const;

/** The chapters' places, each painted and sounding its own way. */
export const PLACES = ['farm', 'barrens', 'dunes', 'savanna', 'rainforest', 'reef', 'mountains', 'heath', 'jungle', 'flooded'] as const;
export type Place = (typeof PLACES)[number];

/**
 * Something solid on the board: the snake's head slides along it, prey
 * runs round it. `look` says how it's painted (a hay bale, a rock…).
 */
export type SolidDef =
  | { readonly kind: 'circle'; readonly look: string; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'rect'; readonly look: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * A kind of ground that changes the rules where it lies: water (swimming,
 * breath, lurkers), land (an island in the water), sand (burying, dunes),
 * tree (crowns to glide between; elsewhere is the forest floor), sun (a
 * warm patch to bask in), grass (tall grass: cover that also lets prey hide).
 */
export const ZONE_KINDS = ['water', 'land', 'sand', 'tree', 'sun', 'grass'] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

/** A zone's shape on the board: a round patch, a box, or a polygon. `look` says how it's painted. */
export type ZoneDef =
  | { readonly kind: ZoneKind; readonly look?: string; readonly shape: 'circle'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: ZoneKind; readonly look?: string; readonly shape: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly kind: ZoneKind; readonly look?: string; readonly shape: 'poly'; readonly points: readonly Pt[] };

/** A patch of cover (cabbages, long grass): a head under it is hidden from hunters. Round, so it reads as a clump. */
export interface CoverDef {
  readonly look: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** A kind of prey kept on the board: `count` of them at a time, a new one coming a while after one is eaten. */
export interface PreyDef {
  readonly kind: PreyKind;
  readonly count: number;
}

/** An enemy kind: the farm's (crow, hawk, hen) or a chapter's (see logic/enemies/index.ts). */
export type EnemyKind = string;

/** An enemy in the level: `count` of them, the first arriving after `from` seconds. */
export interface EnemyDef {
  readonly kind: EnemyKind;
  readonly count?: number;
  readonly from?: number;
}

/** A boss kind: one per chapter (see logic/enemies/index.ts). */
export type BossKind = string;

/** The chapter's boss: drive it off with `hp` strikes in its open moments. */
export interface BossDef {
  readonly kind: BossKind;
  readonly hp: number;
}

/**
 * What a level asks for besides growing to its target length. Rush: grow
 * within `seconds`. Feast: also eat `count` of the marked `kind`. Boss:
 * drive the boss off (growing isn't asked).
 */
export type GoalDef =
  | { readonly kind: 'rush'; readonly seconds: number }
  | { readonly kind: 'feast'; readonly food: PreyKind; readonly count: number }
  | { readonly kind: 'boss' };

/** What a level's first-time hints teach (see logic/coach.ts). */
/** What a level's first-time hints teach: the shared ones (see logic/coach.ts), and any a chapter adds (ChapterRules.hints). */
export const TEACH = ['steer', 'eat', 'strike', 'coil', 'crow', 'hawk', 'cover', 'feast', 'rush', 'dark', 'boss', 'knot', 'venom'] as const;
export type Teach = string;

export interface LevelDef {
  /** Permanent: saves are keyed by it. */
  readonly id: string;
  readonly name: string;
  readonly snake: SnakeId;
  /** Where the snake starts, and the way it faces (radians). */
  readonly start: Pt;
  readonly heading: number;
  /** Body length at the start, and the length that clears the level, board px. */
  readonly length: number;
  readonly target: number;
  /** Seconds to beat for the time blot. */
  readonly par: number;
  readonly prey: readonly PreyDef[];
  readonly enemies?: readonly EnemyDef[];
  readonly solids?: readonly SolidDef[];
  readonly cover?: readonly CoverDef[];
  /** Ground that changes the rules where it lies (water, sand, trees…), painted by the place. */
  readonly zones?: readonly ZoneDef[];
  /** Spots a chapter's boss or enemies use (a badger's setts, an eagle's perches), board px. */
  readonly spots?: readonly Pt[];
  /** Nests eggs are laid in (the hen coop). */
  readonly nests?: readonly Pt[];
  readonly goal?: GoalDef;
  readonly boss?: BossDef;
  /** Lives for the level, if not the usual three. */
  readonly lives?: number;
  /** Night: only round the snake's head can be seen. */
  readonly dark?: boolean;
  readonly teach?: readonly Teach[];
}
