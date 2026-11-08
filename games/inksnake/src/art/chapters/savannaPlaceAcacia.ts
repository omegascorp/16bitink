import type { Rng } from '../../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, shade, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { rngAt } from './barrensPlaceKit';
import { BARK, BARK_DARK, BARK_LIT, LEAF, LEAF_DEEP, LEAF_LIT, nestsNear, SHADE, THORN } from './savannaPlaceKit';

/**
 * An umbrella thorn (Acacia tortilis) seen from under its flat crown: the
 * trunk's foot filling its collision circle, dark grey bark ridged and
 * fissured, lit towards the upper left and sinking into shade where it
 * rises out of sight; low limbs forking out from it, one to each weaver's
 * nest hanging there (the nests are the level's), their tips feathered with
 * the tree's tiny grey-green leaves and set with pairs of white thorns.
 */

const lightOf = (a: number): number => (1 - Math.cos(a - 3.99)) / 2;

/** The trunk's foot: a ridged disc of dark bark, the ridges running out from the middle, fissures between, lit upper left. */
function trunk(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const ridges = 16 + Math.floor(rng() * 6);
  const ph = rng() * TAU;
  const ring = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * TAU;
    return polar(c, a, r * (0.94 + 0.07 * Math.abs(Math.sin(((a + ph) * ridges) / 2)) ** 0.6));
  });
  castShadow(d, ring, r * 0.35, 0.3, SHADE);
  body(d, ring, BARK_DARK, 0.97);
  pen.clipped(ring, () => {
    for (let i = 0; i < ridges; i++) {
      const a = ph + ((i + (rng() - 0.5) * 0.4) / ridges) * TAU;
      const lit = lightOf(a);
      for (let r0 = r * (0.18 + rng() * 0.1); r0 < r; ) {
        const r1 = Math.min(r * 1.05, r0 + r * (0.18 + rng() * 0.3));
        const wid = ((r0 + r1) / 2) * (TAU / ridges) * (0.3 + rng() * 0.12);
        const plate = tube([polar(c, a, r0), polar(c, a + (rng() - 0.5) * 0.08, r1)], wid * 0.7, wid);
        pen.fill(plate, mix(mix(BARK, BARK_LIT, 0.25 + rng() * 0.3), BARK_DARK, (1 - lit) * 0.6), 0.92);
        pen.hair(plate.slice(0, Math.ceil(plate.length / 2)), 0.35, PAPER_FILL, 0.15 + lit * 0.35);
        pen.hair(closed(plate), 0.3, BARK_DARK, 0.6);
        r0 = r1 + r * (0.03 + rng() * 0.05);
      }
    }
    pen.crescent(ring, pt(-SHADOW.x * r * 0.6, -SHADOW.y * r * 0.6), () => pen.fill(ring, BARK_DARK, 0.42));
    const { ctx } = pen;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 0.75);
    g.addColorStop(0, rgba(BARK_DARK, 0.65));
    g.addColorStop(1, rgba(BARK_DARK, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.restore();
  });
  shade(d, ring, 0.2);
  pen.stroke(closed(ring), 0.9, mix(BARK_DARK, d.ink, 0.5), 0.85);
}

/** One bipinnate leaf from above: a fine stalk with tiny paired leaflets either side, as fuzzy dabs. */
function leaf(d: Draw, p: Pt, a: number, l: number, tone: string, rng: Rng): void {
  const { ctx } = d.pen;
  const tip = polar(p, a, l);
  ctx.save();
  ctx.strokeStyle = rgba(mix(tone, BARK_DARK, 0.4), 0.7);
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.fillStyle = rgba(tone, 0.85);
  ctx.beginPath();
  const n = Math.round(l / 1.1);
  for (let i = 1; i <= n; i++) {
    const q = polar(p, a, (i / (n + 1)) * l);
    for (const side of [-1, 1]) {
      const s = polar(q, a + side * (1.2 + rng() * 0.2), 0.9 + rng() * 0.5);
      ctx.moveTo(s.x + 0.55, s.y);
      ctx.arc(s.x, s.y, 0.55, 0, TAU);
    }
  }
  ctx.fill();
  ctx.restore();
}

/** A cluster of leaves sprung from a node at p, with their shadow on the ground below. */
function spray(d: Draw, p: Pt, a: number, rng: Rng, n = 7, lift = 7): void {
  const leaves = Array.from({ length: n }, () => ({ a: a + (rng() - 0.5) * 2.8, l: 6 + rng() * 5 }));
  for (const f of leaves) {
    const s = polar(p, f.a + 0.2, f.l * 0.5);
    d.pen.fill(blob(pt(s.x + SHADOW.x * lift, s.y + SHADOW.y * lift), f.l * 0.55, 1.8, rng, 0.3, 8, f.a), SHADE, 0.09);
  }
  for (const f of leaves) {
    const lit = lightOf(f.a);
    leaf(d, p, f.a, f.l, lit > 0.7 ? LEAF_LIT : lit > 0.35 ? LEAF : LEAF_DEEP, rng);
  }
}

/** Paired white thorns along a limb: straight spines and little hooks, each with a hair of shadow. */
function thorns(d: Draw, line: readonly Pt[], from: number, rng: Rng): void {
  for (let i = from; i < line.length - 1; i += 2) {
    const q = line[i]!;
    const n = line[i + 1]!;
    const a = Math.atan2(n.y - q.y, n.x - q.x);
    for (const side of [-1, 1]) {
      const tip = polar(q, a + side * (1.25 + rng() * 0.3), 2.8 + rng() * 1.8);
      d.pen.hair([pt(q.x + SHADOW.x * 3, q.y + SHADOW.y * 3), pt(tip.x + SHADOW.x * 3, tip.y + SHADOW.y * 3)], 0.5, SHADE, 0.18);
      d.pen.hair([q, tip], 0.55, THORN, 0.95);
    }
  }
}

/** A limb from the trunk out to `to`: tapering grey bark, lit along its upper edge, fissured, its shadow on the ground far below; leaves and thorns towards its tip. */
function limb(d: Draw, c: Pt, r: number, to: Pt, rng: Rng, w0 = 6.5, w1 = 1.8): Pt[] {
  const { pen } = d;
  const a = Math.atan2(to.y - c.y, to.x - c.x);
  const line = arc(polar(c, a, r * 0.6), to, (rng() - 0.5) * 18, 16);
  const shape = tube(line, w0, w1);
  castShadow(d, shape, 12, 0.13, SHADE);
  body(d, shape, mix(BARK, BARK_DARK, 0.25), 0.95);
  pen.clipped(shape, () => {
    for (const t of [-0.25, 0.1, 0.3]) pen.hair(line.map((p, i) => polar(p, a + Math.PI / 2, t * (w0 + (w1 - w0) * (i / line.length)))), 0.4, BARK_DARK, 0.5);
    pen.hair(line.map((p) => pt(p.x - SHADOW.x * 1.4, p.y - SHADOW.y * 1.4)), 0.7, BARK_LIT, 0.55);
  });
  pen.hair(closed(shape), 0.5, mix(BARK_DARK, d.ink, 0.4), 0.85);
  thorns(d, line, 6, rng);
  return line;
}

export function umbrellaThorn(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 4);
  const nests = nestsNear(c, 110);
  // A limb to each nest, stopping at its rim (the nest's own twig carries on over it); one or two short ones besides.
  const targets = nests.map((n) => {
    const a = Math.atan2(n.y - c.y, n.x - c.x);
    return { to: polar(n, a + Math.PI, 13), nest: true };
  });
  const free = 3 - Math.min(1, Math.max(0, nests.length - 1));
  const used = targets.map((t) => Math.atan2(t.to.y - c.y, t.to.x - c.x));
  for (let k = 0, made = 0; k < 20 && made < free; k++) {
    const a = rng() * TAU;
    if (used.some((u) => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))) < 1)) continue;
    used.push(a);
    targets.push({ to: polar(c, a, r + 18 + rng() * 14), nest: false });
    made++;
  }
  const lines = targets.map((t) => ({ line: t.nest ? limb(d, c, r, t.to, rng) : limb(d, c, r, t.to, rng, 5, 1.4), nest: t.nest }));
  // Side twigs forking off each limb, leafy at their ends.
  const twigs: Pt[][] = [];
  for (const { line } of lines) {
    for (const at of [0.4, 0.7]) {
      const i = Math.floor(line.length * at);
      const p = line[i]!;
      const q = line[i + 1]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x) + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.5);
      twigs.push(limb(d, polar(p, a + Math.PI, 0), 0, polar(p, a, 14 + rng() * 12), rng, 2.4, 0.9));
    }
  }
  for (const { line, nest } of lines) {
    const n = line.length;
    const end = nest ? n - 5 : n;
    for (let i = Math.floor(n * 0.35); i < end; i += 2) {
      const p = line[i]!;
      const q = line[Math.min(n - 1, i + 1)]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x) + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.6);
      spray(d, p, a, rng, 7);
    }
    if (!nest) spray(d, line[n - 1]!, Math.atan2(line[n - 1]!.y - line[n - 3]!.y, line[n - 1]!.x - line[n - 3]!.x), rng, 9);
  }
  for (const line of twigs) {
    const n = line.length;
    spray(d, line[n - 1]!, Math.atan2(line[n - 1]!.y - line[n - 3]!.y, line[n - 1]!.x - line[n - 3]!.x), rng, 9);
    spray(d, line[Math.floor(n / 2)]!, rng() * TAU, rng, 6);
  }
  trunk(d, c, r, rng);
}
