import { Match, type MatchConfig } from '../logic/match/match';
import { matchReport, type MatchReport } from '../logic/match/report';
import type { Tank } from '../logic/match/types';
import type { LandDef } from '../logic/land';
import type { MissionDef } from '../logic/mission/types';
import type { Loadout } from '../logic/parts';
import type { Research } from '../logic/stats';

/** One headless run of a mission, with what the sim prints. */
export interface RunResult {
  readonly report: MatchReport | null;
  readonly passed: boolean;
  readonly time: number;
  readonly reason: string;
  /** Every tank at the end: its final parts, and what it swapped in. */
  readonly tanks: readonly Pick<Tank, 'name' | 'role' | 'isPlayer' | 'kills' | 'placement' | 'alive' | 'loadout' | 'picks' | 'shotsFired' | 'shotsHit' | 'stormDamage'>[];
  readonly flowBuilds: number;
  readonly ms: number;
}

export interface RunOptions {
  readonly land: LandDef;
  readonly mission: MissionDef;
  readonly seed: number;
  /** null: bots only. */
  readonly player: { readonly loadout: Loadout; readonly research?: Research; readonly kits?: number } | null;
  readonly dt?: number;
  readonly maxTime?: number;
}

export function runMission(o: RunOptions): RunResult {
  const cfg: MatchConfig = { land: o.land, mission: o.mission, seed: o.seed, player: o.player, playerBot: true };
  const t0 = performance.now();
  const m = new Match(cfg);
  const dt = o.dt ?? 1 / 30;
  const max = o.maxTime ?? 900;
  while (!m.over && m.t < max) {
    m.step(dt);
    m.events.length = 0;
  }
  return {
    report: m.player ? matchReport(m) : null,
    passed: m.over?.passed ?? false,
    time: m.t,
    reason: m.over?.reason ?? 'timeout',
    tanks: m.tanks.map((t) => ({ name: t.name, role: t.role, isPlayer: t.isPlayer, kills: t.kills, placement: t.alive ? 1 : t.placement, alive: t.alive, loadout: t.loadout, picks: t.picks, shotsFired: t.shotsFired, shotsHit: t.shotsHit, stormDamage: t.stormDamage })),
    flowBuilds: m.flow.builds,
    ms: performance.now() - t0,
  };
}
