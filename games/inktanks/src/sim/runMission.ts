import { Match } from '../logic/match/match';
import { matchReport, type MatchReport } from '../logic/match/report';
import type { Tank } from '../logic/match/types';
import type { LoadedLevel } from '../logic/level/load';
import type { Loadout } from '../logic/parts';
import type { Research } from '../logic/stats';

/** One headless run of a level, with what the lab prints. */
export interface RunResult {
  readonly report: MatchReport | null;
  readonly passed: boolean;
  readonly time: number;
  readonly reason: string;
  /** Every tank at the end: its final parts, and what it swapped in. */
  readonly tanks: readonly Pick<Tank, 'name' | 'role' | 'team' | 'isPlayer' | 'kills' | 'alive' | 'escaped' | 'loadout' | 'picks' | 'shotsFired' | 'shotsHit' | 'hp'>[];
  readonly playerHp: number;
  readonly flowBuilds: number;
  readonly ms: number;
}

export interface RunOptions {
  readonly level: LoadedLevel;
  readonly seed: number;
  /** null: no player. */
  readonly player: { readonly loadout: Loadout; readonly research?: Research; readonly kits?: number } | null;
  readonly dt?: number;
}

export function runMission(o: RunOptions): RunResult {
  const t0 = performance.now();
  const m = new Match({ level: o.level, seed: o.seed, player: o.player, playerBot: true });
  const dt = o.dt ?? 1 / 30;
  while (!m.over) {
    m.step(dt);
    m.events.length = 0;
  }
  return {
    report: m.player ? matchReport(m) : null,
    passed: m.over!.passed,
    time: m.t,
    reason: m.over!.reason,
    tanks: m.tanks.map((t) => ({ name: t.name, role: t.role, team: t.team, isPlayer: t.isPlayer, kills: t.kills, alive: t.alive, escaped: t.escaped, loadout: t.loadout, picks: t.picks, shotsFired: t.shotsFired, shotsHit: t.shotsHit, hp: t.hp })),
    playerHp: m.player ? Math.max(0, m.player.hp) / m.player.stats.maxHp : 0,
    flowBuilds: m.flow.builds,
    ms: performance.now() - t0,
  };
}
