import { sumIntel } from '../intel';
import type { HullFamily, Part } from '../parts';
import type { IntelBag } from '../workshop';
import type { Match } from './match';
import type { Tank } from './types';

/** A finished match, summed up for objectives, medals and the results screen. */
export interface MatchReport {
  readonly level: number;
  readonly passedMain: boolean;
  readonly reason: string;
  readonly placement: number;
  readonly tanks: number;
  readonly won: boolean;
  readonly playerAlive: boolean;
  readonly kills: number;
  readonly victims: Tank['victims'];
  readonly intel: IntelBag;
  readonly intelCount: number;
  readonly usedKit: boolean;
  readonly stormDamage: number;
  readonly hullsUsed: readonly HullFamily[];
  readonly picks: readonly Part[];
  readonly time: number;
  readonly truckHpShare: number | null;
}

export function matchReport(m: Match): MatchReport {
  const p = m.player;
  if (!p) throw new Error('no player in this match');
  const truck = m.objective.truckId !== null ? m.tank(m.objective.truckId)! : null;
  const tanks = m.tanks.filter((t) => t.role === 'tank').length;
  return {
    level: m.cfg.mission.level,
    passedMain: m.over?.passed ?? false,
    reason: m.over?.reason ?? 'running',
    placement: p.alive ? m.aliveTanks() : p.placement,
    tanks,
    won: p.alive && m.aliveTanks() === 1,
    playerAlive: p.alive,
    kills: p.kills,
    victims: p.victims,
    intel: m.intel,
    intelCount: sumIntel(m.intel),
    usedKit: p.usedKit,
    stormDamage: p.stormDamage,
    hullsUsed: p.hullsUsed,
    picks: p.picks,
    time: m.over?.time ?? m.t,
    truckHpShare: truck ? Math.max(0, truck.hp) / truck.stats.maxHp : null,
  };
}
