import type { MatchReport } from '../match/report';
import { XP } from '../rank';
import { addIntel, type Progress } from '../workshop';
import { BONUSES } from './bonus';
import type { MissionDef } from './types';

export type Medals = readonly [boolean, boolean, boolean];

export interface Outcome {
  readonly passed: boolean;
  /** Objectives done this time. */
  readonly done: Medals;
  /** Medals after merging with the ones already held (medals only add up). */
  readonly medals: Medals;
  /** Medals earned for the first time. */
  readonly fresh: Medals;
  readonly firstWin: boolean;
  readonly xp: number;
}

export function outcome(def: MissionDef, r: MatchReport, prev: Medals | undefined): Outcome {
  const passed = r.passedMain;
  const done: Medals = [passed, passed && BONUSES[def.bonus[0]].test(r), passed && BONUSES[def.bonus[1]].test(r)];
  const old = prev ?? [false, false, false];
  const medals: Medals = [old[0] || done[0], old[1] || done[1], old[2] || done[2]];
  const fresh: Medals = [done[0] && !old[0], done[1] && !old[1], done[2] && !old[2]];
  const firstWin = fresh[0];
  // Objective XP once per medal; kills pay every time.
  const xp = (fresh[0] ? XP.main : 0) + (fresh[1] ? XP.bonus : 0) + (fresh[2] ? XP.bonus : 0) + r.kills * XP.kill + (firstWin ? XP.firstWin : 0);
  return { passed, done, medals, fresh, firstWin, xp };
}

/** Applies a played mission to progress: intel is kept win or lose, XP and medals only go up. */
export function applyOutcome(p: Progress, def: MissionDef, r: MatchReport): { progress: Progress; outcome: Outcome } {
  const o = outcome(def, r, p.medals[def.level]);
  const withIntel = addIntel(p, r.intel);
  return { progress: { ...withIntel, xp: withIntel.xp + o.xp, medals: { ...withIntel.medals, [def.level]: o.medals } }, outcome: o };
}
