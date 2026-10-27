import type { Seg } from './geom';
import type { Kind } from './particles';

/** A pin: a capsule that holds things back until it's pulled. The ring end is (ax, ay). */
export interface PinDef extends Seg {
  readonly id: string;
}

/** A block of grains, filled from its bottom row up until `count` grains are placed. */
export interface FillDef {
  readonly kind: Kind;
  readonly x0: number;
  readonly x1: number;
  /** The bottom of the block (the pin it rests on). */
  readonly y1: number;
  readonly count: number;
}

/** A closed polygon of open space, for the art: everything outside the rooms is rock. */
export type Room = readonly (readonly [number, number])[];

export interface LevelDef {
  readonly id: string;
  /** The chapter's ruin, shown above the level's name. */
  readonly chapter: string;
  readonly name: string;
  /** One line under the name: what to do. */
  readonly goal: string;
  readonly rooms: readonly Room[];
  readonly walls: readonly Seg[];
  /** Walls drawn as stone bars inside a room (dividers), by index into `walls`. */
  readonly bars: readonly number[];
  readonly pins: readonly PinDef[];
  readonly fills: readonly FillDef[];
  readonly nib: { readonly x: number; readonly y: number };
  readonly blots: readonly { readonly x: number; readonly y: number }[];
  /** Where the chest stands; Nib opens it on reaching it and takes its treasure. */
  readonly chest: { readonly x: number; readonly y: number };
  /** Coins Nib must pick up, as well as taking the chest, to win. */
  readonly coinsNeeded: number;
  /** A winning pull order, for the hint. */
  readonly solution: readonly string[];
  /** Wall torches (decoration): their brackets are painted, their flames animated. */
  readonly torches: readonly { readonly x: number; readonly y: number }[];
  /** The part of the board the camera fits to the screen. */
  readonly view: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}
