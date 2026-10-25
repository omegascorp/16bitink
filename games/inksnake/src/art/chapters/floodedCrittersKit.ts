import { createRng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';

/**
 * Painting helpers shared by the Flooded Forest's critters: a body laid
 * along a bending spine (a fish, a caiman, a neck) with a frame to place
 * marks on it, the water's own marks round a swimmer (rings, a wake, a
 * glint of surface over a submerged back), fins with rays, scale rows and
 * a caiman's bony scutes. Board px, light from the upper left.
 */

/** Water's lit surface and its dark depth, for the marks laid round swimmers. */
export const WATER = { lit: '#eef3ea', deep: '#2e3a2c', murk: '#5b6447' } as const;

/** A body along a spine: its outline, a point at u (0 the front, 1 the back) and v (-1 .. 1 across), and the heading at u. */
export interface Body {
  readonly shape: Pt[];
  readonly at: (u: number, v: number) => Pt;
  readonly ang: (u: number) => number;
  readonly spine: readonly Pt[];
}

/** A body from its spine (front first) and its half width at u. */
export function bodyAlong(spine: readonly Pt[], half: (u: number) => number): Body {
  const n = spine.length - 1;
  const len: number[] = [0];
  for (let i = 1; i <= n; i++) len.push(len[i - 1]! + Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y));
  const total = len[n]! || 1;
  const locate = (u: number): { p: Pt; a: number } => {
    const s = Math.max(0, Math.min(1, u)) * total;
    let i = 1;
    while (i < n && len[i]! < s) i++;
    const a = spine[i - 1]!;
    const b = spine[i]!;
    const k = (s - len[i - 1]!) / (len[i]! - len[i - 1]! || 1);
    return { p: pt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k), a: Math.atan2(b.y - a.y, b.x - a.x) };
  };
  // Travel runs from the back to the front, so "left of travel" is +y when facing +x.
  const at = (u: number, v: number): Pt => {
    const { p, a } = locate(u);
    const h = half(Math.max(0, Math.min(1, u))) * v;
    return pt(p.x + Math.sin(a) * h, p.y - Math.cos(a) * h);
  };
  const ang = (u: number): number => locate(u).a + Math.PI;
  const m = 40;
  const us = Array.from({ length: m + 1 }, (_, i) => (1 - Math.cos((Math.PI * i) / m)) / 2);
  const shape = [...us.map((u) => at(u, 1)), ...[...us].reverse().slice(1, -1).map((u) => at(u, -1))];
  return { shape, at, ang, spine };
}

/** A spine from the front point back through bends: `len` long, curving sideways by bend(u) (px at u). */
export function bentSpine(front: Pt, len: number, bend: (u: number) => number, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return pt(front.x - len * u, front.y + bend(u));
  });
}

/** Rings spreading on the water round c, broken arcs, pale with a faint dark underline. */
export function rings(d: Draw, c: Pt, rx: number, ry: number, n: number, seed: number, alpha = 0.6): void {
  const rng = createRng(seed + d.f * 7);
  for (let k = 0; k < n; k++) {
    const s = 1 + k * 0.32;
    const a0 = rng() * TAU;
    for (let j = 0; j < 3; j++) {
      const from = a0 + (j / 3) * TAU;
      const span = TAU / 3 - 0.5 - rng() * 0.6;
      const arc = Array.from({ length: 9 }, (_, i) => {
        const a = from + (i / 8) * span;
        return pt(c.x + Math.cos(a) * rx * s, c.y + Math.sin(a) * ry * s);
      });
      d.pen.hair(arc, 0.7, WATER.lit, alpha * (1 - k * 0.25));
      d.pen.hair(arc.map((p) => pt(p.x + 0.4, p.y + 0.6)), 0.35, WATER.deep, alpha * 0.35 * (1 - k * 0.25));
    }
  }
}

/** A V of wake trailing back from `tip` (heading +x), each arm `len` long, `spread` apart at its end. */
export function wake(d: Draw, tip: Pt, len: number, spread: number, alpha = 0.6): void {
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const o = k * len * 0.22;
      const a = pt(tip.x - o, tip.y + s * (2 + k * 1.2));
      const b = pt(tip.x - o - len * (1 - k * 0.25), tip.y + s * (spread * (1 - k * 0.2)));
      const arm = bezier(a, pt((a.x + b.x) / 2, a.y + s * spread * 0.2), b, 8);
      d.pen.hair(arm, 0.8 - k * 0.15, WATER.lit, alpha * (1 - k * 0.3));
      d.pen.hair(arm.map((p) => pt(p.x + 0.4, p.y + 0.6)), 0.3, WATER.deep, alpha * 0.3 * (1 - k * 0.3));
    }
  }
}

/** A sheet of water over part of a swimmer: a pale murky film, its glints along the light. */
export function film(d: Draw, shape: readonly Pt[], alpha: number, seed: number): void {
  const { pen } = d;
  pen.fill(shape, WATER.murk, alpha);
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < 9; i++) {
      const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
      const l = 2 + rng() * 5;
      pen.hair([p, pt(p.x + l * 0.5, p.y + 0.3), pt(p.x + l, p.y)], 0.5, WATER.lit, 0.35 + rng() * 0.3);
    }
  });
}

/** A fin from `root` pts (along the body) out to `edge` pts: washed, rayed root to edge, its rim darker. */
export function rayFin(d: Draw, root: readonly Pt[], edge: readonly Pt[], wash: string, deep: string, o: { alpha?: number; rays?: number; rim?: string; line?: number } = {}): Pt[] {
  const { pen } = d;
  const shape = [...root, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 0.55);
  pen.fill(shape, wash, o.alpha ?? 0.75);
  const rays = o.rays ?? 7;
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.6, -0.9), () => pen.fill(shape, deep, 0.35));
    for (let i = 0; i <= rays; i++) {
      const t = i / rays;
      const a = sample(root, t);
      const b = sample(edge, t);
      pen.hair([a, pt((a.x + b.x) / 2, (a.y + b.y) / 2), b], 0.28, deep, 0.55);
    }
    if (o.rim) pen.hair(edge, 1.1, o.rim, 0.55);
  });
  pen.stroke(closed(shape), o.line ?? 0.45, d.ink, 0.85, false);
  return shape;
}

/** The point t (0..1) of the way along a polyline, by index. */
export function sample(line: readonly Pt[], t: number): Pt {
  const f = Math.max(0, Math.min(1, t)) * (line.length - 1);
  const i = Math.min(line.length - 2, Math.floor(f));
  const k = f - i;
  const a = line[i]!;
  const b = line[i + 1]!;
  return pt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
}

/** Overlapping scale arcs laid in rows over a body, from u0 to u1, paler or darker by `tone(u, v)`. */
export function scaleRows(d: Draw, b: Body, u0: number, u1: number, cols: number, rows: number, colour: string, alpha: number, w = 0.25): void {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = u0 + ((i + (j % 2) * 0.5) / cols) * (u1 - u0);
      const v = -0.9 + (j / Math.max(1, rows - 1)) * 1.8;
      const du = ((u1 - u0) / cols) * 0.55;
      const dv = 1.8 / Math.max(1, rows - 1) * 0.55;
      d.pen.hair([b.at(u - du * 0.2, v - dv), b.at(u + du, v), b.at(u - du * 0.2, v + dv)], w, colour, alpha);
    }
  }
}

/**
 * A raised bony scute: a rounded box on the body at (u, v), `du` long and
 * `dv` across, washed, its lit top edge and its shadow edge, and a keel.
 */
export function scute(d: Draw, b: Body, u: number, v: number, du: number, dv: number, colour: string, deep: string, keel: boolean): Pt[] {
  const { pen } = d;
  const corners = [b.at(u - du, v - dv), b.at(u + du, v - dv), b.at(u + du, v + dv), b.at(u - du, v + dv)];
  const mid = (p: Pt, q: Pt, k: number): Pt => pt(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k);
  const shape = corners.flatMap((p, i) => {
    const q = corners[(i + 1) % 4]!;
    return [mid(p, q, 0.18), mid(p, q, 0.82)];
  });
  pen.fill(shape.map((p) => pt(p.x + 0.35, p.y + 0.55)), deep, 0.45);
  pen.fill(shape, colour, 0.9);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.5, -0.7), () => pen.fill(shape, deep, 0.45)));
  if (keel) {
    const k = [b.at(u - du * 0.8, v), b.at(u + du * 0.7, v)];
    pen.hair(k, 0.5, mix(colour, PAPER_FILL, 0.45), 0.7);
    pen.hair(k.map((p) => pt(p.x + 0.35, p.y + 0.5)), 0.3, deep, 0.6);
  }
  pen.stroke(closed(shape), 0.3, d.ink, 0.65, false);
  return shape;
}

/** A bubble on the water: a ring, its glint and a faint shadow. */
export function bubble(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  pen.fill(Array.from({ length: 14 }, (_, i) => pt(c.x + 0.4 + Math.cos((i / 14) * TAU) * r, c.y + 0.6 + Math.sin((i / 14) * TAU) * r)), WATER.deep, 0.2);
  const ring = Array.from({ length: 14 }, (_, i) => pt(c.x + Math.cos((i / 14) * TAU) * r, c.y + Math.sin((i / 14) * TAU) * r));
  pen.fill(ring, WATER.lit, 0.35);
  pen.stroke(closed(ring), Math.max(0.3, r * 0.22), d.ink, 0.65, false);
  pen.dot(c.x - r * 0.35, c.y - r * 0.38, r * 0.28, PAPER_FILL, 0.95);
}

/** A soft curve of a claw or a whisker from p bending towards `ang` by `bend`. */
export function curl(p: Pt, ang: number, len: number, bend: number): Pt[] {
  const e = pt(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
  return cub(p, pt(p.x + Math.cos(ang) * len * 0.4, p.y + Math.sin(ang) * len * 0.4), pt(e.x + Math.cos(ang + Math.PI / 2) * bend, e.y + Math.sin(ang + Math.PI / 2) * bend), e, 8);
}

/** A local frame at `o` turned to `ang`: (x along, y across) to board px. */
export const local = (o: Pt, ang: number) => (x: number, y: number): Pt =>
  pt(o.x + Math.cos(ang) * x - Math.sin(ang) * y, o.y + Math.sin(ang) * x + Math.cos(ang) * y);

/** A smooth closed outline through frame-local key points: Catmull-Rom, `k` points between each pair. */
export function shapeIn(f: (x: number, y: number) => Pt, keys: readonly (readonly [number, number])[], k = 5): Pt[] {
  return smoothLoop(keys.map(([x, y]) => f(x, y)), k);
}

/** A closed Catmull-Rom loop through the points, `k` points per span. */
export function smoothLoop(p: readonly Pt[], k = 5): Pt[] {
  const n = p.length;
  const at = (i: number): Pt => p[((i % n) + n) % n]!;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c2: number, e: number): number => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - e) * t2 + (-a + 3 * b - 3 * c2 + e) * t3);
      out.push(pt(c(p0.x, p1.x, p2.x, p3.x), c(p0.y, p1.y, p2.y, p3.y)));
    }
  }
  return out;
}

/** A fin from key points in a local frame (root first), washed, rayed from the root `hub` out to its edge, rim darker. */
export function keyFin(d: Draw, f: (x: number, y: number) => Pt, keys: readonly (readonly [number, number])[], hub: readonly [number, number], wash: string, deep: string, o: { alpha?: number; rays?: number; rim?: string; line?: number } = {}): Pt[] {
  const { pen } = d;
  const shape = shapeIn(f, keys, 4);
  pen.fill(shape, PAPER_FILL, 0.5);
  pen.fill(shape, wash, o.alpha ?? 0.72);
  const h = f(hub[0], hub[1]);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.5, -0.8), () => pen.fill(shape, deep, 0.32));
    const rays = o.rays ?? 7;
    const n = shape.length;
    for (let i = 0; i < rays; i++) {
      const e = shape[Math.floor(((i + 0.5) / rays) * n)]!;
      pen.hair([h, pt(h.x + (e.x - h.x) * 1.05, h.y + (e.y - h.y) * 1.05)], 0.24, deep, 0.5);
    }
    if (o.rim) pen.stroke(closed(shape), 1.1, o.rim, 0.4, false);
  });
  pen.stroke(closed(shape), o.line ?? 0.4, d.ink, 0.85, false);
  return shape;
}
