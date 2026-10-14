import { recipeOf } from './blueprints';
import { addHold, countOf, EMPTY_HOLD, holdValue, type Hold } from './hold';
import { ORES, type OreKey } from './ore';

/**
 * A level's mission and contracts (spec, "Missions and contracts"). The
 * mission is the level's goal: done and lifted off, the level is won. Its
 * goals count once banked at the lander. Contracts are optional side jobs
 * for other clients; each pays once, ever, and all pay only on a won lift-off.
 */
export type ItemKind = 'core' | 'probe' | 'fossil' | 'blueprint';

export type Goal =
  /** Bank so many of one ore (a haul) or of the planet's signature material (a hunt). The guild takes them. */
  | { readonly kind: 'ore'; readonly ore: OreKey; readonly count: number }
  /** Bank ore worth so many credits at the guild rate. */
  | { readonly kind: 'credits'; readonly credits: number }
  /** Drill out the core sample from a marked depth and bank it. */
  | { readonly kind: 'core'; readonly depth: number }
  /** Find a lost thing and bank it. */
  | { readonly kind: 'salvage'; readonly item: 'probe' };

export interface MissionDef {
  readonly goals: readonly Goal[];
  /** Credits the guild pays on a won lift-off. */
  readonly fee: number;
  /** A blueprint handed over with the fee. */
  readonly blueprint?: string;
}

export type ContractDef =
  /** Bank so many of an ore for a client, who takes them. */
  | { readonly kind: 'order'; readonly ore: OreKey; readonly count: number; readonly pay: number }
  /** Bring back the fossil hidden on the map. */
  | { readonly kind: 'specimen'; readonly pay: number }
  /** Reach a depth. */
  | { readonly kind: 'deep'; readonly depth: number; readonly pay: number }
  /** Lose no hearts. */
  | { readonly kind: 'clean'; readonly pay: number }
  /** Set off none of the old charges. */
  | { readonly kind: 'careful'; readonly pay: number }
  /** Lift off within so many seconds. */
  | { readonly kind: 'rush'; readonly seconds: number; readonly pay: number };

export type ContractKind = ContractDef['kind'];

/** What a landing has done so far: the sim's tally, read by the mission. */
export interface Tally {
  /** Ore banked this landing (before anything is taken or sold). */
  readonly banked: Hold;
  /** Mission items banked, by kind. */
  readonly items: readonly ItemKind[];
  /** Deepest the prospector has been, metres. */
  readonly deepest: number;
  readonly heartsLost: number;
  /** Old charges (not firedamp) that went off. */
  readonly charges: number;
  readonly time: number;
}

export const EMPTY_TALLY: Tally = { banked: EMPTY_HOLD, items: [], deepest: 0, heartsLost: 0, charges: 0, time: 0 };

export function goalDone(g: Goal, t: Tally): boolean {
  switch (g.kind) {
    case 'ore': return countOf(t.banked, g.ore) >= g.count;
    case 'credits': return holdValue(t.banked) >= g.credits;
    case 'core': return t.items.includes('core');
    case 'salvage': return t.items.includes(g.item);
  }
}

export function missionDone(m: MissionDef, t: Tally): boolean {
  return m.goals.every((g) => goalDone(g, t));
}

/**
 * Whether a contract is met. Those about how the landing went (no hearts
 * lost, no charges fired, quick) can only be judged at lift-off, so they
 * count as met until something breaks them: `final` says it's lift-off now.
 */
export function contractDone(c: ContractDef, t: Tally, final: boolean): boolean {
  switch (c.kind) {
    case 'order': return countOf(t.banked, c.ore) >= c.count;
    case 'specimen': return t.items.includes('fossil');
    case 'deep': return t.deepest >= c.depth;
    case 'clean': return t.heartsLost === 0 && final;
    case 'careful': return t.charges === 0 && final;
    case 'rush': return t.time <= c.seconds && final;
  }
}

/** Whether a contract can still be met this landing. */
export function contractBroken(c: ContractDef, t: Tally): boolean {
  switch (c.kind) {
    case 'clean': return t.heartsLost > 0;
    case 'careful': return t.charges > 0;
    case 'rush': return t.time > c.seconds;
    default: return false;
  }
}

/**
 * Ore the guild and the clients take: the mission's ore goals and done
 * orders, except orders paid on an earlier landing (a client who's had
 * their ore doesn't take it again). Taken ore is paid for, not sold.
 */
export function oreTaken(m: MissionDef, contracts: readonly ContractDef[], t: Tally, paidBefore: readonly ContractKind[] = []): Hold {
  const goals = m.goals.flatMap((g) => (g.kind === 'ore' ? [{ [g.ore]: g.count } as Hold] : []));
  const orders = contracts.flatMap((c) => (c.kind === 'order' && !paidBefore.includes(c.kind) && contractDone(c, t, true) ? [{ [c.ore]: c.count } as Hold] : []));
  return [...goals, ...orders].reduce(addHold, EMPTY_HOLD);
}

const oreName = (ore: OreKey): string => ORES[ore].name;

export function goalText(g: Goal): string {
  switch (g.kind) {
    case 'ore': return `bank ${g.count} ${oreName(g.ore)}`;
    case 'credits': return `bank ore worth ${g.credits} credits`;
    case 'core': return `drill the core at ${g.depth} m and bring it up`;
    case 'salvage': return 'find the lost survey probe and bring it up';
  }
}

/** The HUD's line for one goal: what's left. */
export function goalLine(g: Goal, t: Tally): string {
  switch (g.kind) {
    case 'ore': return `${oreName(g.ore)} ${Math.min(countOf(t.banked, g.ore), g.count)}/${g.count}`;
    case 'credits': return `haul ${Math.min(holdValue(t.banked), g.credits)}/${g.credits} credits`;
    case 'core': return t.items.includes('core') ? 'core banked' : `core at ${g.depth} m`;
    case 'salvage': return t.items.includes(g.item) ? 'probe banked' : 'find the probe';
  }
}

export function contractText(c: ContractDef): string {
  switch (c.kind) {
    case 'order': return `Order: bank ${c.count} ${oreName(c.ore)}`;
    case 'specimen': return 'Specimen: bring back the fossil';
    case 'deep': return `Deep record: reach ${c.depth} m`;
    case 'clean': return 'Clean job: lose no hearts';
    case 'careful': return 'Careful hands: set off none of the old charges';
    case 'rush': return `Rush: lift off within ${Math.floor(c.seconds / 60)}:${String(c.seconds % 60).padStart(2, '0')}`;
  }
}

/** The mission's reward line, naming the blueprint and what building it takes. */
export function rewardText(m: MissionDef): string {
  const r = m.blueprint ? recipeOf(m.blueprint) : undefined;
  if (!r) return `${m.fee} credits`;
  const needs = Object.entries(r.materials).map(([ore, n]) => `${n} ${oreName(ore as OreKey)}`).join(', ');
  return `${m.fee} credits + the ${r.piece} Mk ${r.mk} blueprint (needs ${needs})`;
}

/** Ink blots: one for the mission, one for each contract met. */
export function blotsFor(won: boolean, contractsMet: number): number {
  return won ? 1 + contractsMet : 0;
}
