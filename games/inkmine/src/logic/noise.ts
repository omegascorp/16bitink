/** Deterministic 0..1 noise for a lattice point (the same hash the ground renderer uses). */
export function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Smooth value noise in -1..1, with features about `scale` tiles across.
 * Given a `period`, it repeats every `period` tiles along x (its features
 * stretched a little to fit a whole number of times), so a world that wraps
 * meets itself without a seam.
 */
export function valueNoise(x: number, y: number, scale: number, salt: number, period?: number): number {
  const cells = period ? Math.max(1, Math.round(period / scale)) : 0;
  const fx = cells ? x / (period! / cells) : x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const col = (c: number): number => (cells ? c - cells * Math.floor(c / cells) : c);
  const [a, b] = [col(x0), col(x0 + 1)];
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const top = hash(a, y0, salt) + (hash(b, y0, salt) - hash(a, y0, salt)) * tx;
  const bottom = hash(a, y0 + 1, salt) + (hash(b, y0 + 1, salt) - hash(a, y0 + 1, salt)) * tx;
  return (top + (bottom - top) * ty) * 2 - 1;
}
