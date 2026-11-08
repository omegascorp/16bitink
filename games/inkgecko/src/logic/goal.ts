import type { LevelDef } from '../level/types';

/** Gold levels: a new marble out of a burrow is golden this often, while more are needed. */
export const GOLD_SHARE = 0.1;
/** Gold levels keep this many golden marbles out beyond what's still needed, in case some go down the well. */
export const GOLD_SPARE = 2;

/** What the bar is measured by. */
export interface GoalState {
  readonly level: LevelDef;
  readonly score: number;
  readonly elapsed: number;
  readonly goldPopped: number;
  readonly boss: { readonly hp: number; readonly maxHp: number } | null;
}

/**
 * How full the bar is, 0..1: the boss's hits taken, the hold-out's time
 * held, the golden marbles popped, or (the usual, and a blitz) points.
 */
export function goalProgress(b: GoalState): number {
  const mode = b.level.mode;
  const share = b.boss ? 1 - b.boss.hp / b.boss.maxHp
    : mode?.kind === 'holdout' ? b.elapsed / mode.seconds
      : mode?.kind === 'gold' ? b.goldPopped / mode.count
        : b.score / b.level.goal;
  return Math.max(0, Math.min(1, share));
}

/** Seconds left on a hold-out's or a blitz's clock, else null. */
export function timeLeft(level: LevelDef, elapsed: number): number | null {
  const mode = level.mode;
  return mode?.kind === 'holdout' || mode?.kind === 'blitz' ? Math.max(0, mode.seconds - elapsed) : null;
}
