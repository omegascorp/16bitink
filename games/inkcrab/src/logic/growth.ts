/**
 * Growth with a shell cap. The meter fills towards the next size; once the
 * crab has grown to fill its shell it stops growing, and anything more it
 * eats is wasted until it moves into a bigger shell, where it grows on from
 * where it was by eating again.
 */
export interface Growth {
  readonly size: number;
  readonly meter: number;
}

export interface FeedResult {
  readonly growth: Growth;
  /** Sizes gained. */
  readonly grew: number;
  /** Points eaten with no room to grow into: the shell was full. */
  readonly wasted: number;
}

/** Largest body a shell can hold; beyond it is the final molt. */
export const MAX_SIZE = 8;

export function initialGrowth(size = 1): Growth {
  return { size, meter: 0 };
}

/** Food points from `size` to `size + 1`. */
export function meterGoal(size: number): number {
  // Cheap at first so early levels move, steeper later: 7, 10, 14, 19, 25, 32, 40.
  return 5 + 2 * size + (size * (size - 1)) / 2;
}

/** Whether the crab has grown to fill its shell (a body `cap` big): it grows no more until it moves up. */
export function isCapped(g: Growth, cap: number): boolean {
  return g.size >= Math.min(cap, MAX_SIZE);
}

export function feed(g: Growth, points: number, cap: number): FeedResult {
  const limit = Math.min(cap, MAX_SIZE);
  let { size, meter } = g;
  let grew = 0;
  let left = Math.max(0, points);
  while (left > 0 && size < limit) {
    const goal = meterGoal(size);
    const take = Math.min(goal - meter, left);
    meter += take;
    left -= take;
    if (meter >= goal) {
      size += 1;
      meter = 0;
      grew += 1;
    }
  }
  return { growth: { size, meter }, grew, wasted: left };
}
