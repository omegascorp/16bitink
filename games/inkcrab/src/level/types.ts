import type { FogSpec } from '../logic/fog';
import type { WrackSpec } from '../logic/kelp';
import type { RivalSpec } from '../logic/rivals';
import type { DeckSpec } from '../logic/decks';
import type { RainSpec } from '../logic/rain';
import type { WindSpec } from '../logic/wind';
import type { BirdGroup, CritterGroup } from '../logic/sim';
import type { SpeciesId } from '../logic/species';
import type { Lesson } from '../logic/coach';
import type { ShellKind } from '../logic/shells';
import type { TideSpec } from '../logic/tide';
import type { TreeSpec } from './mangrove';

/** A column and a surface row: the level's ground is drawn through these, eased between them. */
export type ProfilePoint = readonly [col: number, row: number];

/**
 * One hand-built level. Every level starts a size-1 crab in a periwinkle shell,
 * and the goal is always the same: grow to the biggest size the level's
 * shells allow (see logic/progress.ts).
 */
export interface LevelDef {
  /** Permanent: saves are keyed by it. Never change or reuse one, even when renaming. */
  readonly id: string;
  readonly name: string;
  /** What the level teaches, shown on its intro card. */
  readonly hint: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  /** Surface rows at control columns, left to right; two points a column apart make a step. */
  readonly profile: readonly ProfilePoint[];
  /** Rows of loose dune sand over the packed sand: it pours when dug (default none). */
  readonly loose?: number;
  /** Antlion pits: column of the bottom and how far the funnel reaches (see carve.ts). */
  readonly pits?: readonly (readonly [number, number])[];
  /** Rows of sand over granite (default: sand down to bedrock). */
  readonly granite?: number;
  /** Rock pools: first column, width and depth (see carve.ts). They start full. */
  readonly pools?: readonly (readonly [number, number, number])[];
  /** Octopus dens: an open tile in the rock, column and row. */
  readonly dens?: readonly (readonly [number, number])[];
  /** The tide, in rows (see logic/tide.ts); without one the beach stays dry. */
  readonly tide?: TideSpec;
  /** Things each high water washes in: food on the tide line, and shells in order (kind, size and column), one a tide. */
  readonly tideBrings?: { readonly food: number; readonly shells?: readonly (readonly [ShellKind, number, number])[] };
  /** Mud over the sand between two columns, so many rows deep: slow to walk on, quick to dig (see sim.ts). */
  readonly mud?: readonly (readonly [from: number, to: number, rows: number])[];
  /** Basalt columns: first column, width and height over the sand (tiles). */
  readonly columns?: readonly (readonly [col: number, width: number, height: number])[];
  /** Steam vents: shaft column, tiles it throws a crab up, seconds between blows, and seconds into its rhythm at the start (see logic/vents.ts). */
  readonly vents?: readonly (readonly [col: number, height: number, period: number, offset: number])[];
  /** Sea fog drifting along the beach (see logic/fog.ts). */
  readonly fog?: FogSpec;
  /** Kelp wrack washed up on the sand: first column and width (see logic/kelp.ts). */
  readonly kelp?: readonly WrackSpec[];
  /** Rival hermit crabs: the shell each is in, its size and its column (see logic/rivals.ts). */
  readonly rivals?: readonly RivalSpec[];
  /** Monsoon squalls coming and going (see logic/rain.ts). */
  readonly rain?: RainSpec;
  /** Boats and stilt houses over the sand: first column, width, open rows under it, and kind (see logic/decks.ts). */
  readonly decks?: readonly DeckSpec[];
  /** Wind gusts coming and going (see logic/wind.ts). */
  readonly wind?: WindSpec;
  /** Frozen pools: first column, width and rows of ice, a flat sheet at the lowest ground across it (see carve.ts). Slippery, never dug. */
  readonly ice?: readonly (readonly [col: number, width: number, rows: number])[];
  /** Black volcanic sand and basalt, drawn dark, a cold coast's grey sand, or a frosty shingle of pebbles (default pale sand). */
  readonly ground?: 'black' | 'grey' | 'shingle';
  /** Mangrove trees: trunk column, height over the mud and how far the roots spread (see mangrove.ts). */
  readonly trees?: readonly TreeSpec[];
  /** Rock boulders: column, row, radius. */
  readonly rocks?: readonly (readonly [number, number, number])[];
  /** Column the crab starts at. */
  readonly startCol: number;
  /** Shells to find, beyond the periwinkle it starts in: kind, size, column, and how deep it's buried (0 = on the surface, -1 = up on the highest root there). */
  readonly shells: readonly (readonly [ShellKind, number, number, number])[];
  readonly food: {
    /** Loose food on the surface, kept stocked. */
    readonly surface: number;
    /** Food buried at random, richer deeper. */
    readonly buried: number;
    /** Food kept buried a dig or two down, planted again at random as it's eaten (like the surface food). */
    readonly shallow: number;
    /** Extra food just past the start, half on the surface and half a dig or two down: a first meal before the hunters (see build.ts). */
    readonly start?: number;
    /** Clams buried by hand: column and depth. */
    readonly clams?: readonly (readonly [number, number])[];
  };
  readonly critters?: readonly CritterGroup[];
  /** Birds hunting from the sky. */
  readonly birds?: readonly BirdGroup[];
  /** The small, timid prey every level keeps about (default sea slaters). */
  readonly fry?: SpeciesId;
  /** Seconds to earn the time blot. */
  readonly parTime: number;
  /** Lessons the coach walks the player through here (see logic/coach.ts). */
  readonly teach?: readonly Lesson[];
}
