import type { Rng } from '../../logic/rng';
import { oval, pt, TAU, type Draw } from '../kit';
import type { Pt } from '../pen';
import { blob, dab, LIGHT, mix, paint, SHADOW } from '../sites/paintKit';

/**
 * Parts for painting the townscape's ground (ground.ts): smooth curves and
 * the ribbons of roads, broken pen lines, heaps of round puffs (clouds,
 * woods) with the pen along their crowns, grass tufts, and the trees and
 * bushes at the edges of the view, lit from the upper left like the rest.
 */
export const GRASS_DEEP = '#4f6e3a';
export const LEAF = '#628c47';
export const LEAF_DARK = '#2f4a32';

/** Smooth curve through points (Catmull-Rom), resampled about every `step` units. */
export function curve(pts: readonly Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** A ribbon of width w(u) along a spine, flattened by the view's foreshortening: a road or a lane. */
export function strip(spine: readonly Pt[], w: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach((p, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    const hw = w(i / (spine.length - 1)) / 2;
    left.push(pt(p.x + nx * hw, p.y + ny * hw * 0.55));
    right.push(pt(p.x - nx * hw, p.y - ny * hw * 0.55));
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

export const centroid = (s: readonly Pt[]): Pt => s.reduce((a, p) => pt(a.x + p.x / s.length, a.y + p.y / s.length), pt(0, 0));

/** Splits a polyline into runs, leaving gaps: a contour the pen only finds in places. */
export function broken(d: Draw, rng: Rng, line: readonly Pt[], w: number, color: string, alpha: number, keep = 0.7): void {
  let i = 0;
  while (i < line.length - 1) {
    const n = 3 + Math.floor(rng() * 8);
    if (rng() < keep) d.pen.hair(line.slice(i, i + n + 1), w, color, alpha);
    i += n;
  }
}

export interface Puff {
  readonly c: Pt;
  readonly r: number;
}

export function puffPath(ctx: CanvasRenderingContext2D, puffs: readonly Puff[], o: (p: Puff) => { dx: number; dy: number; k: number }): void {
  ctx.beginPath();
  for (const p of puffs) {
    const { dx, dy, k } = o(p);
    ctx.moveTo(p.c.x + dx + p.r * k, p.c.y + dy);
    ctx.arc(p.c.x + dx, p.c.y + dy, p.r * k, 0, TAU);
  }
}

/** The pen along the top of a heap of puffs (a cloud, a wood), in places, wherever no other puff covers it. */
export function crownLine(d: Draw, rng: Rng, puffs: readonly Puff[], base: number, w: number, alpha: number): void {
  for (const p of puffs) {
    const arc: Pt[] = [];
    const flush = (): void => {
      if (arc.length > 2) broken(d, rng, arc, w, d.ink, alpha, 0.75);
      arc.length = 0;
    };
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * 0.95 + (i / 20) * Math.PI * 1.1;
      const q = pt(p.c.x + Math.cos(a) * p.r, p.c.y + Math.sin(a) * p.r);
      const hidden = q.y > base || puffs.some((o) => o !== p && Math.hypot(q.x - o.c.x, q.y - o.c.y) < o.r * 0.98);
      if (hidden) flush();
      else arc.push(q);
    }
    flush();
  }
}

/** Where a left-to-right polyline crosses x (its y there). */
export function yAt(line: readonly Pt[], x: number): number {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if ((x >= a.x && x <= b.x) || (x <= a.x && x >= b.x)) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** A jagged line from a to b: a crack or a fracture in rock. */
export function jag(rng: Rng, a: Pt, b: Pt, n: number, amp: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k = i === 0 || i === n ? 0 : (rng() - 0.5) * 2 * amp;
    return pt(a.x + (b.x - a.x) * t + k, a.y + (b.y - a.y) * t + k * 0.3);
  });
}

/** A tuft of grass: a few blades fanning up from a point. */
export function tuft(d: Draw, rng: Rng, p: Pt, s: number, alpha: number): void {
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.35 + (rng() - 0.5) * 0.3;
    const l = s * (0.7 + rng() * 0.6);
    d.pen.hair([p, pt(p.x + Math.cos(a) * l * 0.5 + 0.3, p.y + Math.sin(a) * l * 0.5), pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l)], 0.42, mix(GRASS_DEEP, SHADOW, 0.35), alpha);
  }
}

/** A little tree far off: a dab of green, lit on its left. */
export function farTree(d: Draw, rng: Rng, x: number, y: number, s: number, tint: string, ink = 0.45): void {
  const crown = blob(pt(x, y - s), s * 0.8, s, rng, 0.15, 12);
  d.pen.fill(crown, tint, 0.9);
  d.pen.fill(blob(pt(x - s * 0.3, y - s * 1.3), s * 0.42, s * 0.45, rng, 0.2, 10), mix(tint, LIGHT, 0.45), 0.6);
  d.pen.hair([pt(x + s * 0.75, y - s * 1.3), pt(x + s * 0.65, y - s * 0.3), pt(x, y + 0.2)], 0.45, d.ink, ink);
}

/** A broadleaf tree: a trunk and boughs under a crown of leafy masses, each lit from the upper left, the shade side hatched. */
export function tree(d: Draw, rng: Rng, foot: Pt, s: number, hue = 0.5): void {
  dab(d, oval(foot.x + 16 * s, foot.y + 2, 28 * s, 5 * s, 18), SHADOW, 0.25, 2);
  const lean = (rng() - 0.5) * 6 * s;
  const trunk = [pt(foot.x - 4.5 * s, foot.y + 1), pt(foot.x - 2.6 * s + lean * 0.5, foot.y - 26 * s), pt(foot.x - 7 * s + lean, foot.y - 42 * s), pt(foot.x + lean, foot.y - 34 * s), pt(foot.x + 7 * s + lean, foot.y - 44 * s), pt(foot.x + 2.8 * s + lean * 0.5, foot.y - 24 * s), pt(foot.x + 5 * s, foot.y + 1)];
  paint(d, trunk, '#7a5a3c', { shadow: 0.6, hatch: 0.3, line: 0.8 });
  const green = mix(LEAF, '#86a24f', hue);
  const top = pt(foot.x + lean, foot.y - 60 * s);
  const masses: Pt[][] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng() * 0.6;
    masses.push(blob(pt(top.x + Math.cos(a) * 19 * s, top.y + Math.sin(a) * 14 * s + 4 * s), (12 + rng() * 6) * s, (9 + rng() * 4) * s, rng, 0.22, 16));
  }
  masses.push(blob(top, 20 * s, 16 * s, rng, 0.18, 18));
  masses.push(blob(pt(top.x - 6 * s, top.y - 12 * s), 12 * s, 9 * s, rng, 0.2, 16));
  // Back masses first; those on the far side and low down sink into shade.
  masses.sort((a, b) => centroid(a).y - centroid(b).y);
  for (const m of masses) {
    const c = centroid(m);
    const tone = (c.x - top.x) / (40 * s) + (c.y - top.y) / (36 * s);
    paint(d, m, mix(green, LEAF_DARK, Math.max(0, Math.min(0.6, 0.18 + tone * 0.4))), { shadow: 0.7, hatch: 0.28, line: 0.75 });
    d.pen.clipped(m, () => {
      for (let k = 0; k < 8; k++) {
        const q = pt(c.x - 6 * s + (rng() - 0.5) * 14 * s, c.y - 5 * s + (rng() - 0.5) * 10 * s);
        d.pen.hair([q, pt(q.x + 2.5 * s, q.y - 1.2 * s), pt(q.x + 4.5 * s, q.y + 0.4 * s)], 0.45, mix(green, LIGHT, 0.6), 0.6);
      }
    });
  }
}

/** A cypress: a tall dark flame of a tree, lit down its left. */
export function cypress(d: Draw, rng: Rng, foot: Pt, h: number): void {
  dab(d, oval(foot.x + h * 0.15, foot.y + 1, h * 0.25, h * 0.04, 14), SHADOW, 0.25, 1.5);
  const w = h * 0.13;
  const shape = [
    ...curve([pt(foot.x - w * 0.5, foot.y), pt(foot.x - w, foot.y - h * 0.35), pt(foot.x - w * 0.6, foot.y - h * 0.8), pt(foot.x + (rng() - 0.5) * 2, foot.y - h)], 3),
    ...curve([pt(foot.x + w * 0.7, foot.y - h * 0.8), pt(foot.x + w, foot.y - h * 0.35), pt(foot.x + w * 0.5, foot.y)], 3),
  ];
  paint(d, shape, mix(LEAF_DARK, LEAF, 0.45), { shadow: 0.8, hatch: 0.35, line: 0.8 });
  d.pen.clipped(shape, () => {
    for (let k = 0; k < 10; k++) {
      const y = foot.y - h * (0.1 + rng() * 0.8);
      d.pen.hair([pt(foot.x - w * 0.6, y), pt(foot.x - w * 0.1, y - 3), pt(foot.x + w * 0.2, y - 1)], 0.45, mix(LEAF, LIGHT, 0.5), 0.55);
    }
  });
}

/** A low bush: leafy masses huddled together. */
export function bush(d: Draw, rng: Rng, foot: Pt, s: number): void {
  dab(d, oval(foot.x + 6 * s, foot.y + 1, 15 * s, 3 * s, 14), SHADOW, 0.25, 1.4);
  const green = mix(LEAF, '#86a457', rng());
  for (const [dx, dy, r] of [[-9, -6, 8], [9, -6, 8], [0, -11, 10]] as const) {
    const m = blob(pt(foot.x + dx * s, foot.y + dy * s), r * s, r * 0.75 * s, rng, 0.22, 14);
    paint(d, m, mix(green, LEAF_DARK, dx > 0 ? 0.32 : 0.1), { shadow: 0.65, hatch: 0.25, line: 0.7 });
  }
}
