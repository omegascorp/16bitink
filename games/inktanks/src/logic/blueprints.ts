import { familyName, FAMILIES, slotOf, type Family } from './parts';
import { RANKS, perksOf, type RankId } from './rank';
import { type ResearchLine } from './stats';
import { LINES_BY_SLOT, MK_COST, researchCost, UNLOCK_COST, type Progress } from './workshop';

/**
 * Blueprints are the player-facing name of intel (code keeps `intel`).
 * Helpers for the "upgrade ready" badge and line: which workshop upgrades
 * you can pay for right now, and which became payable during a mission.
 */
export interface Upgrade {
  readonly kind: 'unlock' | 'mk' | 'research';
  readonly family: Family;
  /** The Mk reached (kind mk) or the research line. */
  readonly mk?: 2 | 3;
  readonly line?: ResearchLine;
  readonly cost: number;
  /** Stable identity, to compare before and after a mission. */
  readonly key: string;
  /** "Cannon Mk II", "Unlock Rockets", "Cannon Damage". */
  readonly label: string;
}

const LINE_NAMES: Readonly<Record<ResearchLine, string>> = { damage: 'Damage', reload: 'Reload', armour: 'Armour', hp: 'HP', speed: 'Speed', grip: 'Grip' };

/** Every upgrade you can buy now: enough blueprints of that part, and the rank for a Mk. */
export function affordableUpgrades(p: Progress, rank: RankId = rankIdOf(p.xp)): readonly Upgrade[] {
  const maxMk = perksOf(RANKS.find((r) => r.id === rank)?.xp ?? p.xp).maxMk;
  const out: Upgrade[] = [];
  for (const f of FAMILIES) {
    const have = p.intel[f] ?? 0;
    const name = familyName(f);
    if (!p.unlocked.includes(f)) {
      if (have >= UNLOCK_COST) out.push({ kind: 'unlock', family: f, cost: UNLOCK_COST, key: `unlock:${f}`, label: `Unlock ${name}` });
      continue;
    }
    const mk = p.mk[f] ?? 1;
    if (mk < 3) {
      const next = (mk + 1) as 2 | 3;
      if (maxMk >= next && have >= MK_COST[next]) out.push({ kind: 'mk', family: f, mk: next, cost: MK_COST[next], key: `mk:${f}:${next}`, label: `${name} Mk ${'I'.repeat(next)}` });
    }
    for (const line of LINES_BY_SLOT[slotOf(f)] as readonly ResearchLine[]) {
      const cost = researchCost(p, f, line);
      if (cost !== null && have >= cost) out.push({ kind: 'research', family: f, line, cost, key: `research:${f}:${line}:${cost}`, label: `${name} ${LINE_NAMES[line]}` });
    }
  }
  return out;
}

const rankIdOf = (xp: number): RankId => [...RANKS].reverse().find((r) => xp >= r.xp)!.id;

/** What became affordable between two states (a mission's gains). */
export function newlyAffordable(before: Progress, after: Progress): readonly Upgrade[] {
  const had = new Set(affordableUpgrades(before).map((u) => u.key));
  return affordableUpgrades(after).filter((u) => !had.has(u.key));
}
