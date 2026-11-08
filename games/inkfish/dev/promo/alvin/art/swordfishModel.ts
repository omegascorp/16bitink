import { hash } from './draw';
import type { Grid, V3 } from './mesh3d';

/**
 * The swordfish's shape: a deep muscular body lofted from sections, running
 * forward into a long flat sword (a broad blade, thick at the base, about a
 * third of the length), with fins as thin curved sheets: the tall stiff
 * crescent dorsal, the deep crescent tail, sickle pectorals. Own units: 100
 * long, the sword tip at x = +50, the tail tips near -58; y down, z sideways.
 */

export const TIP_X = 50;
export const EYE_X = 15.2;
const SIDE_U = 210;
const RING_V = 112;

/** x, top, bottom, half-width of the body at that station, nose to tail. */
const PROFILE: readonly (readonly [number, number, number, number])[] = [
  [50, -0.05, 0.05, 0.12], [48, -0.17, 0.15, 1], [44, -0.28, 0.25, 2.1], [38, -0.4, 0.35, 3], [32, -0.54, 0.48, 3.65], [26, -0.85, 0.72, 4.05], [22, -1.6, 1.1, 4.2],
  [19, -3.9, 2.3, 4.7], [16, -6, 3.9, 5.6], [12, -8.2, 5.9, 6.8], [7, -9.9, 7.8, 8], [1, -11.7, 9.8, 9.2], [-6, -12.2, 10.5, 9.5], [-14, -11.3, 9.9, 8.7],
  [-22, -9, 8, 6.8], [-30, -5.6, 5.2, 4.3], [-36, -2.9, 2.8, 2.3], [-39.5, -1.7, 1.7, 1.45], [-41.5, -1.25, 1.25, 1.05], [-42.6, -0.2, 0.2, 0.2],
];

function section(x: number): { readonly top: number; readonly bot: number; readonly w: number } {
  const i = Math.max(0, PROFILE.findIndex((r) => r[0] <= x) - 1);
  const pick = (n: number): readonly [number, number, number, number] => PROFILE[Math.max(0, Math.min(PROFILE.length - 1, n))]!;
  const [a, b, c, d] = [pick(i - 1), pick(i), pick(i + 1), pick(i + 2)];
  const u = (b[0] - x) / (b[0] - c[0] || 1);
  const cr = (k: 1 | 2 | 3): number => 0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
  return { top: Math.min(-0.03, cr(1)), bot: Math.max(0.03, cr(2)), w: Math.max(0.05, cr(3)) };
}

/** A point of the skin: `th` round the section (-PI/2 the back, PI/2 the belly, 0 and PI the two flanks). */
export function skinAt(x: number, th: number): V3 {
  const s = section(x);
  const [cy, ry] = [(s.top + s.bot) / 2, (s.bot - s.top) / 2];
  return { x, y: cy + ry * Math.sin(th), z: s.w * Math.cos(th) };
}

const smoothstep = (u: number): number => u * u * (3 - 2 * u);

function noise(x: number, y: number): number {
  const [ix, iy] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [smoothstep(x - ix), smoothstep(y - iy)];
  const at = (a: number, b: number): number => hash(a * 12.9 + b * 78.2);
  const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
  const low = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
  return top + (low - top) * fy;
}

type Rgb = readonly [number, number, number];
const SKIN: readonly (readonly [number, Rgb])[] = [
  [-1.1, [8, 14, 32]], [-0.62, [13, 26, 56]], [-0.3, [24, 52, 92]], [-0.06, [52, 94, 134]], [0.16, [128, 165, 188]], [0.42, [205, 220, 226]], [1.1, [247, 248, 243]],
];

function ramped(stops: readonly (readonly [number, Rgb])[], w: number): Rgb {
  const i = stops.findIndex((s) => s[0] >= w);
  if (i <= 0) return stops[i < 0 ? stops.length - 1 : 0]![1];
  const [a, b] = [stops[i - 1]!, stops[i]!];
  const u = (w - a[0]) / (b[0] - a[0]);
  return [0, 1, 2].map((c) => a[1][c]! + (b[1][c]! - a[1][c]!) * u) as unknown as Rgb;
}

/** Layered washes: the blue-black back into the silver belly over a brushy edge, darker saddles, long strokes. */
function skinColour(x: number, th: number): Rgb {
  const v = Math.sin(th);
  const blotch = noise(x * 0.17 + 3, th * 1.5 + 5) - 0.5;
  const stroke = noise(x * 0.045, th * 4.5) - 0.5;
  const c = ramped(SKIN, v + blotch * 0.38 + stroke * 0.3);
  const blade = Math.max(0, Math.min(1, (x - 21) / 6));
  const dusk = 0.94 + 0.12 * noise(x * 0.12, th * 1.6);
  // The blade is a plane, not a tube: one steel tone on top, a bright bevel along each edge, pale underneath.
  const bevel = Math.max(0, 1 - Math.abs(v) / 0.22);
  const flat: Rgb = v < 0 ? [38, 58, 86] : [176, 192, 204];
  const steel: Rgb = [flat[0] + (196 - flat[0]) * bevel, flat[1] + (214 - flat[1]) * bevel, flat[2] + (226 - flat[2]) * bevel];
  return [0, 1, 2].map((i) => (c[i]! + (steel[i]! - c[i]!) * blade) * dusk) as unknown as Rgb;
}

export function bodyGrid(): Grid {
  const at: V3[] = [];
  const rgb = new Float32Array((SIDE_U + 1) * (RING_V + 1) * 3);
  for (let u = 0; u <= SIDE_U; u++) {
    const x = TIP_X + (-42.6 - TIP_X) * (u / SIDE_U);
    for (let v = 0; v <= RING_V; v++) {
      const th = (v / RING_V) * Math.PI * 2;
      at.push(skinAt(x, th));
      rgb.set(skinColour(x, th), (at.length - 1) * 3);
    }
  }
  return { nu: SIDE_U, nv: RING_V, at, rgb, closed: true, gloss: 0.55 };
}

/** The grid's first column that's at or behind x. */
export const columnOf = (x: number): number => Math.max(0, Math.round(((TIP_X - x) / (TIP_X + 42.6)) * SIDE_U));

function along(pts: readonly V3[], u: number): V3 {
  const f = u * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const [a, b, c, d] = [pts[Math.max(0, i - 1)]!, pts[i]!, pts[i + 1]!, pts[Math.min(pts.length - 1, i + 2)]!];
  const t = f - i;
  const cr = (k: 'x' | 'y' | 'z'): number => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t);
  return { x: cr('x'), y: cr('y'), z: cr('z') };
}

export interface Fin {
  readonly grid: Grid;
  /** Moves the fin with the body before drawing (the tail swing). */
  readonly swing: boolean;
}

/** A fin between its leading and trailing edges: u root to tip, v front edge to back edge; dark at the root, inky at the tip. */
function fin(lead: readonly V3[], trail: readonly V3[], root: Rgb, tip: Rgb, swing = false): Fin {
  const [nu, nv] = [34, 16];
  const at: V3[] = [];
  const rgb = new Float32Array((nu + 1) * (nv + 1) * 3);
  for (let u = 0; u <= nu; u++) {
    const [a, b] = [along(lead, u / nu), along(trail, u / nu)];
    for (let v = 0; v <= nv; v++) {
      const w = v / nv;
      at.push({ x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z: a.z + (b.z - a.z) * w });
      const streak = 0.84 + 0.3 * noise(v * 1.1, u * 0.12 + 4);
      const mixed = [0, 1, 2].map((c) => (root[c]! + (tip[c]! - root[c]!) * (u / nu)) * streak) as unknown as Rgb;
      rgb.set(mixed, (at.length - 1) * 3);
    }
  }
  return { grid: { nu, nv, at, rgb, closed: false, gloss: 0.14 }, swing };
}

const v3 = (x: number, y: number, z = 0): V3 => ({ x, y, z });

const DARK: Rgb = [14, 30, 60];
const INKY: Rgb = [34, 66, 104];

export const DORSAL = fin([v3(14, -8.2), v3(9.4, -14), v3(3.8, -19.6), v3(-2.8, -25), v3(-9.6, -30)], [v3(-13, -9.6), v3(-8.2, -14), v3(-6, -18.8), v3(-6.4, -24.6), v3(-9.6, -30)], DARK, INKY);
const upperTail: V3[] = [v3(-39, -1.4), v3(-44.5, -8), v3(-50, -16.5), v3(-54.5, -24), v3(-60, -32)];
const upperBack: V3[] = [v3(-42.6, 0), v3(-46.6, -3.4), v3(-50.4, -9.6), v3(-54, -19), v3(-60, -32)];
export const TAIL = [fin(upperTail, upperBack, DARK, INKY, true), fin(upperTail.map((p) => v3(p.x, -p.y * 0.94)), upperBack.map((p) => v3(p.x, -p.y * 0.94)), DARK, INKY, true)];
export const SMALL_FINS = [
  fin([v3(-29, -5.6), v3(-31.4, -8.6), v3(-34.6, -10.4)], [v3(-33.6, -3.4), v3(-34, -6.6), v3(-34.6, -10.4)], DARK, INKY),
  fin([v3(-22, 7.8), v3(-25.4, 12.4), v3(-29.6, 15)], [v3(-29, 5.2), v3(-29.4, 10), v3(-29.6, 15)], [150, 172, 186], [40, 74, 112]),
];

/** The sickle pectoral on one side (z sign): silver at the root, dark at the tip. */
export function pectoral(side: 1 | -1): Fin {
  const z = (n: number): number => n * side;
  return fin(
    [v3(11.5, 6, z(5.6)), v3(6.5, 11.5, z(8.8)), v3(-1, 17, z(11.6)), v3(-10, 22.4, z(13.8)), v3(-18.5, 27, z(15.4))],
    [v3(3.4, 7.8, z(7.4)), v3(0.4, 10.4, z(8.8)), v3(-5, 14.4, z(10.6)), v3(-11.6, 20.2, z(13)), v3(-18.5, 27, z(15.4))],
    [176, 196, 208], [22, 46, 80],
  );
}
