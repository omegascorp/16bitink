import { familyName, FAMILIES, slotOf, type Family, type Loadout, type Mk, type Part } from './parts';
import { perksOf, rankOf, RANKS, type RankId } from './rank';
import { RESEARCH_MAX, researchSteps, type Research, type ResearchLine } from './stats';

/**
 * The player's lasting progress, and the workshop's actions on it. Every
 * action returns a new Progress (or a reason it can't be done); nothing is
 * changed in place.
 */
export type IntelBag = Readonly<Partial<Record<Family, number>>>;

export interface Progress {
  /** Unspent intel per family. */
  readonly intel: IntelBag;
  /** All intel ever collected per family (only goes up). */
  readonly intelTotal: IntelBag;
  readonly unlocked: readonly Family[];
  /** The Mk your starting tank fits per unlocked family. */
  readonly mk: Readonly<Partial<Record<Family, Mk>>>;
  readonly research: Research;
  readonly xp: number;
  /** Medals per level: main, bonus 1, bonus 2. */
  readonly medals: Readonly<Record<number, readonly [boolean, boolean, boolean]>>;
  readonly loadout: Loadout;
}

export const UNLOCK_COST = 3;
export const MK_COST: Readonly<Record<2 | 3, number>> = { 2: 8, 3: 20 };
export const MK_RANK: Readonly<Record<2 | 3, RankId>> = { 2: 'sergeant', 3: 'lieutenant' };
export const RESEARCH_COST: readonly number[] = [5, 10, 15];

export const LINES_BY_SLOT = {
  gun: ['damage', 'reload'],
  hull: ['armour', 'hp'],
  drive: ['speed', 'grip'],
} as const satisfies Record<string, readonly ResearchLine[]>;

export const STARTER_FAMILIES: readonly Family[] = ['machinegun', 'light', 'wheels'];

export function newProgress(): Progress {
  return {
    intel: {},
    intelTotal: {},
    unlocked: STARTER_FAMILIES,
    mk: { machinegun: 1, light: 1, wheels: 1 },
    research: {},
    xp: 0,
    medals: {},
    loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
  };
}

export type Result = { ok: true; progress: Progress } | { ok: false; reason: string };

/** "Cannon blueprints": the player-facing name of intel is Blueprints, and they are per part family. */
const blueprintsOf = (f: Family): string => `${familyName(f)} blueprints`;
const fail = (reason: string): Result => ({ ok: false, reason });
const have = (p: Progress, f: Family): number => p.intel[f] ?? 0;
const spend = (bag: IntelBag, f: Family, n: number): IntelBag => ({ ...bag, [f]: (bag[f] ?? 0) - n });

export function addIntel(p: Progress, gained: IntelBag): Progress {
  const intel: Partial<Record<Family, number>> = { ...p.intel };
  const intelTotal: Partial<Record<Family, number>> = { ...p.intelTotal };
  for (const f of FAMILIES) {
    const n = gained[f] ?? 0;
    if (n <= 0) continue;
    intel[f] = (intel[f] ?? 0) + n;
    intelTotal[f] = (intelTotal[f] ?? 0) + n;
  }
  return { ...p, intel, intelTotal };
}

export function unlock(p: Progress, f: Family): Result {
  if (p.unlocked.includes(f)) return fail('already unlocked');
  if (have(p, f) < UNLOCK_COST) return fail(`needs ${UNLOCK_COST} ${blueprintsOf(f)}`);
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, UNLOCK_COST), unlocked: [...p.unlocked, f], mk: { ...p.mk, [f]: 1 } } };
}

export function raiseMk(p: Progress, f: Family): Result {
  if (!p.unlocked.includes(f)) return fail('not unlocked');
  const cur = p.mk[f] ?? 1;
  if (cur >= 3) return fail('already Mk III');
  const next = (cur + 1) as 2 | 3;
  if (perksOf(p.xp).maxMk < next) return fail(`needs ${RANKS.find((r) => r.id === MK_RANK[next])?.name ?? MK_RANK[next]}`);
  if (have(p, f) < MK_COST[next]) return fail(`needs ${MK_COST[next]} ${blueprintsOf(f)}`);
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, MK_COST[next]), mk: { ...p.mk, [f]: next } } };
}

export function researchCost(p: Progress, f: Family, line: ResearchLine): number | null {
  const done = researchSteps(p.research, f, line);
  return done >= RESEARCH_MAX ? null : RESEARCH_COST[done]!;
}

export function research(p: Progress, f: Family, line: ResearchLine): Result {
  if (!p.unlocked.includes(f)) return fail('not unlocked');
  const lines: readonly ResearchLine[] = LINES_BY_SLOT[slotOf(f)];
  if (!lines.includes(line)) return fail(`${f} has no ${line} line`);
  const cost = researchCost(p, f, line);
  if (cost === null) return fail('line finished');
  if (have(p, f) < cost) return fail(`needs ${cost} ${blueprintsOf(f)}`);
  const prev = p.research[f] ?? {};
  const steps = researchSteps(p.research, f, line) + 1;
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, cost), research: { ...p.research, [f]: { ...prev, [line]: steps } } } };
}

/** Whether a part can be fitted to the starting tank. */
export function canFit(p: Progress, part: Part): boolean {
  return p.unlocked.includes(part.family) && part.mk <= (p.mk[part.family] ?? 0) && !part.proto;
}

export function fit(p: Progress, loadout: Loadout): Result {
  for (const slot of ['gun', 'hull', 'drive'] as const) {
    const part = loadout[slot];
    if (slotOf(part.family) !== slot) return fail(`${part.family} is not a ${slot}`);
    if (!canFit(p, part)) return fail(`${part.family} Mk ${part.mk} not owned`);
  }
  return { ok: true, progress: { ...p, loadout } };
}

/** The best Mk you own of a family as a part, or null if locked. */
export function ownedPart(p: Progress, f: Family): Part | null {
  return p.unlocked.includes(f) ? { family: f, mk: p.mk[f] ?? 1 } : null;
}

export function rankName(p: Progress): string {
  return rankOf(p.xp).name;
}
