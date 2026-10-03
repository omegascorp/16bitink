import { giantName, SPECIES_INFO } from '../levels/species';
import type { LevelDef } from '../levels/types';

/** Everything the goals care about, gathered by the game scene. */
export interface ObjectiveProgress {
  readonly seconds: number;
  /** Reached the final growth tier. */
  readonly grown: boolean;
  readonly collected: number;
  readonly bounties: number;
  readonly bossEaten: boolean;
}

export const initialProgress: ObjectiveProgress = { seconds: 0, grown: false, collected: 0, bounties: 0, bossEaten: false };

export type Outcome = 'playing' | 'won' | 'lost';

/** Seconds left on the level's clock, or null if untimed. */
export function timeLeft(level: LevelDef, p: ObjectiveProgress): number | null {
  const limit = level.modifiers.timeLimit;
  return limit === undefined ? null : Math.max(0, Math.ceil(limit - p.seconds));
}

/** The twist's own task, on top of growing. */
function taskDone(level: LevelDef, p: ObjectiveProgress): boolean {
  const o = level.objective;
  switch (o.kind) {
    case 'collect': return p.collected >= o.count;
    case 'bounty': return p.bounties >= o.count;
    case 'boss': return p.bossEaten;
    default: return true;
  }
}

/** Growing to full size is always part of the goal: it's the heart of the game. */
function goalMet(level: LevelDef, p: ObjectiveProgress): boolean {
  return p.grown && taskDone(level, p);
}

export function objectiveOutcome(level: LevelDef, p: ObjectiveProgress): Outcome {
  if (goalMet(level, p)) return 'won';
  return level.modifiers.timeLimit !== undefined && p.seconds >= level.modifiers.timeLimit ? 'lost' : 'playing';
}

const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The HUD's goal line; `urgent` turns it red when time is nearly up. */
export function objectiveLine(level: LevelDef, p: ObjectiveProgress): { readonly text: string; readonly urgent: boolean } {
  const o = level.objective;
  const left = timeLeft(level, p);
  const urgent = left !== null && left <= 10;
  // Task finished but still growing: point the player back at the growth bar.
  const grow = 'Now grow to full size!';
  switch (o.kind) {
    case 'collect': return { text: withClock(taskDone(level, p) ? grow : `Ink bottles ${p.collected}/${o.count}`, left), urgent };
    case 'bounty': return { text: withClock(taskDone(level, p) ? grow : `Marked ${SPECIES_INFO[o.species].name} ${p.bounties}/${o.count}`, left), urgent };
    case 'boss': return { text: p.grown ? `Now eat the ${giantName(o.species)}!` : `Grow, then eat the ${giantName(o.species)}`, urgent: p.grown };
    default: return { text: withClock(left === null ? '' : 'Grow to full size', left), urgent };
  }
}

function withClock(text: string, left: number | null): string {
  if (left === null) return text;
  return text ? `${text}, ${clock(left)} left` : `${clock(left)} left`;
}
