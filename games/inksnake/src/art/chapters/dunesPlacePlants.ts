import type { Rng } from '../../logic/rng';
import { arc, blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { OLIVE, rngAt, SAND, SAND_DEEP } from './dunesPlaceKit';

/**
 * The Dunes' solid plants from above: a creosote bush (an open spray of
 * grey, dark-ringed stems from a mound of trapped sand, the tiny resinous
 * olive leaves in clumps at their ends, a few yellow flowers and white fuzzy
 * seed balls, its shade thrown dappled down-right), and a Mojave yucca (a
 * stiff rosette of dagger leaves, their edges fraying into curly white
 * threads, a skirt of dead brown leaves under them, a long shadow).
 */
const STEM = '#8a7c6a';
const STEM_DARK = '#4a4038';
const LEAF = '#6f7d3c';
const LEAF_LIT = '#b9bf6c';
const YUCCA = '#8a9c62';
const YUCCA_LIT = '#d2d69a';
const YUCCA_DEEP = '#43573f';
const DEAD = '#9a7d56';

/** A mound of sand caught round a plant's foot. */
function mound(d: Draw, c: Pt, r: number, rng: Rng): void {
  const m = blob(c, r, r * 0.9, rng, 0.2, 20);
  d.pen.fill(m, PAPER_FILL, 0.3);
  d.pen.fill(m, SAND, 0.65);
  d.pen.crescent(m, pt(-SHADOW.x * r * 0.25, -SHADOW.y * r * 0.25), () => d.pen.fill(m, SAND_DEEP, 0.2));
}

/** A creosote bush of collision radius r (the spray reaches a little past it). */
export function creosote(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = rngAt(c.x, c.y, 7);
  const reach = r * 1.35;
  mound(d, c, r * 0.5, rng);
  pen.fill(blob(c, r * 0.3, r * 0.28, rng, 0.3, 12), STEM_DARK, 0.45);
  // Stems out from the crown, each forking once or twice.
  const stems: Pt[][] = [];
  const tips: Pt[] = [];
  const n = 9 + Math.floor(rng() * 5);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + (rng() - 0.5) * 0.5;
    const end = polar(c, a, reach * (0.7 + rng() * 0.3));
    const stem = arc(polar(c, a, 3), end, (rng() - 0.5) * r * 0.3, 6);
    stems.push(stem);
    tips.push(end);
    const fork = stem[3]!;
    const fa = a + (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 0.4);
    const fend = polar(fork, fa, reach * (0.3 + rng() * 0.25));
    if (Math.hypot(fend.x - c.x, fend.y - c.y) < reach) {
      stems.push(arc(fork, fend, (rng() - 0.5) * 3, 4));
      tips.push(fend);
    }
  }
  // Leaf clumps at the tips and along the outer stems.
  const clumps = [...stems.filter((_, i) => i % 2 === 0).map((s) => s[2]!), ...stems.map((s) => s[Math.floor(s.length * 0.45)]!), ...stems.map((s) => s[Math.floor(s.length * 0.75)]!), ...tips];
  // The dappled shade of the whole spray, thrown down-right.
  for (const p of clumps) pen.fill(blob(pt(p.x + SHADOW.x * r * 0.55, p.y + SHADOW.y * r * 0.55), 4.6, 3.6, rng, 0.4, 10), d.ink, 0.12);
  for (const s of stems) pen.hair(s.map((p) => pt(p.x + SHADOW.x * 4, p.y + SHADOW.y * 4)), 0.9, d.ink, 0.12);
  for (const s of stems) {
    pen.hair(s, 1.15, STEM_DARK, 0.85);
    pen.hair(s.map((p) => pt(p.x - 0.3, p.y - 0.4)), 0.5, STEM, 0.9);
    for (let i = 2; i < s.length - 1; i += 2) pen.dot(s[i]!.x, s[i]!.y, 0.55, STEM_DARK, 0.8);
  }
  ctx.save();
  for (const [layer, p0] of clumps.entries()) {
    const lit = Math.max(0, -((p0.x - c.x) * SHADOW.x + (p0.y - c.y) * SHADOW.y) / reach);
    const m = 16 + Math.floor(rng() * 10);
    for (let i = 0; i < m; i++) {
      const p = polar(p0, rng() * TAU, Math.sqrt(rng()) * 4.6);
      const a = rng() * TAU;
      const leaf = oval(0, 0, 1.6, 0.85, 8).map((q) => pt(p.x + q.x * Math.cos(a) - q.y * Math.sin(a), p.y + q.x * Math.sin(a) + q.y * Math.cos(a)));
      pen.fill(leaf, mix(mix(OLIVE, LEAF, rng()), LEAF_LIT, lit * 0.6 + rng() * 0.25), 0.95);
      if (rng() < 0.3) pen.dot(p.x - 0.3, p.y - 0.3, 0.3, PAPER_FILL, 0.6);
    }
    if (layer % 4 === 1 && rng() < 0.6) {
      const f = polar(p0, rng() * TAU, 2);
      for (let k = 0; k < 5; k++) pen.dot(f.x + Math.cos((k / 5) * TAU) * 0.9, f.y + Math.sin((k / 5) * TAU) * 0.9, 0.7, '#e8c03a', 1);
      pen.dot(f.x, f.y, 0.45, '#b07a20', 1);
    } else if (layer % 5 === 3) {
      const f = polar(p0, rng() * TAU, 2);
      pen.dot(f.x, f.y, 1.3, PAPER_FILL, 0.95);
      pen.hair(closed(oval(f.x, f.y, 1.3, 1.3, 10)), 0.3, '#8a8478', 0.8);
    }
  }
  ctx.restore();
  for (const p of tips) pen.hair(closed(blob(p, 4.4, 3.8, rng, 0.45, 10)).slice(0, 7), 0.35, d.ink, 0.3);
}

/** One yucca leaf from its base at p, angle a, `l` long, `w` wide at the base: a stiff dagger, grooved, lit on one side. */
function dagger(d: Draw, p: Pt, a: number, l: number, w: number, tone: string, rng: Rng, fibres: boolean): void {
  const { pen } = d;
  const tip = polar(p, a, l);
  const spine = arc(p, tip, (rng() - 0.5) * l * 0.08, 8);
  const shape = ribbon(spine, (u) => w * (1 - u) ** 0.8 + 0.2).shape;
  pen.fill(shape.map((q) => pt(q.x + SHADOW.x * 2.2, q.y + SHADOW.y * 2.2)), d.ink, 0.18);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, tone, 0.92);
  const n = pt(-Math.sin(a), Math.cos(a));
  const away = n.x * SHADOW.x + n.y * SHADOW.y > 0 ? 1 : -1;
  pen.clipped(shape, () => pen.fill(shape.map((q) => pt(q.x + n.x * away * w * 0.45, q.y + n.y * away * w * 0.45)), YUCCA_DEEP, 0.35));
  pen.hair(spine.slice(0, 7), 0.35, mix(tone, YUCCA_DEEP, 0.6), 0.7);
  pen.hair(closed(shape), 0.38, d.ink, 0.7);
  pen.dot(tip.x, tip.y, 0.45, '#5a4030', 0.9);
  if (!fibres) return;
  for (let i = 0; i < 2; i++) {
    const at = spine[2 + Math.floor(rng() * 4)]!;
    const s = rng() < 0.5 ? 1 : -1;
    const q = pt(at.x + n.x * s * w * 0.5, at.y + n.y * s * w * 0.5);
    const curl = [q, pt(q.x + n.x * s * 1.5 + (rng() - 0.5) * 2, q.y + n.y * s * 1.5 + (rng() - 0.5) * 2), pt(q.x + n.x * s * 2.6 + (rng() - 0.5) * 3, q.y + n.y * s * 2.6 + (rng() - 0.5) * 3)];
    pen.hair(curl, 0.35, PAPER_FILL, 0.9);
  }
}

/** A Mojave yucca of collision radius r: a skirt of dead leaves, then two rings of live daggers, the young ones upright in the middle. */
export function yucca(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 11);
  mound(d, c, r * 0.9, rng);
  // The tall plant's shadow, long down-right.
  const shadowC = pt(c.x + SHADOW.x * r * 1.6, c.y + SHADOW.y * r * 1.6);
  pen.fill(blob(shadowC, r * 1.3, r * 0.9, rng, 0.35, 18, Math.atan2(SHADOW.y, SHADOW.x)), d.ink, 0.13);
  pen.fill(blob(pt((c.x + shadowC.x) / 2, (c.y + shadowC.y) / 2), r * 0.5, r * 0.35, rng, 0.2, 12), d.ink, 0.1);
  const ph = rng() * TAU;
  for (let k = 0; k < 14; k++) {
    const a = ph + (k / 14) * TAU + (rng() - 0.5) * 0.3;
    dagger(d, polar(c, a, 1), a, r * (1.3 + rng() * 0.3), 2.4, mix(DEAD, '#6e5638', rng() * 0.5), rng, false);
  }
  const rings: readonly (readonly [number, number, number, number])[] = [
    // leaves, length (share of r), width, lit
    [16, 1.55, 2.7, 0.2],
    [12, 1.15, 2.5, 0.45],
    [8, 0.7, 2.2, 0.7],
  ];
  for (const [count, len, w, lit] of rings) {
    const off = rng() * TAU;
    const leaves = Array.from({ length: count }, (_, k) => off + (k / count) * TAU + (rng() - 0.5) * 0.25);
    // Leaves facing away from the light first, so the lit ones overlap them.
    leaves.sort((a, b) => Math.cos(a - Math.atan2(SHADOW.y, SHADOW.x)) - Math.cos(b - Math.atan2(SHADOW.y, SHADOW.x)));
    for (const a of leaves.reverse()) {
      const facing = Math.max(0, -Math.cos(a - Math.atan2(SHADOW.y, SHADOW.x)));
      const tone = mix(mix(YUCCA_DEEP, YUCCA, 0.55 + lit * 0.45), YUCCA_LIT, facing * 0.5 * lit + rng() * 0.15);
      dagger(d, polar(c, a, 0.8), a, r * len * (0.9 + rng() * 0.2), w, tone, rng, len > 1);
    }
  }
  pen.fill(oval(c.x, c.y, 1.8, 1.6, 10), rgba(YUCCA_DEEP, 1), 0.8);
}
