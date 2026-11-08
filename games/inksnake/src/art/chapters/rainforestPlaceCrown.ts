import type { Rng } from '../../logic/rng';
import { blob, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import {
  around, blot, CROWN_LEAF, DEEP_SHADE, FERN, FERN_DEEP, FIG_FRUIT, FIG_FRUIT_DEEP, FIG_LEAF, type Foliage, fillLeaves, type Leaf, lightOf, rngAt, strokeLeaves,
  TALL_LEAF,
} from './rainforestPlaceKit';

/**
 * A tree crown seen from above, high over the forest floor: a dome of leafy
 * clumps (each its own small dome, lit from the upper left, its leaves
 * picked out lighter towards the light and sunk dark on the far side), the
 * deep green gaps between them, a scalloped leafy rim, a broken pen
 * contour on the shadowed side. Looks:
 *
 * - 'crown': a broadleaf canopy tree, mid green, now and then a bird's-nest fern in a fork;
 * - 'fig': a strangler fig, dense dark glossy leaves, clusters of ripe orange figs;
 * - 'tall': an emergent towering over the rest, paler grey-green, a few big lobes
 *   with pale limbs showing between them, its shadow thrown furthest.
 */
export type CrownLook = 'crown' | 'fig' | 'tall';

interface Clump {
  readonly c: Pt;
  readonly r: number;
  readonly shape: Pt[];
}

const FOLIAGE: Record<CrownLook, Foliage> = { crown: CROWN_LEAF, fig: FIG_LEAF, tall: TALL_LEAF };

export const lookOf = (look: string | undefined): CrownLook => (look === 'fig' || look === 'tall' ? look : 'crown');

/** How far down-right the crown's shadow falls on the floor (taller trees, further), as a share of its radius. */
export const shadowReach = (look: CrownLook): number => (look === 'tall' ? 0.5 : 0.32);

/** The crown's shadow on the floor far below: soft, deep, down-right of it. */
export function crownShadow(d: Draw, c: Pt, r: number, look: CrownLook): void {
  const { ctx } = d.pen;
  const k = shadowReach(look) * r;
  const at = pt(c.x + SHADOW.x * k, c.y + SHADOW.y * k);
  blot(ctx, at, r * 1.25, DEEP_SHADE, 0.32, 0.55);
  blot(ctx, at, r * 1.05, DEEP_SHADE, 0.3, 0.7);
  const disc = Array.from({ length: 40 }, (_, i) => around(at, (i / 40) * TAU, r * 0.98));
  d.pen.hatch(disc, 3.2, 0.95, 0.45, { color: d.ink, alpha: 0.2 });
}

/** The clumps a crown is built of: a ring at its edge, a ring inside, one on top; outermost first, so the top is painted last. */
function clumpsOf(c: Pt, r: number, look: CrownLook, rng: Rng): Clump[] {
  const big = look === 'tall' ? 1.18 : look === 'fig' ? 0.86 : 1;
  const rings: [number, number, number][] = [
    [Math.max(6, Math.round(((r / 13) * 1.05) / big)), 0.64, 0.36 * big],
    [Math.max(4, Math.round(5 / big)), 0.31, 0.34 * big],
  ];
  const out: Clump[] = [];
  const ph = rng() * TAU;
  for (const [n, dist, size] of rings) {
    for (let i = 0; i < n; i++) {
      const a = ph + ((i + (rng() - 0.5) * 0.5) / n) * TAU;
      const rr = r * size * (0.85 + rng() * 0.3);
      const at = around(c, a, r * dist * (0.9 + rng() * 0.16));
      out.push({ c: at, r: rr, shape: blob(at, rr, rr * (0.86 + rng() * 0.2), rng, 0.26, 30, rng() * TAU) });
    }
  }
  // Paint the lower-right ones first: the light falls on the upper left, so those read as on top.
  const lower = out.sort((p, q) => q.c.x * SHADOW.x + q.c.y * SHADOW.y - (p.c.x * SHADOW.x + p.c.y * SHADOW.y));
  const top = pt(c.x - SHADOW.x * r * 0.06, c.y - SHADOW.y * r * 0.06);
  const tr = r * 0.4 * big;
  return [...lower, { c: top, r: tr, shape: blob(top, tr, tr * 0.92, rng, 0.24, 30, rng() * TAU) }];
}

/** The leaves over a clump: lit ones towards the light, deep ones away from it, mid between, and the leaf tips round its rim. */
function clumpLeaves(cl: Clump, rng: Rng, size: number): { deep: Leaf[]; mid: Leaf[]; lit: Leaf[]; rim: Leaf[] } {
  const deep: Leaf[] = [];
  const mid: Leaf[] = [];
  const lit: Leaf[] = [];
  const rim: Leaf[] = [];
  const n = Math.round((cl.r * cl.r) / (size * size * 0.32));
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const rho = Math.sqrt(rng()) * cl.r;
    const p = around(cl.c, a, rho);
    // Lit by where it lies on the little dome.
    const light = 0.5 + (rho / cl.r) * (lightOf(a) - 0.5) * 1.6 + (rng() - 0.5) * 0.35;
    const f = { x: p.x, y: p.y, a: a + (rng() - 0.5) * 1.8, l: size * (0.8 + rng() * 0.5), w: size * (0.42 + rng() * 0.2) };
    (light > 0.68 ? lit : light < 0.36 ? deep : mid).push(f);
  }
  const m = Math.round((cl.r * TAU) / (size * 0.9));
  for (let i = 0; i < m; i++) {
    const a = (i / m) * TAU + rng() * 0.2;
    const p = around(cl.c, a, cl.r * (0.95 + rng() * 0.12));
    rim.push({ x: p.x, y: p.y, a: a + (rng() - 0.5) * 0.9, l: size * (0.9 + rng() * 0.5), w: size * 0.5 });
  }
  return { deep, mid, lit, rim };
}

/** A clump's dome as a wash: lighter where the light falls (upper left), deepening away from it, unevenly. */
function domeWash(ctx: CanvasRenderingContext2D, cl: Clump, f: Foliage, tone: string): CanvasGradient {
  const hx = cl.c.x - SHADOW.x * cl.r * 0.45;
  const hy = cl.c.y - SHADOW.y * cl.r * 0.45;
  const g = ctx.createRadialGradient(hx, hy, cl.r * 0.05, cl.c.x, cl.c.y, cl.r * 1.08);
  g.addColorStop(0, mix(tone, f.lit, 0.55));
  g.addColorStop(0.45, tone);
  g.addColorStop(0.85, mix(tone, f.depth, 0.5));
  g.addColorStop(1, mix(tone, f.depth, 0.75));
  return g;
}

/** One clump: its dome washed, pooled dark at its drying edge, its leaves, glints, hatching in its shade, a pen contour heavier on the far side. */
function paintClump(d: Draw, cl: Clump, f: Foliage, rng: Rng, size: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const tone = mix(f.base, rng() < 0.5 ? f.lit : f.depth, rng() * 0.3);
  const leaves = clumpLeaves(cl, rng, size);
  fillLeaves(ctx, leaves.rim, mix(tone, f.depth, 0.3), 0.95);
  strokeLeaves(ctx, leaves.rim, f.depth, 0.6, 0.35);
  ctx.save();
  ctx.fillStyle = domeWash(ctx, cl, f, tone);
  ctx.beginPath();
  cl.shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.clipped(cl.shape, () => {
    // A bloom of another green where the wash dried unevenly.
    const b = around(cl.c, rng() * TAU, cl.r * 0.4);
    blot(ctx, b, cl.r * (0.4 + rng() * 0.3), rng() < 0.5 ? '#b8c45a' : '#21483e', 0.18, 0.4);
    fillLeaves(ctx, leaves.deep, f.depth, 0.8);
    fillLeaves(ctx, leaves.mid, mix(tone, f.lit, 0.2), 0.75);
    fillLeaves(ctx, leaves.lit, f.lit, 0.9);
    fillLeaves(ctx, leaves.lit.filter((_, i) => i % 3 === 0), f.glint, 0.75);
    strokeLeaves(ctx, leaves.lit, f.glint, 0.5, 0.3);
    strokeLeaves(ctx, leaves.deep, '#0c1a10', 0.45, 0.3);
    // Pigment pooled at the drying edge.
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = mix(f.depth, '#000000', 0.2);
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    cl.shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
  // Leaf tips breaking the clump's edge, so it reads as foliage and not a disc.
  const tips = leaves.rim.filter((_, i) => i % 2 === 0).map((f) => ({ ...f, x: f.x + Math.cos(f.a) * 0.6, y: f.y + Math.sin(f.a) * 0.6 }));
  fillLeaves(ctx, tips, mix(tone, f.lit, 0.15), 0.95);
  strokeLeaves(ctx, tips, f.depth, 0.5, 0.3);
  pen.crescent(cl.shape, pt(-SHADOW.x * cl.r * 0.42, -SHADOW.y * cl.r * 0.42), () => {
    pen.hatch(cl.shape, 2.4, 0.95, 0.4, { color: d.ink, alpha: 0.32 });
  });
  const edge = closed(cl.shape);
  for (let i = 0; i < edge.length - 3; i += 2) {
    const a = Math.atan2(edge[i]!.y - cl.c.y, edge[i]!.x - cl.c.x);
    const light = lightOf(a);
    if (rng() < 0.25 + (1 - light) * 0.7) pen.hair(edge.slice(i, i + 4), 0.45 + (1 - light) * 0.75, d.ink, 0.3 + (1 - light) * 0.4);
  }
}

/** Pale limbs showing between an emergent's lobes, forking out from its middle. */
function limbs(d: Draw, c: Pt, r: number, rng: Rng): void {
  const n = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.5;
    const mid = around(c, a + (rng() - 0.5) * 0.3, r * 0.4);
    const end = around(c, a + (rng() - 0.5) * 0.4, r * 0.82);
    d.pen.stroke([c, mid, end], 2.4 - i * 0.1, '#b8ae92', 0.8, false);
    d.pen.hair([around(c, a, 2), mid, end], 0.5, d.ink, 0.4);
  }
}

/** Clusters of ripe figs, orange-red, each with a glint. */
function figs(d: Draw, clumps: readonly Clump[], rng: Rng): void {
  for (const cl of clumps) {
    if (rng() < 0.45) continue;
    const at = around(cl.c, rng() * TAU, cl.r * rng() * 0.6);
    for (let k = 0; k < 4 + Math.floor(rng() * 4); k++) {
      const p = around(at, rng() * TAU, rng() * 4.5);
      const rr = 1.3 + rng() * 0.6;
      d.pen.dot(p.x + 0.6, p.y + 0.8, rr, FIG_FRUIT_DEEP, 0.6);
      d.pen.dot(p.x, p.y, rr, mix(FIG_FRUIT, '#e8a040', rng() * 0.5), 0.95);
      d.pen.dot(p.x - rr * 0.35, p.y - rr * 0.4, rr * 0.35, '#fff2c8', 0.75);
    }
  }
}

/** A bird's-nest fern in a fork of the crown: a rosette of bright strap leaves round a dark heart. */
function nestFern(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { ctx } = d.pen;
  const n = 11;
  const leaves: Leaf[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.3;
    const l = r * (0.8 + rng() * 0.4);
    const p = around(c, a, l * 0.5);
    leaves.push({ x: p.x, y: p.y, a, l, w: l * 0.3 });
  }
  fillLeaves(ctx, leaves.map((f) => ({ ...f, x: f.x + 1.5, y: f.y + 2.2 })), '#10220f', 0.4);
  fillLeaves(ctx, leaves, FERN, 0.95);
  strokeLeaves(ctx, leaves, FERN_DEEP, 0.8, 0.5);
  d.pen.dot(c.x, c.y, r * 0.22, '#3b2d1e', 0.9);
  for (const f of leaves) d.pen.hair([around(c, f.a, 1), around(c, f.a, f.l * 0.95)], 0.3, d.ink, 0.3);
}

/** One crown, as `look`, filling its zone (radius r round c). */
export function paintCrown(d: Draw, c: Pt, r: number, look: CrownLook): void {
  const rng = rngAt(c.x, c.y, r);
  const f = FOLIAGE[look];
  const clumps = clumpsOf(c, r, look, rng);
  // The depths between the clumps.
  for (const cl of clumps) d.pen.fill(cl.shape, f.depth, 1);
  if (look === 'tall') limbs(d, c, r, rng);
  const size = look === 'fig' ? 3.6 : look === 'tall' ? 5.2 : 4.4;
  for (const cl of clumps) paintClump(d, cl, f, rng, size);
  if (look === 'fig') figs(d, clumps, rng);
  if (look === 'crown' && rng() < 0.6) {
    const at = clumps[Math.floor(rng() * (clumps.length - 1))]!;
    nestFern(d, around(at.c, rng() * TAU, at.r * 0.3), 9 + rng() * 3, rng);
  }
}
