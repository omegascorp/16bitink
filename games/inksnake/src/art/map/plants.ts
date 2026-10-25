import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, type Brush, polar, scalloped } from './brush';

/**
 * Low plants on the map: bushes and cushions from above, and the few
 * things a naturalist draws a little from the front because that's how
 * they're known (a saguaro, reeds, grass clumps), each with its shadow on
 * the ground down-right.
 */

/** A bush from above: a scalloped mound lit at the upper left, perhaps in flower. */
export function bush(b: Brush, c: Pt, r: number, rng: Rng, tone = LEAF, bloom: string | null = null): void {
  const shape = scalloped(c, r, Math.max(6, Math.round(r / 6)), rng, 0.16);
  b.cast(shape, r * 0.35, 0.13);
  b.body(shape, mix(tone, MOSS, rng() * 0.4), 0.6);
  for (let i = 0; i < 3; i++) b.tint(scalloped(polar(c, -2.2 + (rng() - 0.5) * 1.4, r * 0.3), r * 0.35, 5, rng, 0.2), mix(MOSS, '#ffffff', 0.3), 0.35);
  b.shade(shape, r * 0.45, '#2f4f2f', 0.35);
  b.hatchShade(shape, r * 0.3, 0.22, 3.4);
  for (let i = 0; i < Math.round(r / 5); i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.8);
    const a = rng() * TAU;
    b.line([polar(p, a, 3), p, polar(p, a + 1.2, 3)], 0.4, 0.4);
  }
  if (bloom) for (let i = 0; i < Math.round(r / 2.2); i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.85);
    b.dot(p.x, p.y, 1.5 + rng() * 1.3, bloom, 0.9);
  }
  b.edge(shape, 0.9, 0.7);
}

/** A clump of grass drawn from the front: blades fanning up from a root, its shadow at the foot. */
export function grassClump(b: Brush, c: Pt, h: number, rng: Rng, tone = '#8a9a4a', heads: string | null = null): void {
  if (!b.draft) b.pen.fill(oval(c.x + h * 0.25, c.y + 1, h * 0.45, h * 0.1, 12), b.d.ink, 0.12);
  const n = 7 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const lean = (i / (n - 1) - 0.5) * 1.5 + (rng() - 0.5) * 0.3;
    const l = h * (0.6 + rng() * 0.5);
    const root = pt(c.x + (rng() - 0.5) * h * 0.2, c.y);
    const tip = pt(root.x + Math.sin(lean) * l, root.y - Math.cos(lean) * l);
    const blade = bezier(root, pt(root.x + Math.sin(lean) * l * 0.3, root.y - l * 0.6), tip, 6);
    b.line(blade, 0.8, 0.75, mix(tone, '#26316a', 0.35));
    if (!b.draft && rng() < 0.5) b.pen.hair(blade.map((p) => pt(p.x + 0.8, p.y)), 0.6, mix(tone, '#f0e6b0', 0.4), 0.6);
    if (heads && rng() < 0.4) b.dot(tip.x, tip.y, 1.6, heads, 0.9);
  }
}

/** A saguaro, drawn from the front: a ribbed column with arms, lit down its left, its long shadow on the sand. */
export function saguaro(b: Brush, c: Pt, h: number, rng: Rng): void {
  const w = h * 0.16;
  const green = '#6f8f5a';
  const col = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
    ...bezier(pt(x0 - w / 2, y0), pt(x0 - w / 2, (y0 + y1) / 2), pt(x1 - w / 2, y1 + w / 2), 6),
    ...bezier(pt(x1 - w / 2, y1 + w / 2), pt(x1, y1 - w * 0.2), pt(x1 + w / 2, y1 + w / 2), 4).slice(1),
    ...bezier(pt(x1 + w / 2, y1 + w / 2), pt(x0 + w / 2, (y0 + y1) / 2), pt(x0 + w / 2, y0), 6).slice(1),
  ];
  const trunk = col(c.x, c.y, c.x, c.y - h);
  const arms: Pt[][] = [];
  for (const s of rng() < 0.3 ? [1] : [-1, 1]) {
    const y = c.y - h * (0.38 + rng() * 0.2);
    const x = c.x + s * h * 0.26;
    const elbow = [...bezier(pt(c.x, y + w * 0.3), pt(x, y + w * 0.4), pt(x, y - w * 0.5), 6)];
    const up = col(x, y - w * 0.3, x, y - h * (0.28 + rng() * 0.12));
    arms.push(up);
    arms.push([...elbow.map((p) => pt(p.x, p.y - w / 2)), ...[...elbow].reverse().map((p) => pt(p.x, p.y + w / 2))]);
  }
  // Its shadow stretches far over the sand, down-right.
  const shadow = [pt(c.x - w / 2, c.y), pt(c.x + h * 0.55, c.y + h * 0.5), pt(c.x + h * 0.55 + w, c.y + h * 0.5), pt(c.x + w / 2, c.y)];
  b.cast(shadow, 0, 0.14);
  for (const s of [...arms, trunk]) {
    b.body(s, green, 0.65);
    b.pen.crescent(s, pt(-w * 0.45, 0), () => (b.draft ? b.hatch(s, 2.4, 1.2, 0.4) : b.pen.fill(s, '#3c5a3a', 0.38)));
    b.edge(s, 0.9, 0.85);
  }
  for (let k = -1; k <= 1; k++) b.line([pt(c.x + k * w * 0.22, c.y - 2), pt(c.x + k * w * 0.22, c.y - h + w * 0.4)], 0.4, 0.4);
  for (let i = 0; i < 14; i++) b.dot(c.x + (rng() - 0.5) * w, c.y - rng() * h, 0.6, PAPER_FILL, 0.8);
}

/** Prickly-pear pads, a few ovals jointed together, from above, with spines dotted on them. */
export function pricklyPear(b: Brush, c: Pt, r: number, rng: Rng): void {
  const pads: Pt[] = [c];
  for (let i = 0; i < 4; i++) pads.push(polar(pads[Math.floor(rng() * pads.length)]!, rng() * TAU, r * 0.7));
  for (const p of pads) {
    const a = Math.atan2(p.y - c.y, p.x - c.x) + (rng() - 0.5) * 0.6;
    const pad = oval(p.x, p.y, r * 0.55, r * 0.38, 16).map((q) => {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      return pt(p.x + dx * Math.cos(a) - dy * Math.sin(a), p.y + dx * Math.sin(a) + dy * Math.cos(a));
    });
    b.cast(pad, r * 0.3, 0.12);
    b.body(pad, '#7d9a5a', 0.62);
    b.shade(pad, r * 0.25, '#3f5a36', 0.35);
    for (let k = 0; k < 6; k++) b.dot(p.x + (rng() - 0.5) * r * 0.7, p.y + (rng() - 0.5) * r * 0.5, 0.6, '#f2ecd0', 0.9);
    b.edge(pad, 0.8, 0.75);
    if (rng() < 0.35) b.dot(p.x + r * 0.4, p.y - r * 0.2, 2.2, '#c24a5e', 0.9);
  }
}

/** A creosote bush: an open, airy cushion of tiny olive leaves from above. */
export function creosote(b: Brush, c: Pt, r: number, rng: Rng): void {
  const shape = blob(c, r, r * 0.85, rng, 0.25, 26);
  b.cast(shape, r * 0.3, 0.1);
  if (!b.draft) b.pen.fill(shape, '#8f9a5a', 0.32);
  for (let i = 0; i < r * 2.2; i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.9);
    b.dot(p.x, p.y, 1 + rng() * 1.2, rng() < 0.5 ? '#5f6f3a' : '#9aa65f', 0.75);
  }
  for (let i = 0; i < 6; i++) b.line([c, polar(c, rng() * TAU, r * 0.8)], 0.5, 0.45, '#5a4a30');
  b.shade(shape, r * 0.4, '#4a5530', 0.2);
  b.line(closed(shape).filter((_, i) => i % 3 !== 0), 0.6, 0.5);
}

/** A heather cushion from above: low and rounded, stippled with purple bells. */
export function heather(b: Brush, c: Pt, r: number, rng: Rng): void {
  const shape = scalloped(c, r, 8, rng, 0.2).map((p) => pt(p.x, c.y + (p.y - c.y) * 0.8));
  b.cast(shape, r * 0.25, 0.12);
  b.body(shape, '#6f6a4a', 0.55);
  for (let i = 0; i < r * 2.4; i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.85);
    b.dot(p.x, c.y + (p.y - c.y) * 0.8, 1 + rng(), rng() < 0.7 ? '#9a5f9a' : '#c48ac0', 0.85);
  }
  b.shade(shape, r * 0.4, '#3a3a2a', 0.3);
  b.hatchShade(shape, r * 0.3, 0.2, 3);
  b.edge(shape, 0.8, 0.65);
}

/** Gorse from above: a dense spiny dome, dark, starred with yellow flowers. */
export function gorse(b: Brush, c: Pt, r: number, rng: Rng): void {
  const shape = scalloped(c, r, 10, rng, 0.22);
  b.cast(shape, r * 0.35, 0.14);
  b.body(shape, '#55683a', 0.68);
  for (let i = 0; i < r * 1.5; i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.9);
    const a = rng() * TAU;
    b.line([polar(p, a, 2.5), polar(p, a + Math.PI, 2.5)], 0.45, 0.5, '#26331e');
  }
  b.shade(shape, r * 0.45, '#26331e', 0.38);
  for (let i = 0; i < r * 1.3; i++) {
    const p = polar(c, rng() * TAU, r * Math.sqrt(rng()) * 0.85);
    b.dot(p.x, p.y, 1.3 + rng(), rng() < 0.8 ? '#f0c23a' : '#f7e08a', 0.95);
  }
  b.edge(shape, 0.9, 0.75);
}

/** A bamboo clump from above: a ring of culm tops, sprays of narrow leaves fanning out from them. */
export function bamboo(b: Brush, c: Pt, r: number, rng: Rng): void {
  const green = '#7fa05a';
  const culms = Array.from({ length: 10 + Math.floor(rng() * 6) }, () => polar(c, rng() * TAU, r * 0.35 * Math.sqrt(rng())));
  b.smudge(pt(c.x + r * 0.3, c.y + r * 0.4), r, r * 0.7, rng);
  const leaves: Pt[][] = [];
  for (let i = 0; i < 26; i++) {
    const from = culms[i % culms.length]!;
    const a = Math.atan2(from.y - c.y, from.x - c.x) + (rng() - 0.5) * 1.6;
    const l = r * (0.5 + rng() * 0.6);
    const tip = polar(from, a, l);
    const n = pt(-Math.sin(a) * 2.6, Math.cos(a) * 2.6);
    const m = polar(from, a, l * 0.5);
    leaves.push([from, pt(m.x + n.x, m.y + n.y), tip, pt(m.x - n.x, m.y - n.y)]);
  }
  for (const l of leaves) b.cast(l, r * 0.3, 0.06);
  for (const l of leaves) {
    b.body(l, mix(green, '#c9d68a', rng() * 0.4), 0.6);
    b.line([l[0]!, l[2]!], 0.4, 0.5);
    if (rng() < 0.5) b.edge(l, 0.5, 0.5);
  }
  for (const p of culms) {
    const top = oval(p.x, p.y, 3.2, 3.2, 10);
    b.body(top, '#c8b878', 0.8);
    b.edge(top, 0.6, 0.8);
  }
}

/** Reeds from the front at the water's edge: long tapering blades, a bulrush or two. */
export function reeds(b: Brush, c: Pt, h: number, rng: Rng): void {
  const blade = '#6f8a45';
  if (!b.draft) b.pen.fill(oval(c.x + h * 0.25, c.y + 2, h * 0.45, h * 0.12, 16), '#2c4f3c', 0.16);
  for (let i = 0; i < 9 + Math.floor(rng() * 4); i++) {
    const lean = (rng() - 0.5) * 1.1;
    const l = h * (0.7 + rng() * 0.6);
    const root = pt(c.x + (rng() - 0.5) * h * 0.35, c.y);
    const tip = pt(root.x + Math.sin(lean) * l, root.y - Math.cos(lean) * l);
    const spine = bezier(root, pt(root.x + Math.sin(lean) * l * 0.25, root.y - l * 0.6), tip, 8);
    const shape = [...spine.map((p, k) => pt(p.x - 1.4 * (1 - k / 8), p.y)), ...[...spine].reverse().map((p, k) => pt(p.x + 1.4 * (k / 8), p.y))];
    b.body(shape, rng() < 0.6 ? blade : mix(blade, '#c9b46a', 0.4), 0.7);
    b.line(spine, 0.5, 0.75, mix(blade, '#1b1a1f', 0.5));
  }
  for (let i = 0; i < 1 + Math.floor(rng() * 2); i++) {
    const x = c.x + (rng() - 0.5) * h * 0.3;
    const top = pt(x + (rng() - 0.5) * 6, c.y - h * (1.1 + rng() * 0.3));
    b.line([pt(x, c.y), top], 0.7, 0.85);
    const head = oval(top.x, top.y + 8, 2.8, 7, 12);
    b.body(head, '#7a5636', 0.9);
    b.edge(head, 0.5, 0.75);
  }
}

/** Cabbage-like rosette from above: overlapping round leaves, veined. */
export function rosette(b: Brush, c: Pt, r: number, rng: Rng, tone = '#7fa36a'): void {
  const outer = scalloped(c, r, 6, rng, 0.25);
  b.cast(outer, r * 0.4, 0.15);
  b.body(outer, mix(tone, '#4f7a4a', 0.3), 0.65);
  b.shade(outer, r * 0.4, '#2f4f2f', 0.3);
  b.edge(outer, 0.7, 0.7);
  const inner = scalloped(pt(c.x - 0.5, c.y - 0.8), r * 0.55, 5, rng, 0.2);
  b.body(inner, mix(tone, '#d9e6b0', 0.35), 0.7);
  for (let i = 0; i < 5; i++) b.line([c, polar(c, (i / 5) * TAU + rng() * 0.4, r * 0.85)], 0.35, 0.4);
  b.edge(inner, 0.6, 0.6);
}
