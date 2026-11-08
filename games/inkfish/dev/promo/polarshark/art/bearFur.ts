import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { resample, spline } from '../../kraken/whale';
import { type Brush, contour, dab, type Edge, px } from '../../seal/art/paint';

/**
 * The polar bear's fur, painted rather than spiked: an outline softly broken by short locks that sweep the way
 * the fur lies, faint grain strokes following the form, and clumps (a pale lock over a lavender crevice) where
 * the coat is long: the throat, the belly, the backs of the legs and the rump.
 */

export interface Lock {
  /** The stretch of edge the lock grows from. */
  readonly a: Pt;
  readonly b: Pt;
  readonly tip: Pt;
  /** Outward, unit. */
  readonly n: Pt;
}

export interface ShagRule {
  /** A point well inside the shape near `p` (to tell outward from inward). */
  readonly inside: (p: Pt) => Pt;
  /** At `p`: [chance of a lock, min height, max height]. */
  readonly shag: (p: Pt) => readonly [number, number, number];
  /** The way the fur lies at `p`, unit. */
  readonly flow: (p: Pt) => Pt;
}

export const unit = (x: number, y: number): Pt => {
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
};

/**
 * A line with short fur locks along it: each a soft scallop swelling out and sweeping to a tip that points the
 * way the fur lies. Seeded, so the outline holds still and only the ink boils. Locks are pushed onto `locks`.
 */
export function shaggy(path: readonly Pt[], seed: number, rule: ShagRule, locks: Lock[]): Pt[] {
  const rng = createRng(seed);
  let total = 0;
  for (let m = 1; m < path.length; m++) total += Math.hypot(path[m]!.x - path[m - 1]!.x, path[m]!.y - path[m - 1]!.y);
  const line = resample(path, Math.max(2, Math.round(total / 1.6)));
  const out: Pt[] = [line[0]!];
  let i = 0;
  while (i < line.length - 1) {
    const j = Math.min(line.length - 1, i + 3 + Math.floor(rng() * 4));
    const a = line[i]!;
    const b = line[j]!;
    const [chance, h0, h1] = rule.shag(a);
    if (chance > 0 && rng() < chance) {
      const t = unit(b.x - a.x, b.y - a.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const c = rule.inside(mid);
      let n = { x: -t.y, y: t.x };
      if (n.x * (mid.x - c.x) + n.y * (mid.y - c.y) < 0) n = { x: -n.x, y: -n.y };
      const f = rule.flow(a);
      const h = h0 + rng() * (h1 - h0);
      const sweep = h * (0.35 + rng() * 0.45);
      // A soft lobe leaning downstream: it swells out, rounds over at its tip and tucks back in.
      const downstreamB = f.x * (b.x - a.x) + f.y * (b.y - a.y) > 0;
      const [s0, s1] = downstreamB ? [a, b] : [b, a];
      const at = (u: number, out: number, lean: number): Pt => ({
        x: s0.x + (s1.x - s0.x) * u + n.x * h * out + f.x * sweep * lean,
        y: s0.y + (s1.y - s0.y) * u + n.y * h * out + f.y * sweep * lean,
      });
      const tip = at(0.86, 0.95, 0.7);
      const lobe = spline([s0, at(0.35, 0.62, 0.1), at(0.68, 0.98, 0.45), tip, at(1.02, 0.25, 0.4), s1], 3).slice(1);
      out.push(...(downstreamB ? lobe : [...lobe].reverse().slice(1).concat([b])));
      locks.push({ a, b, tip, n });
    } else {
      for (let m = i + 1; m <= j; m++) out.push(line[m]!);
    }
    i = j;
  }
  return out;
}

/** A short curved stroke from `p` along `dir` (unit), `len` long, bending by `bend` toward +normal. */
export function lockLine(p: Pt, dir: Pt, len: number, bend: number): Pt[] {
  const n = { x: -dir.y, y: dir.x };
  return [0, 0.25, 0.5, 0.75, 1].map((u) => ({
    x: p.x + dir.x * len * u + n.x * bend * len * u * u,
    y: p.y + dir.y * len * u + n.y * bend * len * u * u,
  }));
}

export interface Clump {
  readonly at: Pt;
  readonly dir: Pt;
  readonly len: number;
  /** A colour for the lit hairs. */
  readonly light: string;
  /** The shadow as "r,g,b". */
  readonly dark: string;
  /** Overall strength, 0 .. 1. */
  readonly a: number;
}

/** A bundle of fine hairs gathering to a point: a lock of fur drawn the way a pen would. */
export function hairLock(k: Brush, at: Pt, dir: Pt, len: number, spread: number, colour: string, alpha: number, count = 4): void {
  const { pen } = k;
  const n = { x: -dir.y, y: dir.x };
  const tip = { x: at.x + dir.x * len, y: at.y + dir.y * len };
  for (let i = 0; i < count; i++) {
    const o = (i / Math.max(1, count - 1) - 0.5) * spread;
    const from = { x: at.x + n.x * o, y: at.y + n.y * o };
    const mid = { x: (from.x + tip.x) / 2 + n.x * o * 0.25, y: (from.y + tip.y) / 2 + n.y * o * 0.25 };
    pen.hair([from, mid, tip], px(k, 0.6 + pen.rng() * 0.35), colour, alpha * (0.7 + pen.rng() * 0.3));
  }
}

/** A lock of fur inside the coat: a soft shadow where it parts from its neighbours, its hairs lit along the top. */
export function clump(k: Brush, c: Clump): void {
  const n = { x: -c.dir.y, y: c.dir.x };
  const side = n.y >= 0 ? 1 : -1;
  const shadow = { x: c.at.x + c.dir.x * c.len * 0.55 + n.x * side * 1.4, y: c.at.y + c.dir.y * c.len * 0.55 + n.y * side * 1.4 };
  dab(k.ctx, shadow.x, shadow.y, c.len * 0.42, c.dark, 0.16 * c.a);
  hairLock(k, c.at, c.dir, c.len, 2.2, c.light, 0.5 * c.a);
  const under = { x: c.at.x + n.x * side * 1.5, y: c.at.y + n.y * side * 1.5 };
  hairLock(k, under, c.dir, c.len * 0.8, 1, `rgb(${c.dark})`, 0.3 * c.a, 2);
}

/**
 * Fur grain: rows of short faint strokes following the form between two edges, light on the lit side and
 * lavender on the shadow side, drooping a little more toward the under edge.
 */
export function grain(
  k: Brush, top: Edge, under: Edge, x0: number, x1: number, rows: number,
  opts: { readonly light: string; readonly dark: string; readonly droop: (v: number) => number; readonly litTop: boolean; readonly strength?: number },
): void {
  const { pen } = k;
  const s = opts.strength ?? 1;
  const dir = Math.sign(x1 - x0);
  for (let r = 0; r < rows; r++) {
    const v = 0.03 + (0.94 * (r + pen.rng() * 0.9)) / rows;
    const lit = opts.litTop ? 1 - v : v;
    let x = x0 + dir * pen.rng() * 8;
    while ((x1 - x) * dir > 0) {
      const len = 4 + pen.rng() * 9;
      const end = x + dir * len;
      const line = contour(top, under, v + (pen.rng() - 0.5) * 0.03, x, end, len / 3);
      const droop = opts.droop(v) * len;
      const bent = line.map((p, i) => ({ x: p.x, y: p.y + droop * (i / (line.length - 1)) ** 2 }));
      const light = pen.rng() < 0.25 + 0.55 * lit;
      pen.hair(bent, px(k, 0.7 + pen.rng() * 0.5), light ? opts.light : opts.dark, s * (light ? 0.1 + 0.16 * lit : 0.1 + 0.12 * (1 - lit)));
      x = end + dir * (2 + pen.rng() * 7);
    }
  }
}

/** The locks on the edge, shaded: fine hairs gathering into each lock's tip, a soft lavender crease at its root. */
export function shadeLocks(k: Brush, locks: readonly Lock[], light: string, dark: string, strength = 1): void {
  for (const l of locks) {
    const root = { x: (l.a.x + l.b.x) / 2 - l.n.x * 3, y: (l.a.y + l.b.y) / 2 - l.n.y * 3 };
    const d = unit(l.tip.x - root.x, l.tip.y - root.y);
    const len = Math.hypot(l.tip.x - root.x, l.tip.y - root.y);
    dab(k.ctx, l.a.x - l.n.x * 1.5, l.a.y - l.n.y * 1.5, 2.6 + len * 0.3, dark, 0.2 * strength);
    hairLock(k, root, d, len * 0.92, 2.4, light, 0.55 * strength, 4);
  }
}

/**
 * The outline in ink, firm but not heavy, softly broken: it runs in short pressure strokes with small gaps,
 * more gaps where the fur is shaggy. `weight(p)` sets the line in screen px at each point.
 */
export function inkEdge(k: Brush, line: readonly Pt[], weight: (p: Pt) => number, gap: (p: Pt) => number, alpha = 0.92): void {
  const { pen } = k;
  let i = 0;
  while (i < line.length - 1) {
    const run = 6 + Math.floor(pen.rng() * 10);
    const j = Math.min(line.length - 1, i + run);
    const seg = line.slice(i, j + 1);
    const p = line[i]!;
    pen.stroke(seg, px(k, weight(p)), INK, alpha * (0.85 + pen.rng() * 0.15), false);
    i = j + (pen.rng() < gap(p) ? 1 : 0);
  }
}
