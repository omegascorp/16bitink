import { createRng } from '../../../src/logic/rng';

/** Small value-noise kit for the baked rock and ridges: seeded, so every bake paints the same stone. */

const rng = createRng(4711);
const PERM = new Uint8Array(512);
const VAL = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  PERM[i] = i;
  VAL[i] = rng();
}
for (let i = 255; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  const s = PERM[i]!;
  PERM[i] = PERM[j]!;
  PERM[j] = s;
}
for (let i = 0; i < 256; i++) PERM[i + 256] = PERM[i]!;

const cell = (x: number, y: number): number => PERM[PERM[x & 255]! + (y & 255)]!;

export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = VAL[cell(xi, yi)]!;
  const b = VAL[cell(xi + 1, yi)]!;
  const c = VAL[cell(xi, yi + 1)]!;
  const d = VAL[cell(xi + 1, yi + 1)]!;
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f + i * 17.3, y * f - i * 9.1);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Sharp ridges where the noise crosses its middle: for eroded rock. */
export function ridged(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (1 - Math.abs(2 * vnoise(x * f + i * 5.7, y * f + i * 3.3) - 1));
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

/** Distance to the nearest cell wall of a jittered grid (0 on the wall): the rock's joints. */
export function jointDistance(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const c = cell(xi + i, yi + j);
      const px = xi + i + VAL[c]!;
      const py = yi + j + VAL[(c * 7 + 3) & 255]!;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return f2 - f1;
}

export const sstep = (a: number, b: number, x: number): number => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export type Rgb = readonly [number, number, number];
export const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c: Rgb): string => `rgb(${Math.min(255, Math.max(0, c[0])) | 0},${Math.min(255, Math.max(0, c[1])) | 0},${Math.min(255, Math.max(0, c[2])) | 0})`;
