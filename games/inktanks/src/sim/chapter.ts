import type { LoadedLevel } from '../logic/level/load';
import { applyOutcome, type Outcome } from '../logic/mission/outcome';
import { sumIntel } from '../logic/intel';
import { perksOf, rankOf } from '../logic/rank';
import { newProgress, type IntelBag, type Progress } from '../logic/workshop';
import { fitBest, noGrindCheck, spendIntel, type NoGrindVerdict } from './policy';
import { runMission } from './runMission';

export interface MissionRow {
  readonly level: number;
  readonly name: string;
  readonly attempts: number;
  /** Why each attempt ended. */
  readonly ends: readonly string[];
  readonly passed: boolean;
  readonly outcome: Outcome;
  readonly intel: IntelBag;
  readonly xp: number;
  readonly rank: string;
  readonly loadout: string;
  readonly time: number;
}

export interface ChapterResult {
  readonly rows: readonly MissionRow[];
  readonly progress: Progress;
  readonly verdict: NoGrindVerdict;
  readonly bonusShare: number;
}

/**
 * The whole-chapter no-grind check: the stand-in player plays each level
 * (retrying on a fail, as the game does, keeping intel either way), spends
 * intel in the workshop between levels, and refits its starting tank.
 */
export function runChapter(levels: readonly LoadedLevel[], seed: number, maxAttempts = 6): ChapterResult {
  let p = newProgress();
  const rows: MissionRow[] = [];
  for (const level of levels) {
    const def = level.def;
    const ends: string[] = [];
    let attempts = 0;
    let last: Outcome | null = null;
    let intel: IntelBag = {};
    let xp = 0;
    let time = 0;
    const loadout = `${p.loadout.gun.family}${p.loadout.gun.mk}/${p.loadout.hull.family}${p.loadout.hull.mk}/${p.loadout.drive.family}${p.loadout.drive.mk}`;
    while (attempts < maxAttempts) {
      attempts++;
      const r = runMission({ level, seed: seed * 1000 + def.number * 37 + attempts, player: { loadout: p.loadout, research: p.research, kits: perksOf(p.xp).repairKits } });
      if (!r.report) break;
      const applied = applyOutcome(p, def, r.report);
      p = applied.progress;
      last = applied.outcome;
      intel = Object.fromEntries(Object.entries(r.report.intel).map(([k, v]) => [k, (intel[k as keyof IntelBag] ?? 0) + (v ?? 0)]));
      xp += applied.outcome.xp;
      time += r.time;
      ends.push(r.reason);
      if (r.passed) break;
    }
    p = fitBest(spendIntel(p));
    rows.push({ level: def.number, name: def.name, attempts, ends, passed: last?.passed ?? false, outcome: last!, intel, xp, rank: rankOf(p.xp).name, loadout, time });
  }
  const medals = Object.values(p.medals);
  const bonusShare = medals.reduce((s, m) => s + (m[1] ? 1 : 0) + (m[2] ? 1 : 0), 0) / (2 * levels.length);
  return { rows, progress: p, verdict: noGrindCheck(p), bonusShare };
}

export function intelLine(bag: IntelBag): string {
  return `${sumIntel(bag)} (${Object.entries(bag).map(([k, v]) => `${k} ${v}`).join(', ')})`;
}
