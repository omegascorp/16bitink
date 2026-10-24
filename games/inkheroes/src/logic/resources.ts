/** The seven resources, in the order the purse shows them. */
export const RESOURCES = ['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Purse = Readonly<Record<Resource, number>>;
/** A cost or a gain: only the resources it involves. */
export type Amount = Partial<Purse>;

export const EMPTY_PURSE: Purse = { gold: 0, wood: 0, ore: 0, mercury: 0, sulfur: 0, crystal: 0, gems: 0 };
export const RARE: readonly Resource[] = ['mercury', 'sulfur', 'crystal', 'gems'];

export const purse = (a: Amount): Purse => ({ ...EMPTY_PURSE, ...a });

export function addTo(p: Purse, a: Amount, times = 1): Purse {
  return Object.fromEntries(RESOURCES.map((r) => [r, p[r] + (a[r] ?? 0) * times])) as Purse;
}

export function canAfford(p: Purse, cost: Amount, times = 1): boolean {
  return RESOURCES.every((r) => p[r] >= (cost[r] ?? 0) * times);
}

/** Pays `cost` × times; throws if the purse can't (callers check canAfford first). */
export function pay(p: Purse, cost: Amount, times = 1): Purse {
  if (!canAfford(p, cost, times)) throw new Error('cannot afford');
  return addTo(p, cost, -times);
}

/** How many of something costing `cost` the purse can buy. */
export function affordable(p: Purse, cost: Amount): number {
  const limits = RESOURCES.filter((r) => (cost[r] ?? 0) > 0).map((r) => Math.floor(p[r] / cost[r]!));
  return limits.length === 0 ? Infinity : Math.min(...limits);
}

/** "2500 gold, 5 ore" */
export function describeAmount(a: Amount): string {
  return RESOURCES.filter((r) => (a[r] ?? 0) !== 0).map((r) => `${a[r]} ${r}`).join(', ');
}
