import type { CharmId } from './charms';
import type { ColourId } from './colours';
import type { Fruit, FruitKind } from './fruit';
import type { Pt } from './path';
import type { BossEvent } from './boss';
import type { TwistEvent } from './twists';

/** The board's shapes: shots, falling charms, the player's input, and everything that can happen in a step. */

export interface Shot {
  readonly id: number;
  readonly colour: ColourId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Gaps in the line it has flown through. */
  gaps: number;
  /** Walls it has bounced off (barn levels). */
  bounces: number;
  /** Pillars it has glanced off (the ruins). */
  glances: number;
  /** A Burst charm caught on a rail level: pops what it lands among instead of joining the line. */
  readonly burst: boolean;
  /** A Dragonfly: flies on through the whole board, popping every marble it touches. */
  readonly pierce: boolean;
  /** A Geode crystal: joins the line as the colour of the marble it hits. */
  readonly wild: boolean;
  /** It has met the boss already (a swatted or piercing shot doesn't meet it twice). */
  bossed?: boolean;
}

export interface Drop {
  readonly id: number;
  readonly charm: CharmId;
  readonly x: number;
  y: number;
  vy: number;
}

export interface BoardInput {
  /** Where the player points, board px (pivot: aim at it; rail: run under it). */
  readonly aim: Pt | null;
  readonly fire: boolean;
  readonly swap: boolean;
  /** Rail levels: run left (−1) or right (1) by keys. Pivot and hop levels: turn. */
  readonly move: number;
  /** Hop levels: the pad to hop to. */
  readonly hop: number | null;
}

export const NO_INPUT: BoardInput = { aim: null, fire: false, swap: false, move: 0, hop: null };

export type BoardEvent =
  | { readonly type: 'spit'; readonly x: number; readonly y: number; readonly colour: ColourId; readonly dragonfly: boolean; readonly geode: boolean }
  | { readonly type: 'hop'; readonly pad: number }
  | { readonly type: 'landed'; readonly pad: number }
  | { readonly type: 'swap' }
  | { readonly type: 'stuck'; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'miss' }
  | {
    readonly type: 'pop'; readonly x: number; readonly y: number; readonly colour: ColourId; readonly count: number;
    readonly combo: number; readonly points: number; readonly line: number; readonly marbles: readonly { x: number; y: number; colour: ColourId; stone?: boolean }[];
  }
  | { readonly type: 'pull'; readonly x: number; readonly y: number }
  | { readonly type: 'join'; readonly x: number; readonly y: number }
  | { readonly type: 'gap'; readonly x: number; readonly y: number; readonly gaps: number; readonly points: number }
  | { readonly type: 'streak'; readonly x: number; readonly y: number; readonly streak: number; readonly points: number }
  | { readonly type: 'charm'; readonly charm: CharmId; readonly x: number; readonly y: number }
  | { readonly type: 'drop'; readonly drop: Drop }
  | { readonly type: 'caught'; readonly charm: CharmId; readonly x: number; readonly y: number }
  | { readonly type: 'blossom'; readonly x: number; readonly y: number; readonly count: number }
  | { readonly type: 'windfall'; readonly fruit: Fruit }
  | { readonly type: 'bounce'; readonly x: number; readonly y: number }
  | { readonly type: 'shift'; readonly count: number }
  | { readonly type: 'rain'; readonly x: number }
  | { readonly type: 'hedgehog'; readonly line: number }
  | { readonly type: 'munch'; readonly x: number; readonly y: number }
  | { readonly type: 'hedgehogGone' }
  | { readonly type: 'sink'; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'fruit'; readonly x: number; readonly y: number; readonly kind: FruitKind; readonly points: number }
  | { readonly type: 'well'; readonly lives: number; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'burrowOpen'; readonly line: number; readonly x: number; readonly y: number }
  | { readonly type: 'newColour'; readonly colour: ColourId }
  | { readonly type: 'leafHit'; readonly x: number; readonly y: number }
  | { readonly type: 'tipped'; readonly pad: number }
  | { readonly type: 'gold'; readonly x: number; readonly y: number; readonly count: number; readonly left: number }
  | TwistEvent
  | BossEvent
  | { readonly type: 'filled' }
  | { readonly type: 'won' }
  | { readonly type: 'lost'; readonly cause: LossCause };

/** How a level was lost: a marble in the well with no lives left, or a blitz's clock running out. */
export type LossCause = 'well' | 'time';

export type BoardState = 'play' | 'won' | 'lost';
