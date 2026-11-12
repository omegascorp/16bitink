/**
 * Military ranks. Rank XP only goes up; it gates perks, never missions.
 * Thresholds are tuned with the whole-chapter sim (about 150–200 XP per
 * mission played once) so Corporal comes about mission 3, Sergeant about 6,
 * Staff Sergeant about 10 and Lieutenant about chapter 2 mission 5.
 */
export type RankId = 'private' | 'corporal' | 'sergeant' | 'staffSergeant' | 'lieutenant' | 'captain' | 'major' | 'colonel' | 'brigadier' | 'general';

export interface RankDef {
  readonly id: RankId;
  readonly name: string;
  readonly xp: number;
}

export const RANKS: readonly RankDef[] = [
  { id: 'private', name: 'Private', xp: 0 },
  { id: 'corporal', name: 'Corporal', xp: 400 },
  { id: 'sergeant', name: 'Sergeant', xp: 850 },
  { id: 'staffSergeant', name: 'Staff Sergeant', xp: 1450 },
  { id: 'lieutenant', name: 'Lieutenant', xp: 2300 },
  { id: 'captain', name: 'Captain', xp: 3400 },
  { id: 'major', name: 'Major', xp: 4800 },
  { id: 'colonel', name: 'Colonel', xp: 6500 },
  { id: 'brigadier', name: 'Brigadier', xp: 8500 },
  { id: 'general', name: 'General', xp: 10500 },
];

export const XP = {
  main: 100,
  bonus: 50,
  kill: 10,
  firstWin: 25,
} as const;

export function rankOf(xp: number): RankDef {
  let r = RANKS[0]!;
  for (const def of RANKS) if (xp >= def.xp) r = def;
  return r;
}

export function rankIndex(id: RankId): number {
  return RANKS.findIndex((r) => r.id === id);
}

export function atLeast(xp: number, id: RankId): boolean {
  return rankIndex(rankOf(xp).id) >= rankIndex(id);
}

/** XP still needed for the next rank, or null at the top. */
export function toNextRank(xp: number): { next: RankDef; need: number } | null {
  const next = RANKS.find((r) => r.xp > xp);
  return next ? { next, need: next.xp - xp } : null;
}

/** The perks a rank brings. */
export interface Perks {
  readonly repairKits: number;
  readonly maxMk: 1 | 2 | 3;
  readonly callIn: boolean;
  readonly kitSlot: boolean;
  /** Allied bot tanks (Captain one, Colonel two). */
  readonly wingmen: number;
  /** One artillery strike per mission (Major). */
  readonly strike: boolean;
  /** Ace prototypes can go in the workshop (Brigadier). */
  readonly protoParts: boolean;
}

export function perksOf(xp: number): Perks {
  return {
    repairKits: atLeast(xp, 'corporal') ? 2 : 1,
    maxMk: atLeast(xp, 'lieutenant') ? 3 : atLeast(xp, 'sergeant') ? 2 : 1,
    callIn: atLeast(xp, 'staffSergeant'),
    kitSlot: atLeast(xp, 'lieutenant'),
    wingmen: atLeast(xp, 'colonel') ? 2 : atLeast(xp, 'captain') ? 1 : 0,
    strike: atLeast(xp, 'major'),
    protoParts: atLeast(xp, 'brigadier'),
  };
}
