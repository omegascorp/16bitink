import { sumIntel } from '../intel';
import type { HullFamily, Part } from '../parts';
import type { IntelBag } from '../workshop';
import type { Match } from './match';
import type { Tank } from './types';

/** A finished level, summed up for objectives, medals and the results screen. */
export interface MatchReport {
  readonly level: number;
  readonly passedMain: boolean;
  /** 'objective', 'destroyed', 'time', or the objective's fail ("the truck was destroyed"). */
  readonly reason: string;
  readonly playerAlive: boolean;
  readonly kills: number;
  readonly victims: Tank['victims'];
  readonly intel: IntelBag;
  readonly intelCount: number;
  readonly usedKit: boolean;
  /** The alarm went off at least once. */
  readonly alarm: boolean;
  readonly hullsUsed: readonly HullFamily[];
  readonly picks: readonly Part[];
  readonly time: number;
  readonly truckHpShare: number | null;
}

export function matchReport(m: Match): MatchReport {
  const p = m.player;
  if (!p) throw new Error('no player in this match');
  return {
    level: m.level.def.number,
    passedMain: m.over?.passed ?? false,
    reason: m.over?.reason ?? 'running',
    playerAlive: p.alive,
    kills: p.kills,
    victims: p.victims,
    intel: m.intel,
    intelCount: sumIntel(m.intel),
    usedKit: p.usedKit,
    alarm: m.alarm.firstAt !== null,
    hullsUsed: p.hullsUsed,
    picks: p.picks,
    time: m.over?.time ?? m.t,
    truckHpShare: m.objective.truckHpShare(),
  };
}
