/**
 * The sperm whale's shape, in its own px ("local px"): facing right, the
 * front of its snout at x = 0, y down. About 2,950 px from snout to fluke
 * tips, a third of it head: the huge square head (the case), the long narrow
 * lower jaw slung under it, the small eye just above the corner of the
 * mouth, the blowhole at the front of the head on its left, wrinkled skin
 * behind the head, a low hump and a row of knuckles down the back to the
 * flukes. Pure geometry: whaleArt.ts inks it.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A smooth curve through points (Catmull-Rom), `steps` samples a span. */
export function spline(points: readonly Pt[], steps = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** Evenly spaced points along a polyline. */
export function resample(path: readonly Pt[], n: number): Pt[] {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y));
  const total = lengths[lengths.length - 1]!;
  let j = 1;
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * total;
    while (j < path.length - 1 && lengths[j]! < at) j++;
    const a = path[j - 1]!;
    const b = path[j]!;
    const u = (at - lengths[j - 1]!) / Math.max(1e-6, lengths[j]! - lengths[j - 1]!);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  });
}

/** Snout to tail stock, and the head's length. */
export const WHALE_LEN = 2560;
export const HEAD_LEN = 930;
/** Where the body's middle is (it pivots here as it dives). */
export const MIDDLE: Pt = { x: -1250, y: 0 };

/** The back, from the top corner of the snout to the tail stock: the flat top of the case, a dip behind it, the hump and the knuckles. */
export const BACK: readonly Pt[] = spline([
  { x: -4, y: -232 },
  { x: -42, y: -259 },
  { x: -220, y: -269 },
  { x: -600, y: -262 },
  { x: -870, y: -238 },
  { x: -1000, y: -230 },
  { x: -1300, y: -230 },
  { x: -1560, y: -212 },
  { x: -1700, y: -236 },
  { x: -1800, y: -200 },
  { x: -1900, y: -186 },
  { x: -1960, y: -170 },
  { x: -2030, y: -168 },
  { x: -2090, y: -150 },
  { x: -2160, y: -146 },
  { x: -2230, y: -122 },
  { x: -2400, y: -78 },
  { x: -2560, y: -46 },
], 8);

/** The underside, from the bottom corner of the snout to the tail stock: under the case to the corner of the mouth, then the throat and belly. */
export const BELLY: readonly Pt[] = spline([
  { x: -4, y: 150 },
  { x: -60, y: 184 },
  { x: -220, y: 197 },
  { x: -450, y: 201 },
  { x: -650, y: 199 },
  { x: -770, y: 250 },
  { x: -930, y: 288 },
  { x: -1200, y: 300 },
  { x: -1500, y: 272 },
  { x: -1800, y: 222 },
  { x: -2100, y: 152 },
  { x: -2350, y: 86 },
  { x: -2560, y: 46 },
], 8);

/** The blunt front of the snout, top to bottom, bulging forward a little. */
export const FRONT: readonly Pt[] = spline([
  { x: -4, y: -232 },
  { x: 12, y: -160 },
  { x: 18, y: -40 },
  { x: 13, y: 80 },
  { x: -4, y: 150 },
], 6);

/** The whole body (without the flukes or the lower jaw), clockwise from the top of the snout. */
export const BODY: readonly Pt[] = [...FRONT, ...BELLY.slice(1), ...[...BACK].reverse().slice(1)];

/** The flukes, seen a little from above: the upper lobe raised, the lower one dropped, a notch between. */
export const FLUKES: readonly Pt[] = [
  { x: -2540, y: -44 },
  ...spline([{ x: -2540, y: -44 }, { x: -2700, y: -150 }, { x: -2860, y: -270 }, { x: -2955, y: -318 }], 6).slice(1),
  ...spline([{ x: -2955, y: -318 }, { x: -2860, y: -160 }, { x: -2790, y: -40 }, { x: -2760, y: -6 }], 6).slice(1),
  ...spline([{ x: -2760, y: -6 }, { x: -2800, y: 60 }, { x: -2850, y: 190 }, { x: -2905, y: 262 }], 6).slice(1),
  ...spline([{ x: -2905, y: 262 }, { x: -2810, y: 220 }, { x: -2660, y: 120 }, { x: -2540, y: 44 }], 6).slice(1),
];

/** The lower jaw (shut): its hinge, its tip, and how thick it is along it (0 hinge .. 1 tip). */
export const JAW = { hinge: { x: -665, y: 226 }, tip: { x: -112, y: 214 } } as const;
export const jawThickness = (s: number): number => 56 - 24 * s;
/** The jaw turns about here as it opens. */
export const JAW_PIVOT: Pt = { x: -650, y: 210 };

/** A point along the jaw's centre line, and its upper (lip, teeth) and lower edges, s 0 hinge .. 1 tip. */
export function jawAt(s: number): { readonly mid: Pt; readonly upper: Pt; readonly lower: Pt } {
  const mid = { x: JAW.hinge.x + (JAW.tip.x - JAW.hinge.x) * s, y: JAW.hinge.y + (JAW.tip.y - JAW.hinge.y) * s + 6 * Math.sin(Math.PI * s) };
  const h = jawThickness(s) / 2;
  return { mid, upper: { x: mid.x, y: mid.y - h }, lower: { x: mid.x, y: mid.y + h } };
}

/** The lower jaw's outline: along the top edge to a round tip, back along the bottom. */
export const JAW_SHAPE: readonly Pt[] = (() => {
  const n = 24;
  const top = Array.from({ length: n + 1 }, (_, i) => jawAt(i / n).upper);
  const bottom = Array.from({ length: n + 1 }, (_, i) => jawAt(i / n).lower);
  const t = jawAt(1);
  const r = jawThickness(1) / 2;
  const tipCap = Array.from({ length: 7 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * (i + 1)) / 8;
    return { x: t.mid.x + Math.cos(a) * r * 0.9, y: t.mid.y + Math.sin(a) * r };
  });
  return [...top, ...tipCap, ...bottom.reverse()];
})();

/** Rotates a point about the jaw's pivot by `open` radians (positive: the tip drops). */
export function openJaw(p: Pt, open: number): Pt {
  const c = Math.cos(open);
  const s = Math.sin(open);
  const dx = p.x - JAW_PIVOT.x;
  const dy = p.y - JAW_PIVOT.y;
  return { x: JAW_PIVOT.x + dx * c - dy * s, y: JAW_PIVOT.y + dx * s + dy * c };
}

/** The teeth along the jaw: where each stands (s along it) and how tall. */
export const TEETH: readonly { readonly s: number; readonly h: number }[] = Array.from({ length: 17 }, (_, i) => ({
  s: 0.2 + (i / 16) * 0.74,
  h: 24 + 8 * Math.sin((i / 16) * Math.PI) - 4 * (i % 2),
}));

/** The small eye, just above and behind the corner of the mouth. */
export const EYE = { x: -712, y: 112, r: 15 } as const;
/** The blowhole: at the front of the head, on its left side. */
export const BLOWHOLE: Pt = { x: -58, y: -262 };
/** The flipper's root, behind the corner of the mouth. */
export const FLIPPER_ROOT: Pt = { x: -800, y: 206 };

/** The case (head) for scars: a point is on the head's side if it's inside the body outline and in front of the neck. */
export const HEAD_BACK_X = -880;
