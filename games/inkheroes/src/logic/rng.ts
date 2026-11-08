export type Rng = () => number;

/** Mulberry32: small, fast, seedable PRNG returning [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rangeOf(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/**
 * One step of Mulberry32 from a stored seed, for game state that must stay
 * plain data (saved, replayed): returns the draw and the seed to store next.
 */
export function roll(seed: number): { readonly value: number; readonly seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** A whole number in min..max (inclusive) from a stored seed. */
export function rollInt(seed: number, min: number, max: number): { readonly value: number; readonly seed: number } {
  const r = roll(seed);
  return { value: min + Math.floor(r.value * (max - min + 1)), seed: r.seed };
}
