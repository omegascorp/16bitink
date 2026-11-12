/**
 * A small seeded random source (mulberry32). Every random choice in the
 * logic goes through one of these, so a seed replays a match exactly.
 */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [0, n). */
  int(n: number): number;
  /** A float in [a, b). */
  range(a: number, b: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** A pick weighted by `weight` (non-negative). */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** A new independent source, derived from this one's seed and a salt. */
  fork(salt: number): Rng;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const rng: Rng = {
    next,
    int: (n) => Math.floor(next() * n),
    range: (a, b) => a + next() * (b - a),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from an empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    weighted: (items, weight) => {
      if (items.length === 0) throw new Error('weighted pick from an empty list');
      const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
      if (total <= 0) return items[Math.floor(next() * items.length)]!;
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r < 0) return it;
      }
      return items[items.length - 1]!;
    },
    fork: (salt) => createRng((seed * 31 + salt * 2654435761) >>> 0),
  };
  return rng;
}
