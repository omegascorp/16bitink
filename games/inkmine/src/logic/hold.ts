import { ORES, oreById, type OreKey } from './ore';

/**
 * Ore counts by kind: the ship's hold, a landing's haul, a recipe's
 * materials. Every change returns a new count; zero entries are dropped.
 */
export type Hold = Readonly<Partial<Record<OreKey, number>>>;

export const EMPTY_HOLD: Hold = {};

const tidy = (entries: [OreKey, number][]): Hold => Object.fromEntries(entries.filter(([, n]) => n > 0)) as Hold;
const entriesOf = (h: Hold): [OreKey, number][] => Object.entries(h) as [OreKey, number][];

export function countOf(h: Hold, ore: OreKey): number {
  return h[ore] ?? 0;
}

export function addHold(a: Hold, b: Hold): Hold {
  const out: Partial<Record<OreKey, number>> = { ...a };
  for (const [ore, n] of entriesOf(b)) out[ore] = (out[ore] ?? 0) + n;
  return tidy(entriesOf(out));
}

/** Whether `h` holds at least `need` of everything. */
export function holds(h: Hold, need: Hold): boolean {
  return entriesOf(need).every(([ore, n]) => countOf(h, ore) >= n);
}

/** Takes up to `take` of each ore out of `h` (never below zero). */
export function takeHold(h: Hold, take: Hold): Hold {
  return tidy(entriesOf(h).map(([ore, n]) => [ore, n - Math.min(n, countOf(take, ore))]));
}

/** The smaller count of each ore: what of `want` `h` can actually cover. */
export function capHold(want: Hold, h: Hold): Hold {
  return tidy(entriesOf(want).map(([ore, n]) => [ore, Math.min(n, countOf(h, ore))]));
}

/** Sum of several holds. */
export function sumHolds(list: readonly Hold[]): Hold {
  return list.reduce(addHold, EMPTY_HOLD);
}

/** Ore ids (a bag) to counts. */
export function holdOfBag(bag: readonly number[]): Hold {
  const counts: Partial<Record<OreKey, number>> = {};
  for (const id of bag) {
    const ore = oreById(id);
    if (ore) counts[ore.key as OreKey] = (counts[ore.key as OreKey] ?? 0) + 1;
  }
  return counts;
}

/** What `h` sells for at base prices, times `rate` (the hopper's bonus), rounded down. */
export function holdValue(h: Hold, rate = 1): number {
  return Math.floor(entriesOf(h).reduce((sum, [ore, n]) => sum + ORES[ore].value * n, 0) * rate);
}

export function holdSize(h: Hold): number {
  return entriesOf(h).reduce((sum, [, n]) => sum + n, 0);
}

export function holdEntries(h: Hold): readonly (readonly [OreKey, number])[] {
  return entriesOf(h);
}
