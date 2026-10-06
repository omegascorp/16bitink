/**
 * Growth with a shell cap. The meter fills towards the next size; at the
 * shell's maximum it stays full and every further meal is banked. Moving
 * into a bigger shell converts meter + bank at once (the grow burst).
 */
export interface Growth {
  readonly size: number;
  readonly meter: number;
  readonly bank: number;
}

export interface FeedResult {
  readonly growth: Growth;
  /** Sizes gained. */
  readonly grew: number;
  /** Points that went to the bank. */
  readonly banked: number;
}

/** Largest body a shell can hold; beyond it is the final molt. */
export const MAX_SIZE = 8;

export function initialGrowth(size = 1): Growth {
  return { size, meter: 0, bank: 0 };
}

/** Food points from `size` to `size + 1`. */
export function meterGoal(size: number): number {
  // Cheap at first so early levels move, steeper later: 7, 10, 14, 19, 25, 32, 40.
  return 5 + 2 * size + (size * (size - 1)) / 2;
}

export function isCapped(g: Growth, cap: number): boolean {
  return g.size >= Math.min(cap, MAX_SIZE) && g.meter >= meterGoal(g.size);
}

export function feed(g: Growth, points: number, cap: number): FeedResult {
  const limit = Math.min(cap, MAX_SIZE);
  let { size, meter, bank } = g;
  let grew = 0;
  let banked = 0;
  let left = Math.max(0, points);
  while (left > 0) {
    const goal = meterGoal(size);
    if (size >= limit && meter >= goal) {
      bank += left;
      banked += left;
      break;
    }
    const take = Math.min(goal - meter, left);
    meter += take;
    left -= take;
    if (meter >= goal && size < limit) {
      size += 1;
      meter = 0;
      grew += 1;
    }
  }
  return { growth: { size, meter, bank }, grew, banked };
}

/** The grow burst after a swap: meter and bank are fed again under the new cap. */
export function settle(g: Growth, cap: number): FeedResult {
  const r = feed({ size: g.size, meter: 0, bank: 0 }, g.meter + g.bank, cap);
  return { ...r, banked: r.growth.bank };
}
