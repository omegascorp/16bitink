import type { CharmId } from '../logic/charms';
import type { Pt } from '../logic/path';

/** Every level is laid out on this board, scaled to fit the screen. */
export const BOARD = { w: 1280, h: 720 } as const;

/** Where the gecko stands: in one spot turning to aim (Zuma), or running along a branch spitting up (Luxor). */
export type ShooterDef =
  | { readonly kind: 'pivot'; readonly x: number; readonly y: number }
  | { readonly kind: 'rail'; readonly y: number; readonly x0: number; readonly x1: number };

/** One track: control points from the burrow to the well; the game draws a smooth curve through them. */
export interface TrackDef {
  readonly points: readonly Pt[];
}

/** What a level's first-time hints teach. */
export type Teach = 'spit' | 'swap' | 'rail' | 'catch' | 'pull';

export interface LevelDef {
  /** Permanent: saves are keyed by it. */
  readonly id: string;
  readonly name: string;
  readonly shooter: ShooterDef;
  readonly tracks: readonly TrackDef[];
  /** How many marble colours, from the game's order (see logic/colours.ts). */
  readonly colours: number;
  /** How fast the line rolls, board px per second. */
  readonly speed: number;
  /** Points that fill the bar and close the burrows. */
  readonly goal: number;
  /** Seconds to beat for the time blot. */
  readonly par: number;
  /** Charms that can turn up in this level. */
  readonly charms: readonly CharmId[];
  readonly teach?: readonly Teach[];
}
