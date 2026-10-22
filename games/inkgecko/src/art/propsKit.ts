import { bezier, closed, type Draw, pt } from './kit';
import { INK, LEAF, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Small painting helpers shared by the chapter 3–5 props (fruit, buds,
 * blooms, stones, the geode): leaves, rounded petals, soft cast shadows
 * and round form shading. Local units, light from the upper left.
 */

/** A leaf or petal: its outline, and the point t of the way out, w across its midline. */
export interface Blade {
  readonly shape: Pt[];
  readonly at: (t: number, w: number) => Pt;
}

/** A frame along `ang` from `root`, its midline bowed sideways by `bend`·len at the tip. */
function frame(root: Pt, ang: number, len: number, bend: number): (t: number, w: number) => Pt {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  return (t, w) => {
    const across = w + bend * len * t * t;
    return pt(root.x + dir.x * len * t + nrm.x * across, root.y + dir.y * len * t + nrm.y * across);
  };
}

/** A pointed leaf about `width` across, from `root` along angle `ang`. */
export function leafBlade(root: Pt, ang: number, len: number, width: number, bend = 0): Blade {
  const at = frame(root, ang, len, bend);
  const shape = [...bezier(at(0, 0), at(0.42, width), at(1, 0), 14), ...bezier(at(1, 0), at(0.42, -width), at(0, 0), 14).slice(1, -1)];
  return { shape, at };
}

/** A petal: narrow at its root, broad and rounded at its tip. */
export function petalBlade(root: Pt, ang: number, len: number, width: number, bend = 0): Blade {
  const at = frame(root, ang, len, bend);
  const half = (t: number): number => {
    const k = 0.62;
    return (width / 2) * (t < k ? 0.22 + 0.78 * Math.sin((Math.PI / 2) * (t / k)) : Math.sqrt(Math.max(0, 1 - ((t - k) / (1 - k)) ** 2)));
  };
  const n = 16;
  const ts = Array.from({ length: n + 1 }, (_, i) => i / n);
  const shape = [...ts.map((t) => at(t, half(t))), ...[...ts].reverse().slice(1, -1).map((t) => at(t, -half(t)))];
  return { shape, at };
}

/**
 * A painted leaf: paper, a green wash with one half paler where it takes the
 * light, a darker crescent, the midrib and a few side veins, a pen contour.
 */
export function paintLeaf(d: Draw, leaf: Blade, wash = LEAF, line = 0.9): void {
  const { pen } = d;
  const { shape, at } = leaf;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, 0.78);
  const lit = [...Array.from({ length: 9 }, (_, i) => at(i / 8, 0)), ...Array.from({ length: 9 }, (_, i) => at(1 - i / 8, 6))];
  pen.clipped(shape, () => {
    pen.fill(lit, PAPER_FILL, 0.2);
    pen.crescent(shape, pt(-1.2, -1.6), () => pen.fill(shape, mix(wash, INK, 0.5), 0.4));
  });
  pen.hair(Array.from({ length: 8 }, (_, i) => at(0.04 + (i / 7) * 0.9, 0)), 0.55, d.ink, 0.7);
  for (const t of [0.28, 0.48, 0.68]) {
    for (const s of [1, -1]) pen.hair([at(t, 0), at(t + 0.14, s * 2.2)], 0.35, d.ink, 0.45);
  }
  pen.stroke(closed(shape), line, d.ink, 0.92);
}

/** A soft shadow the shape casts on the ground, down and to the right. */
export function castShadow(d: Draw, shape: readonly Pt[], off: Pt, alpha: number): void {
  d.pen.fill(shape.map((p) => pt(p.x + off.x, p.y + off.y)), INK, alpha);
}

/**
 * Round form shading clipped to `shape`: a pale bloom towards the light, the
 * colour pooling to `deep` at the far rim, as on a glossy round fruit.
 */
export function roundShade(d: Draw, shape: readonly Pt[], cx: number, cy: number, r: number, deep: string, depth = 0.6): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.38, r * 0.15, cx - r * 0.1, cy - r * 0.12, r * 1.25);
    g.addColorStop(0, rgba(PAPER_FILL, 0.3));
    g.addColorStop(0.5, rgba(PAPER_FILL, 0));
    g.addColorStop(0.78, rgba(deep, depth * 0.3));
    g.addColorStop(1, rgba(deep, depth));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
  });
}

/** A glossy window highlight, a crisp glint and a rim light at the upper left of a round form. */
export function gloss(d: Draw, cx: number, cy: number, r: number, strength = 1): void {
  const { pen } = d;
  pen.fill(ellipseAt(cx - r * 0.4, cy - r * 0.45, r * 0.28, r * 0.18, -0.6), PAPER_FILL, 0.4 * strength);
  pen.dot(cx - r * 0.42, cy - r * 0.47, r * 0.1, PAPER_FILL, 0.9 * strength);
  pen.hair(bezier(pt(cx - r * 0.74, cy - r * 0.1), pt(cx - r * 0.7, cy - r * 0.62), pt(cx - r * 0.25, cy - r * 0.76), 8), r * 0.07, PAPER_FILL, 0.65 * strength);
}

/** A rotated ellipse. */
export function ellipseAt(cx: number, cy: number, rx: number, ry: number, rot: number, n = 18): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(cx + x * c - y * s, cy + x * s + y * c);
  });
}

/** A soft-edged glaze: `color` at `alpha` in the middle of an ellipse, fading out to nothing at its edge (wet-in-wet). */
export function glaze(d: Draw, cx: number, cy: number, rx: number, ry: number, rot: number, color: string, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
