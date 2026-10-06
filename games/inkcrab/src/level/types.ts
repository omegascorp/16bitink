import type { CritterGroup } from '../logic/sim';
import type { ShellKind } from '../logic/shells';

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
  /** Rock boulders: column, row, radius. */
  readonly rocks?: readonly (readonly [number, number, number])[];
  /** Column the crab starts at. */
  readonly startCol: number;
  /** Shells to find, beyond the periwinkle it starts in: column, and how deep it's buried (0 = on the surface). */
  readonly shells: readonly (readonly [ShellKind, number, number])[];
  readonly food: {
    /** Loose food on the surface, kept stocked. */
    readonly surface: number;
    /** Food buried at random, richer deeper. */
    readonly buried: number;
    /** Clams buried by hand: column and depth. */
    readonly clams?: readonly (readonly [number, number])[];
  };
  readonly critters?: readonly CritterGroup[];
  /** Seconds to earn the time blot. */
  readonly parTime: number;
}
