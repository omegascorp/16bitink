import { createRng, type Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { Blobs, type Geo, hash, PATH_HALF, POCKET_R, RING_R, seedOf, type Span, touches } from './common';

/**
 * Stone underfoot: the paved path the groove is worn down (two slabs
 * abreast, laid along the curve), the terrace's flagstone courses, and the
 * ring of setts round each level's pocket.
 */
const WARM_STONE = '#cfc2a6';
const COOL_STONE = '#bfc1b4';
export const JOINT = '#c9c2a8';

export interface Slab {
  readonly shape: Pt[];
  readonly sides: Pt[][];
  readonly cx: number;
  readonly cy: number;
  readonly seed: number;
  /** 0 pale and quiet .. 1 fully weathered and inked. */
  readonly detail: number;
}

/** Cuts every corner sharper than ~150° back by `k` units. */
export function chamfer(pts: readonly Pt[], k: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const a = pts[(i - 1 + n) % n]!;
    const b = pts[(i + 1) % n]!;
    const ua = pt(a.x - p.x, a.y - p.y);
    const ub = pt(b.x - p.x, b.y - p.y);
    const la = Math.hypot(ua.x, ua.y) || 1;
    const lb = Math.hypot(ub.x, ub.y) || 1;
    if ((ua.x * ub.x + ua.y * ub.y) / (la * lb) > -0.85) {
      const ka = Math.min(k, la / 2);
      const kb = Math.min(k, lb / 2);
      out.push(pt(p.x + (ua.x / la) * ka, p.y + (ua.y / la) * ka), pt(p.x + (ub.x / lb) * kb, p.y + (ub.y / lb) * kb));
    } else out.push(p);
  }
  return out;
}

/**
 * The path's slabs between path indices i0 and i1: courses about 70 px
 * long, two slabs abreast either side of the groove (which hides their
 * inner edges). `skip(i)` leaves a course out (bridges).
 */
export function pathSlabs(geo: Geo, i0: number, i1: number, salt: number, skip: (i: number) => boolean): Slab[] {
  const { pts, nrm } = geo;
  const out: Slab[] = [];
  let k = 0;
  for (let a = i0; a < i1 - 4; k++) {
    const len = 15 + Math.floor(hash(salt, k, 77) * 6);
    const b = Math.min(i1, a + len);
    if (!skip(a) && !skip(b)) {
      for (const side of [1, -1]) {
        const outer = PATH_HALF - 4 + hash(salt + side, k, 78) * 8;
        const edge = (off: number, from: number, to: number): Pt[] => {
          const res: Pt[] = [];
          const step = from < to ? 3 : -3;
          for (let i = from; step > 0 ? i < to : i > to; i += step) res.push(pt(pts[i]!.x + nrm[i]!.x * side * off, pts[i]!.y + nrm[i]!.y * side * off));
          res.push(pt(pts[to]!.x + nrm[to]!.x * side * off, pts[to]!.y + nrm[to]!.y * side * off));
          return res;
        };
        const lo = a + 1;
        const hi = b - 1;
        const top = edge(outer, lo, hi);
        const bot = edge(17, hi, lo);
        const m = pts[Math.floor((lo + hi) / 2)]!;
        const mn = nrm[Math.floor((lo + hi) / 2)]!;
        out.push({
          shape: chamfer([...top, ...bot], 4),
          sides: [top, [top[top.length - 1]!, bot[0]!], [bot[bot.length - 1]!, top[0]!]],
          cx: m.x + mn.x * side * 36,
          cy: m.y + mn.y * side * 36,
          seed: seedOf(salt, k, side),
          detail: 0,
        });
      }
    }
    a = b;
  }
  return out;
}

/**
 * Flagstone courses filling x0..x1 × y0..y1 (world px), each joint slightly
 * askew, their detail set by `detail(x, y)`.
 */
export function courses(rng: Rng, x0: number, x1: number, y0: number, y1: number, salt: number, detail: (x: number, y: number) => number): Slab[] {
  const rows: number[] = [y0];
  while (rows[rows.length - 1]! < y1) rows.push(rows[rows.length - 1]! + 96 + rng() * 40);
  rows[rows.length - 1] = y1;
  const phase = rows.map(() => rng() * TAU);
  const course = (i: number, x: number): number => rows[i]! + (i === 0 || i === rows.length - 1 ? 0 : Math.sin(x / 190 + phase[i]!) * 3.5);
  const g = 2.6;
  const out: Slab[] = [];
  for (let r = 0; r + 1 < rows.length; r++) {
    const joints: { top: number; bot: number }[] = [];
    for (let x = x0 - 60 - rng() * 90; x < x1 + 60; x += 125 + rng() * 85) {
      const lean = (rng() - 0.5) * 9;
      joints.push({ top: x + lean, bot: x - lean });
    }
    joints.push({ top: x1 + 260, bot: x1 + 260 });
    for (let j = 0; j + 1 < joints.length; j++) {
      const a = joints[j]!;
      const b = joints[j + 1]!;
      const along = (xa: number, xb: number, row: number, dy: number): Pt[] => {
        const n = Math.max(2, Math.ceil(Math.abs(xb - xa) / 18));
        return Array.from({ length: n + 1 }, (_, k) => {
          const x = xa + ((xb - xa) * k) / n;
          return pt(x, course(row, x) + dy);
        });
      };
      const top = along(a.top + g, b.top - g, r, g);
      const right = [pt(b.top - g, course(r, b.top) + g), pt(b.bot - g, course(r + 1, b.bot) - g)];
      const bot = along(b.bot - g, a.bot + g, r + 1, -g);
      const left = [pt(a.bot + g, course(r + 1, a.bot) - g), pt(a.top + g, course(r, a.top) + g)];
      const cx = (a.top + b.bot) / 2;
      const cy = (course(r, a.top) + course(r + 1, b.bot)) / 2;
      out.push({ shape: chamfer([...top, ...bot], 5), sides: [top, right, bot, left], cx, cy, seed: seedOf(salt, r, j), detail: detail(cx, cy) });
    }
  }
  return out;
}

/** The slabs' bounding rows, for chunk tests. */
export function slabTouches(span: Span, s: Slab): boolean {
  return touches(span, s.cy, 110);
}

/** One slab: a pale wash, weathering, a worn shadowed edge and a broken pen outline. `fade` lightens it towards paper. */
export function paintSlab(d: Draw, s: Slab, fade = 1): void {
  const { pen } = d;
  const rng = createRng(s.seed);
  const e = s.detail;
  pen.fill(s.shape, PAPER_FILL, 0.9 * fade);
  pen.fill(s.shape, mix(rng() < 0.5 ? WARM_STONE : COOL_STONE, STONE, rng()), (0.2 + 0.16 * e + rng() * 0.06) * fade);
  if (rng() < 0.6) {
    pen.clipped(s.shape, () => {
      for (let i = 0; i < 3; i++) pen.fill(oval(s.cx + (rng() - 0.5) * 80, s.cy + (rng() - 0.5) * 60, 12 + rng() * 20, 8 + rng() * 12, 14), STONE_DARK, (0.04 + 0.04 * e) * fade);
    });
  }
  pen.crescent(s.shape, pt(-3, -4.4), () => pen.fill(s.shape, STONE_DARK, (0.14 + 0.08 * e) * fade));
  if (e > 0.45) pen.crescent(s.shape, pt(-7, -10), () => pen.hatch(s.shape, 4.4, 0.9, 0.45, { color: d.ink, alpha: (0.1 + 0.16 * e) * fade }));
  const a = (0.22 + 0.4 * e) * fade;
  for (const side of s.sides) if (rng() < 0.8) pen.stroke(side, 0.7 + 0.35 * e, d.ink, a, false);
  if (rng() < 0.25 + 0.3 * e) {
    const x = s.cx + (rng() - 0.5) * 50;
    const y = s.cy + (rng() - 0.5) * 30;
    pen.hair([pt(x, y), pt(x + 8 + rng() * 9, y + (rng() - 0.5) * 10), pt(x + 16 + rng() * 12, y + (rng() - 0.5) * 16)], 0.45, d.ink, (0.2 + 0.25 * e) * fade);
  }
}

/** Moss and grit in the joints: tiny blobs along each slab's sides, thicker where detail is high. */
export function jointMoss(ctx: CanvasRenderingContext2D, slabs: readonly Slab[], span: Span): void {
  const moss = new Blobs();
  const leaf = new Blobs();
  for (const s of slabs) {
    if (!slabTouches(span, s)) continue;
    const rng = createRng(s.seed + 5);
    for (const side of s.sides) {
      for (let i = 0; i + 1 < side.length; i++) {
        const p = side[i]!;
        const q = side[i + 1]!;
        const n = Math.round((Math.hypot(q.x - p.x, q.y - p.y) / 8) * (0.15 + 0.8 * s.detail));
        for (let k = 0; k < n; k++) {
          const t = rng();
          const r = 1.3 + rng() * 2.4 * (0.5 + s.detail);
          (rng() < 0.3 ? leaf : moss).add(p.x + (q.x - p.x) * t + (rng() - 0.5) * 4, p.y + (q.y - p.y) * t + (rng() - 0.5) * 4, r, r * 0.8);
        }
      }
    }
  }
  moss.fill(ctx, MOSS, 0.4);
  leaf.fill(ctx, LEAF, 0.4);
}

/** Where the groove runs into and out of a pocket: angles from its centre. */
export function pocketMouths(geo: Geo, c: Pt, r: number): number[] {
  const i = geo.index(c.y);
  const out: number[] = [];
  for (const dir of [1, -1]) {
    for (let k = i; k >= 0 && k < geo.pts.length; k += dir) {
      const p = geo.pts[k]!;
      if (Math.hypot(p.x - c.x, p.y - c.y) >= r) {
        out.push(Math.atan2(p.y - c.y, p.x - c.x));
        break;
      }
    }
  }
  return out;
}

const angleGap = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * The bed of a pocket, laid before the groove: the paving under it blanked
 * to mortar and a ring of fitted setts, open where the groove runs in and out.
 */
export function pocketBed(d: Draw, geo: Geo, c: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  pen.fill(oval(c.x, c.y, RING_R + 2, RING_R + 2, 36), PAPER_FILL, 1);
  pen.fill(oval(c.x, c.y, RING_R + 2, RING_R + 2, 36), JOINT, 0.55);
  const mouths = pocketMouths(geo, c, (POCKET_R + RING_R) / 2);
  const gap = Math.asin(22 / ((POCKET_R + RING_R) / 2));
  const n = 16;
  const r0 = POCKET_R + 1.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + 0.05;
    const a1 = ((i + 1) / n) * TAU - 0.05;
    const am = (a0 + a1) / 2;
    if (mouths.some((m) => angleGap(am, m) < gap + 0.08)) continue;
    const outer = RING_R - rng() * 3;
    const stone: Pt[] = [];
    for (let k = 0; k <= 4; k++) stone.push(pt(c.x + Math.cos(a0 + ((a1 - a0) * k) / 4) * outer, c.y + Math.sin(a0 + ((a1 - a0) * k) / 4) * outer));
    for (let k = 4; k >= 0; k--) stone.push(pt(c.x + Math.cos(a0 + ((a1 - a0) * k) / 4) * r0, c.y + Math.sin(a0 + ((a1 - a0) * k) / 4) * r0));
    const s = chamfer(stone, 2.5);
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, mix(STONE, rng() < 0.5 ? WARM_STONE : STONE_DARK, rng() * 0.4), 0.5);
    pen.crescent(s, pt(-1.8, -2.7), () => pen.fill(s, STONE_DARK, 0.3));
    pen.stroke(closed(s), 0.7, d.ink, 0.55, false);
  }
}

/** The dimple itself, over the groove: a worn hollow, its wall shadowed towards the light, its rim broken at the groove's mouths. */
export function pocketDimple(d: Draw, geo: Geo, c: Pt): void {
  const { pen } = d;
  const r = POCKET_R;
  const disc = oval(c.x, c.y, r, r, 40);
  pen.fill(disc, mix(STONE, PAPER_FILL, 0.45), 0.95);
  pen.fill(disc, STONE_DARK, 0.12);
  pen.fill(oval(c.x + 2, c.y + 3, r * 0.55, r * 0.5, 24), STONE_DARK, 0.06);
  pen.crescent(disc, pt(r * 0.3 * 0.55, r * 0.3 * 0.84), () => pen.fill(disc, mix(STONE_DARK, d.ink, 0.25), 0.26));
  pen.crescent(disc, pt(r * 0.14 * 0.55, r * 0.14 * 0.84), () => pen.hatch(disc, 2.6, 0.9, 0.45, { color: d.ink, alpha: 0.28 }));
  pen.crescent(disc, pt(-r * 0.16 * 0.55, -r * 0.16 * 0.84), () => pen.fill(disc, PAPER_FILL, 0.5));
  const mouths = pocketMouths(geo, c, r);
  const gap = Math.asin(17.5 / r);
  const cuts = mouths.map((m) => m).sort((a, b) => a - b);
  const arcs: [number, number][] = cuts.length === 2 ? [[cuts[0]! + gap, cuts[1]! - gap], [cuts[1]! + gap, cuts[0]! + TAU - gap]] : [[0, TAU]];
  for (const [a0, a1] of arcs) {
    if (a1 - a0 < 0.1) continue;
    const n = Math.max(4, Math.ceil(((a1 - a0) * r) / 6));
    const arc = Array.from({ length: n + 1 }, (_, k) => {
      const a = a0 + ((a1 - a0) * k) / n;
      return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
    // Heavier where the wall stands in shadow (the side nearer the light).
    const mid = (a0 + a1) / 2;
    const heavy = Math.cos(mid) * -0.55 + Math.sin(mid) * -0.84 > 0;
    pen.stroke(arc, heavy ? 1.4 : 0.9, d.ink, 0.8, false);
    pen.hair(arc.map((p) => pt(c.x + (p.x - c.x) * 0.86, c.y + (p.y - c.y) * 0.86)), 0.5, d.ink, 0.2);
  }
}
