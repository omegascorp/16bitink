import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { glaze } from '../critters/preyKit';

/**
 * Painting helpers shared by the reef's fish and eels: a body built along a
 * bending spine (snout at s = 0), translucent rayed fins, rows of fine
 * scales, and the dark of a hole an eel's neck runs down into. Board px,
 * facing +x, light from the upper left.
 */

/** Full width along the spine through these knots (s, width), eased between them. */
export function widthOf(knots: readonly (readonly [number, number])[]): (s: number) => number {
  return (s) => {
    for (let i = 1; i < knots.length; i++) {
      const [s1, w1] = knots[i]!;
      const [s0, w0] = knots[i - 1]!;
      if (s <= s1) {
        const t = Math.max(0, (s - s0) / (s1 - s0 || 1));
        return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5;
      }
    }
    return knots[knots.length - 1]![1];
  };
}

export interface Body {
  readonly len: number;
  readonly spine: Pt[];
  readonly shape: Pt[];
  readonly width: (s: number) => number;
  /** The point s along the spine, v across it (−1..1, +1 on the +y side). */
  readonly at: (s: number, v: number) => Pt;
  /** At s: f points forward (to the snout), n to the +y side. */
  readonly frame: (s: number) => { f: Pt; n: Pt };
}

/** A body along `spineAt` (s from the snout, 0..len), `width(s)` across. */
export function bodyOf(spineAt: (s: number) => Pt, width: (s: number) => number, len: number, n = 64): Body {
  const spine = Array.from({ length: n + 1 }, (_, i) => spineAt((i / n) * len));
  const { shape } = ribbon(spine, (u) => width(u * len));
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = spineAt(Math.max(0, s - 0.4));
    const c = spineAt(Math.min(len, s + 0.4));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  const at = (s: number, v: number): Pt => {
    const p = spineAt(s);
    const { n: nn } = frame(s);
    const half = width(s) / 2;
    return pt(p.x + nn.x * v * half, p.y + nn.y * v * half);
  };
  return { len, spine, shape, width, at, frame };
}

/** A point out from the body at s on `side`, `out` past its edge and `back` behind (towards the tail). */
export function off(b: Body, s: number, side: number, out: number, back = 0): Pt {
  const p = b.at(s, side);
  const { f, n } = b.frame(s);
  return pt(p.x + n.x * side * out - f.x * back, p.y + n.y * side * out - f.y * back);
}

export interface FinPaint {
  readonly wash: string;
  readonly alpha?: number;
  readonly ray?: string;
  readonly rays?: number;
  /** A deeper wash along its edge (a dark or bright margin). */
  readonly margin?: string;
  readonly marginAlpha?: number;
  readonly line?: number;
}

/**
 * A thin rayed fin between its root (along the body) and its free edge
 * (both traced the same way): a translucent wash the water shows through,
 * soft ray lines from root to edge, a margin and a fine contour.
 */
export function fin(d: Draw, root: readonly Pt[], edge: readonly Pt[], o: FinPaint): Pt[] {
  const { pen } = d;
  const shape = [...root, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 0.25);
  pen.fill(shape, o.wash, o.alpha ?? 0.45);
  const lerpAlong = (line: readonly Pt[], t: number): Pt => {
    const k = t * (line.length - 1);
    const i = Math.min(line.length - 2, Math.floor(k));
    const u = k - i;
    return pt(line[i]!.x + (line[i + 1]!.x - line[i]!.x) * u, line[i]!.y + (line[i + 1]!.y - line[i]!.y) * u);
  };
  pen.clipped(shape, () => {
    if (o.margin) pen.stroke(edge, 1.6, o.margin, o.marginAlpha ?? 0.5, false);
    const rays = o.rays ?? 0;
    for (let i = 0; i < rays; i++) {
      const t = (i + 0.5) / rays;
      const a = lerpAlong(root, t);
      const b = lerpAlong(edge, t);
      const m = pt(a.x + (b.x - a.x) * 0.55, a.y + (b.y - a.y) * 0.55);
      pen.hair([a, m, b], 0.22, o.ray ?? d.ink, 0.45);
    }
  });
  pen.hair(edge, o.line ?? 0.3, d.ink, 0.7);
  return shape;
}

/** A soft lit band down one side of a body and a deeper one down the other: the roundness of a fish's back. */
export function roundness(d: Draw, b: Body, from: number, to: number, deep: string, depth = 0.38): void {
  const { pen } = d;
  pen.clipped(b.shape, () => {
    const lit = Array.from({ length: 14 }, (_, i) => b.at(from + ((to - from) * i) / 13, -0.42));
    pen.hair(lit, b.width((from + to) / 2) * 0.22, PAPER_FILL, 0.22);
    pen.crescent(b.shape, pt(-0.8, -1.3), () => pen.fill(b.shape, deep, depth));
  });
}

/** Scales in rows down the body: each a small arc open towards the head, with a glint, `step` apart. */
export function scaleRows(d: Draw, b: Body, from: number, to: number, step: number, colour: string, alpha = 0.45, w = 0.16): void {
  const { pen } = d;
  pen.clipped(b.shape, () => {
    for (let s = from, row = 0; s < to; s += step, row++) {
      const half = b.width(s) / 2;
      const across = Math.max(1, Math.round((half * 2) / step));
      const { f, n } = b.frame(s);
      for (let j = 0; j <= across; j++) {
        const v = -1 + ((j + (row % 2) * 0.5) / across) * 2;
        if (Math.abs(v) > 0.98) continue;
        const c = b.at(s, v);
        const r = step * 0.55;
        pen.hair([pt(c.x + n.x * r + f.x * r * 0.3, c.y + n.y * r + f.y * r * 0.3), pt(c.x - f.x * r * 0.6, c.y - f.y * r * 0.6), pt(c.x - n.x * r + f.x * r * 0.3, c.y - n.y * r + f.y * r * 0.3)], w, colour, alpha);
      }
    }
  });
}

/** Mottling over a body: `n` soft blots of `colour` (r about `size`), placed by `seed`, kept to `keep`. */
export function blots(d: Draw, b: Body, n: number, seed: number, size: number, colour: string, alpha: number, keep: (s: number, v: number) => boolean = () => true): void {
  const rng = createRng(seed);
  const { pen } = d;
  pen.clipped(b.shape, () => {
    for (let i = 0; i < n; i++) {
      const s = rng() * b.len;
      const v = (rng() * 2 - 1) * 1.05;
      if (!keep(s, v)) continue;
      const c = b.at(s, v);
      const r = size * (0.55 + rng() * 0.8) * Math.min(1, b.width(s) / (size * 3) + 0.4);
      const k = 8;
      const blot = Array.from({ length: k }, (_, j) => {
        const a = (j / k) * Math.PI * 2;
        const rr = r * (0.7 + rng() * 0.5);
        return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * (0.75 + rng() * 0.3));
      });
      pen.fill(blot, colour, alpha * (0.7 + rng() * 0.3));
    }
  });
}

/** The dark of a hole the body runs down into, from s0 on to the end: the neck melting into shadow. */
export function intoHole(d: Draw, b: Body, s0: number, hole: string): void {
  const { pen } = d;
  pen.clipped(b.shape, () => {
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const s = s0 + ((b.len - s0) * i) / steps;
      const c = b.at(s, 0);
      glaze(d, c.x, c.y, b.width(s) * 0.9, b.width(s) * 0.9, 0, hole, 0.16 + (i / steps) * 0.5);
    }
  });
}

/** An eye on the top of a fish's head: a pale ring, a dark pupil, a crisp glint. */
export function fishEye(d: Draw, c: Pt, r: number, iris: string): void {
  const { pen } = d;
  pen.dot(c.x + r * 0.25, c.y + r * 0.35, r * 1.05, d.ink, 0.3);
  pen.dot(c.x, c.y, r, iris, 1);
  pen.dot(c.x, c.y, r * 0.62, '#11131c', 1);
  pen.dot(c.x - r * 0.3, c.y - r * 0.32, Math.max(0.22, r * 0.26), PAPER_FILL, 0.95);
  pen.hair(closed(Array.from({ length: 10 }, (_, i) => pt(c.x + Math.cos((i / 10) * Math.PI * 2) * r, c.y + Math.sin((i / 10) * Math.PI * 2) * r))), Math.max(0.14, r * 0.16), d.ink, 0.8);
}

/** `colour` lifted towards paper by t. */
export const lift = (colour: string, t: number): string => mix(colour, PAPER_FILL, t);
