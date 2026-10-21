import type { CharmId } from '../logic/charms';
import type { Pt } from '../logic/path';

/** A broken column standing on the board (the ruins): shots glance off it. */
export interface PillarDef {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Every level is laid out on this board, scaled to fit the screen. */
export const BOARD = { w: 1280, h: 720 } as const;

/**
 * Where the gecko stands: in one spot turning to aim (Zuma), running along a
 * branch spitting up (Luxor), or hopping between lily pads, turning to aim
 * on each (Zuma's Revenge's lily pads).
 */
export type ShooterDef =
  | { readonly kind: 'pivot'; readonly x: number; readonly y: number }
  | { readonly kind: 'rail'; readonly y: number; readonly x0: number; readonly x1: number }
  | { readonly kind: 'hop'; readonly pads: readonly Pt[] };

/** A covered stretch of track, as shares of its length (0 = burrow, 1 = well): marbles under it can't be hit. */
export interface TunnelDef {
  readonly from: number;
  readonly to: number;
}

/**
 * One track: control points from the burrow to the well; the game draws a
 * smooth curve through them. Where tracks cross, the lower one runs through
 * a tunnel and the upper one is `raised` over it (drawn above the cover).
 */
export interface TrackDef {
  readonly points: readonly Pt[];
  readonly tunnels?: readonly TunnelDef[];
  readonly raised?: readonly TunnelDef[];
}

/** What a level's first-time hints teach. */
export type Teach = 'spit' | 'swap' | 'rail' | 'catch' | 'pull' | 'hop' | 'tunnel' | 'dragonfly' | 'cross' | 'inkpot' | 'fruit' | 'bud' | 'stone' | 'geode' | 'twine' | 'hedgehog' | 'chameleon' | 'rain' | 'bank' | 'pillar' | 'dark' | 'lantern';

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
  /** Fruit rolls across the board now and then: spit it for points and a charm (the orchard). */
  readonly fruit?: boolean;
  /** Share of new marbles that come out closed in a bud, 0..0.4 (they blossom beside a match before they can pop). */
  readonly buds?: number;
  /** Share of new marbles that are stones, 0..0.4 (never match; break when a pop happens beside them). */
  readonly stones?: number;
  /** Share of new marbles that come out tied with twine to the marble ahead, 0..0.4 (the pair pops together; the allotment). */
  readonly twine?: number;
  /** Share of new marbles that are chameleons, 0..0.4 (they change colour every few seconds; the meadow). */
  readonly chameleons?: number;
  /** Shots bounce off the board's left, right and top edges, its timber walls (the barn). */
  readonly walls?: boolean;
  /** Broken columns standing on the board that shots glance off (the ruins). */
  readonly pillars?: readonly PillarDef[];
  /** Night: only what the gecko, the lanterns and the burrows light can be seen (the night garden). */
  readonly dark?: boolean;
}
