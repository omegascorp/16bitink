import type { Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { edging, leafShape, netting } from './allotmentKit';
import { castShadow, scalloped, shrub } from './flora';

/**
 * The allotment's vegetables as the map paints them, in world px, each a
 * bed's worth laid out in rows: cabbages, lettuces, carrots, onions, chard,
 * potatoes earthed up, strawberries on straw, squash sprawling with its
 * pumpkins, sweetcorn, and runner beans climbing a row of canes or a
 * wigwam, in scarlet flower.
 */
export type Crop = 'cabbage' | 'lettuce' | 'carrot' | 'onion' | 'chard' | 'potato' | 'strawberry' | 'pumpkin' | 'corn' | 'beans' | 'wigwams' | 'currants' | 'rhubarb' | 'flowers';

export interface Bed {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly crop: Crop;
  /** Boarded edges (a raised bed) or a plain dug edge. */
  readonly raised: boolean;
  /** A net stretched over it on posts, to keep the birds off. */
  readonly netted: boolean;
}

const BRASSICA = '#7f9f8a';
const FRESH = '#8dbb5a';
const DEEP_LEAF = '#3f6b3a';
const CANE = '#c7a76a';
const SCARLET = '#d23a2a';
const PUMPKIN = '#e0802e';

/** Many small marks stroked at once, round-capped: leaf ribs, stems, canes. Far cheaper than a pen line each. */
function lines(d: Draw, segs: readonly (readonly Pt[])[], w: number, colour: string, alpha: number): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const seg of segs) seg.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** Plant positions in rows along the bed's length, inset from its edges. */
function rowsOf(b: Bed, gap: number, step: number, rng: Rng, inset = 10): Pt[] {
  const out: Pt[] = [];
  const h = b.y1 - b.y0 - inset * 2;
  const n = Math.max(1, Math.round(h / gap));
  for (let j = 0; j < n; j++) {
    const y = b.y0 + inset + ((j + 0.5) * h) / n;
    const off = (j % 2) * step * 0.5;
    for (let x = b.x0 + inset + step * 0.5 + off; x < b.x1 - inset; x += step) out.push(pt(x + (rng() - 0.5) * step * 0.15, y + (rng() - 0.5) * 2));
  }
  return out;
}

function cabbage(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const outer = scalloped(c, r, 7, rng, 0.2);
  castShadow(d, outer, r * 0.45, 0.14);
  pen.fill(outer, PAPER_FILL, 1);
  pen.fill(outer, mix(BRASSICA, '#6f8fa6', rng() * 0.5), 0.72);
  lines(d, Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * TAU + rng() * 0.4;
    return [c, pt(c.x + Math.cos(a) * r * 0.9, c.y + Math.sin(a) * r * 0.9)];
  }), 0.45, PAPER_FILL, 0.6);
  const heart = oval(c.x - r * 0.08, c.y - r * 0.1, r * 0.5, r * 0.48, 12);
  pen.fill(heart, mix(BRASSICA, '#e6efd8', 0.45), 0.85);
  lines(d, [closed(heart).slice(3, 12)], 0.45, d.ink, 0.55);
  pen.crescent(outer, pt(-r * 0.3, -r * 0.42), () => pen.fill(outer, '#33524a', 0.32));
  lines(d, [closed(outer)], 0.6, d.ink, 0.7);
}

function lettuce(d: Draw, c: Pt, r: number, rng: Rng, red: boolean): void {
  const { pen } = d;
  const body = scalloped(c, r, 9, rng, 0.28);
  castShadow(d, body, r * 0.35, 0.12);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, red ? mix(FRESH, '#9a4a4a', 0.55) : FRESH, 0.72);
  pen.fill(scalloped(pt(c.x - r * 0.15, c.y - r * 0.18), r * 0.5, 6, rng, 0.25), mix(FRESH, '#f2f5d0', 0.5), 0.6);
  pen.crescent(body, pt(-r * 0.3, -r * 0.4), () => pen.fill(body, DEEP_LEAF, 0.3));
  pen.hair(Array.from({ length: 9 }, (_, k) => pt(c.x + Math.cos(k * 0.95) * k * 0.45, c.y + Math.sin(k * 0.95) * k * 0.45)), 0.4, d.ink, 0.45);
  lines(d, [closed(body)], 0.55, d.ink, 0.65);
}

/** Carrot tops: a feathery spray, the orange shoulder just showing. */
function carrot(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  pen.dot(c.x + 3, c.y + 4, 5, d.ink, 0.07);
  const tips = Array.from({ length: 6 }, (_, k) => {
    const a = -Math.PI / 2 + (k / 5 - 0.5) * 2.6 + (rng() - 0.5) * 0.3;
    const l = 7 + rng() * 4;
    return pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l);
  });
  lines(d, tips.map((t) => [c, t]), 0.7, mix(FRESH, '#4f8a3a', 0.5), 0.85);
  lines(d, tips.map((t) => [t, pt(t.x + 0.2, t.y)]), 2.4, FRESH, 0.8);
  pen.dot(c.x, c.y + 0.5, 1.9, '#e07a2a', 0.95);
}

function onion(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const bulb = oval(c.x, c.y, 4, 3.6, 10);
  pen.fill(bulb.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.12);
  pen.fill(bulb, PAPER_FILL, 1);
  pen.fill(bulb, rng() < 0.3 ? '#a8566a' : '#d8b878', 0.75);
  lines(d, [closed(bulb)], 0.45, d.ink, 0.7);
  lines(d, Array.from({ length: 3 }, (_, k) => {
    const a = -2.3 + k * 0.5 + (rng() - 0.5) * 0.3;
    return bezier(c, pt(c.x + Math.cos(a) * 6, c.y + Math.sin(a) * 6 - 2), pt(c.x + Math.cos(a) * 12, c.y + Math.sin(a) * 11), 5);
  }), 0.9, mix(BRASSICA, LEAF, 0.4), 0.85);
}

function chard(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const stem = ['#d23a4a', '#e8c23a', '#e07a9a', '#f2efe6'][Math.floor(rng() * 4)]!;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + rng() * 0.6;
    const leaf = leafShape(c, a, 13 + rng() * 3, 4.5);
    pen.fill(leaf.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.08);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(DEEP_LEAF, LEAF, rng() * 0.5), 0.75);
    pen.hair([c, pt(c.x + Math.cos(a) * 11, c.y + Math.sin(a) * 11)], 1.1, stem, 0.9);
    lines(d, [closed(leaf)], 0.45, d.ink, 0.6);
  }
}

function potato(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, 10 + rng() * 2, 7, rng, 0.3);
  castShadow(d, body, 5, 0.14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(LEAF, DEEP_LEAF, 0.35), 0.66);
  for (let k = 0; k < 5; k++) {
    const a = rng() * TAU;
    pen.fill(scalloped(pt(c.x + Math.cos(a) * 4, c.y + Math.sin(a) * 4), 3.5, 4, rng, 0.3), mix(MOSS, '#ffffff', 0.25), 0.4);
  }
  pen.crescent(body, pt(-3, -4), () => pen.fill(body, DEEP_LEAF, 0.3));
  if (rng() < 0.5) for (let k = 0; k < 3; k++) pen.dot(c.x + (rng() - 0.5) * 12, c.y + (rng() - 0.5) * 12, 1.3, rng() < 0.5 ? '#f2efe6' : '#b7a0d0', 0.95);
  lines(d, [closed(body)], 0.5, d.ink, 0.6);
}

function strawberry(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + rng();
    const leaf = scalloped(pt(c.x + Math.cos(a) * 3.6, c.y + Math.sin(a) * 3.6), 3.4, 5, rng, 0.25);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(LEAF, DEEP_LEAF, 0.2), 0.75);
    lines(d, [closed(leaf)], 0.35, d.ink, 0.55);
  }
  for (let k = 0; k < 2; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 7);
    pen.dot(p.x + 0.8, p.y + 1.2, 2.2, d.ink, 0.12);
    pen.dot(p.x, p.y, 2.2, k === 0 ? '#d8322e' : rng() < 0.5 ? '#d8322e' : '#e9e0a0', 0.95);
    pen.dot(p.x - 0.7, p.y - 0.7, 0.5, PAPER_FILL, 0.9);
  }
}

/** Squash vines over the bed: broad lobed leaves on runners, pumpkins ripening among them. */
function pumpkins(d: Draw, b: Bed, rng: Rng): void {
  const { pen } = d;
  const n = Math.max(2, Math.round((b.x1 - b.x0) / 70));
  const fruit: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const root = pt(b.x0 + ((i + 0.5) * (b.x1 - b.x0)) / n, (b.y0 + b.y1) / 2 + (rng() - 0.5) * 10);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + rng() * 0.5;
      const dist = 6 + rng() * 22;
      const c = pt(root.x + Math.cos(a) * dist * 1.3, root.y + Math.sin(a) * dist * 0.7);
      const r = 10 + rng() * 5;
      pen.hair([root, c], 0.8, mix(LEAF, DEEP_LEAF, 0.3), 0.7);
      const leaf = scalloped(c, r, 5, rng, 0.32);
      castShadow(d, leaf, 5, 0.1);
      pen.fill(leaf, PAPER_FILL, 1);
      pen.fill(leaf, mix(LEAF, MOSS, rng() * 0.5), 0.7);
      lines(d, Array.from({ length: 5 }, (_, v) => [c, pt(c.x + Math.cos(v * 1.26 + a) * r * 0.75, c.y + Math.sin(v * 1.26 + a) * r * 0.75)]), 0.35, PAPER_FILL, 0.6);
      pen.crescent(leaf, pt(-r * 0.3, -r * 0.4), () => pen.fill(leaf, DEEP_LEAF, 0.28));
      lines(d, [closed(leaf)], 0.5, d.ink, 0.6);
    }
    if (rng() < 0.85) fruit.push(pt(root.x + (rng() - 0.5) * 40, root.y + (rng() - 0.5) * 18));
  }
  for (const c of fruit) {
    const r = 7 + rng() * 3;
    const body = oval(c.x, c.y, r * 1.12, r, 16);
    castShadow(d, body, r * 0.6, 0.18);
    pen.fill(body, PAPER_FILL, 1);
    pen.fill(body, rng() < 0.8 ? PUMPKIN : '#d8c25a', 0.9);
    for (const k of [-0.55, 0, 0.55]) pen.hair(bezier(pt(c.x + k * r, c.y - r * 0.92), pt(c.x + k * r * 1.5, c.y), pt(c.x + k * r, c.y + r * 0.92), 5), 0.45, d.ink, 0.45);
    pen.crescent(body, pt(-r * 0.3, -r * 0.45), () => pen.fill(body, '#8a3f1a', 0.3));
    pen.dot(c.x - r * 0.35, c.y - r * 0.4, 1.4, PAPER_FILL, 0.6);
    pen.hair([pt(c.x, c.y - 1), pt(c.x + 2, c.y - 3.5)], 1.4, '#5f6a3a', 0.9);
    lines(d, [closed(body)], 0.6, d.ink, 0.8);
  }
}

/** Sweetcorn from above: a star of long blades round the tassel. */
function corn(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const blades: Pt[][] = [];
  for (let k = 0; k < 7; k++) blades.push(leafShape(c, (k / 7) * TAU + rng() * 0.5, 15 + rng() * 6, 2.6));
  for (const l of blades) pen.fill(l.map((p) => pt(p.x + 6, p.y + 9)), d.ink, 0.06);
  for (const l of blades) {
    pen.fill(l, PAPER_FILL, 1);
    pen.fill(l, mix(FRESH, LEAF, rng() * 0.6), 0.8);
    lines(d, [closed(l)], 0.35, d.ink, 0.55);
  }
  lines(d, Array.from({ length: 5 }, () => {
    const a = rng() * TAU;
    return [c, pt(c.x + Math.cos(a) * 4.5, c.y + Math.sin(a) * 4.5)];
  }), 0.9, '#c8a050', 0.9);
}

/** Runner beans up a double row of canes along the bed: the canes' tops crossing over the ridge, leaves heaped along it, scarlet flowers. */
function beanRow(d: Draw, b: Bed, rng: Rng): void {
  const { pen } = d;
  const y = (b.y0 + b.y1) / 2;
  const half = Math.min(18, (b.y1 - b.y0) / 2 - 6);
  const xs: number[] = [];
  for (let x = b.x0 + 10; x < b.x1 - 6; x += 18) xs.push(x);
  const leaves: { c: Pt; r: number }[] = [];
  for (let x = b.x0 + 8; x < b.x1 - 8; x += 9) leaves.push({ c: pt(x, y + (rng() - 0.5) * half * 1.3), r: 6 + rng() * 3 });
  // The row is tall: its shadow falls well down the bed.
  for (const l of leaves) pen.dot(l.c.x + 12, l.c.y + 18, l.r, d.ink, 0.05);
  lines(d, xs.flatMap((x) => [-1, 1].map((s) => [pt(x, y + s * half), pt(x + 2, y)])), 0.9, CANE, 0.9);
  for (const l of leaves) {
    const leaf = scalloped(l.c, l.r, 4, rng, 0.25);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(LEAF, MOSS, rng() * 0.6), 0.72);
    pen.crescent(leaf, pt(-2, -3), () => pen.fill(leaf, DEEP_LEAF, 0.3));
    lines(d, [closed(leaf)], 0.4, d.ink, 0.5);
  }
  pen.stroke([pt(b.x0 + 4, y - 1), pt(b.x1 - 4, y + 1)], 1.3, CANE, 0.95, false);
  pen.hair([pt(b.x0 + 4, y), pt(b.x1 - 4, y + 2)], 0.45, d.ink, 0.6);
  lines(d, xs.flatMap((x) => [[pt(x - 2, y - 4), pt(x + 5, y + 4)], [pt(x - 2, y + 4), pt(x + 5, y - 4)]]), 0.9, CANE, 0.95);
  for (let k = 0; k < (b.x1 - b.x0) / 8; k++) pen.dot(b.x0 + 8 + rng() * (b.x1 - b.x0 - 16), y + (rng() - 0.5) * half * 1.6, 1.4 + rng() * 0.6, SCARLET, 0.92);
}

/** A wigwam of canes with beans or sweet peas up it: the canes' feet in a ring, their tops tied together at the middle. */
function wigwam(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const flower = rng() < 0.5 ? SCARLET : ['#c77bb0', '#9b86c4', '#f2efe6'][Math.floor(rng() * 3)]!;
  pen.fill(oval(c.x + 14, c.y + 20, r, r * 0.9, 18), d.ink, 0.09);
  const feet = Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * TAU + rng() * 0.2;
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
  });
  for (const f of feet) {
    for (let k = 0; k < 4; k++) {
      const u = 0.15 + k * 0.22 + rng() * 0.08;
      const p = pt(f.x + (c.x - f.x) * u + (rng() - 0.5) * 5, f.y + (c.y - f.y) * u + (rng() - 0.5) * 5);
      const leaf = scalloped(p, 5 + rng() * 2.5, 4, rng, 0.25);
      pen.fill(leaf, PAPER_FILL, 1);
      pen.fill(leaf, mix(LEAF, MOSS, rng() * 0.6), 0.72);
      lines(d, [closed(leaf)], 0.4, d.ink, 0.5);
    }
  }
  for (const f of feet) {
    pen.hair([f, pt(c.x + (c.x - f.x) * 0.18, c.y + (c.y - f.y) * 0.18)], 0.9, CANE, 0.95);
    pen.dot(f.x, f.y, 1.2, mix(CANE, d.ink, 0.4), 0.8);
  }
  for (let k = 0; k < 12; k++) {
    const a = rng() * TAU;
    const k2 = r * (0.25 + rng() * 0.7);
    pen.dot(c.x + Math.cos(a) * k2, c.y + Math.sin(a) * k2, 1.5, flower, 0.92);
  }
  pen.circle(c.x, c.y, 2.2, 0.6, '#7a6a4a');
}

function rhubarb(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const leaves = Array.from({ length: 5 }, (_, k) => {
    const a = (k / 5) * TAU + rng() * 0.5;
    return { a, p: pt(c.x + Math.cos(a) * 12, c.y + Math.sin(a) * 11), r: 11 + rng() * 4 };
  });
  for (const l of leaves) pen.dot(l.p.x + 6, l.p.y + 9, l.r, d.ink, 0.07);
  for (const l of leaves) pen.hair([c, l.p], 1.8, '#c2384a', 0.9);
  for (const l of leaves) {
    const leaf = scalloped(l.p, l.r, 6, rng, 0.22);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(DEEP_LEAF, LEAF, 0.4 + rng() * 0.3), 0.72);
    for (let v = -1; v <= 1; v++) pen.hair([pt(l.p.x - Math.cos(l.a) * l.r * 0.6, l.p.y - Math.sin(l.a) * l.r * 0.6), pt(l.p.x + Math.cos(l.a + v * 0.7) * l.r * 0.8, l.p.y + Math.sin(l.a + v * 0.7) * l.r * 0.8)], 0.45, '#e8d8b8', 0.7);
    pen.crescent(leaf, pt(-l.r * 0.3, -l.r * 0.4), () => pen.fill(leaf, DEEP_LEAF, 0.3));
    lines(d, [closed(leaf)], 0.5, d.ink, 0.65);
  }
}

/** Dahlias for cutting: leafy plants, each with a few big blooms. */
function dahlia(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  shrub(d, c, 13, rng, null);
  const colour = ['#d0607a', '#c23f56', '#e8a33a', '#f2efe6', '#9b4fa0', '#e9c23b'][Math.floor(rng() * 6)]!;
  for (let k = 0; k < 3; k++) {
    const p = pt(c.x + (rng() - 0.5) * 14, c.y + (rng() - 0.5) * 14);
    pen.dot(p.x + 1.5, p.y + 2, 5, d.ink, 0.12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      pen.dot(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, 2.2, colour, 0.92);
    }
    pen.dot(p.x, p.y, 1.8, mix(colour, '#6a3a1a', 0.5), 0.9);
    pen.circle(p.x, p.y, 4.8, 0.35, d.ink);
  }
}

/** One bed: its edging, its crop, and its net if it has one. */
export function plantBed(d: Draw, b: Bed, rng: Rng): void {
  edging(d, b);
  sow(d, b, rng);
  if (b.netted) netting(d, b);
}

function sow(d: Draw, b: Bed, rng: Rng): void {
  const each = (gap: number, step: number, draw: (c: Pt) => void, inset = 10): void => rowsOf(b, gap, step, rng, inset).forEach(draw);
  switch (b.crop) {
    case 'cabbage':
      return each(30, 30, (c) => cabbage(d, c, 10 + rng() * 2.5, rng), 14);
    case 'lettuce': {
      const red = rng() < 0.4;
      return each(25, 26, (c) => lettuce(d, c, 8 + rng() * 1.5, rng, red && rng() < 0.6), 12);
    }
    case 'carrot':
      return each(17, 13, (c) => carrot(d, c, rng));
    case 'onion':
      return each(17, 15, (c) => onion(d, c, rng));
    case 'chard':
      return each(30, 28, (c) => chard(d, c, rng), 14);
    case 'potato':
      for (let y = b.y0 + 15; y < b.y1 - 8; y += 26) d.pen.fill(boxPts(b.x0 + 4, y - 6, b.x1 - 4, y + 6, 20), '#a88a68', 0.35);
      return each(26, 24, (c) => potato(d, c, rng), 13);
    case 'strawberry':
      return each(22, 23, (c) => strawberry(d, c, rng));
    case 'pumpkin':
      return pumpkins(d, b, rng);
    case 'corn':
      return each(26, 26, (c) => corn(d, c, rng), 13);
    case 'beans':
      return beanRow(d, b, rng);
    case 'currants':
      return each(b.y1 - b.y0, 44, (c) => shrub(d, c, 17 + rng() * 3, rng, rng() < 0.6 ? '#c8302c' : '#3a2a4a', mix(LEAF, '#2f5a33', 0.2)), 8);
    case 'rhubarb':
      return each(b.y1 - b.y0, 56, (c) => rhubarb(d, c, rng), 8);
    case 'flowers':
      return each(34, 34, (c) => dahlia(d, c, rng), 14);
    case 'wigwams': {
      const n = Math.max(1, Math.floor((b.x1 - b.x0) / 70));
      for (let i = 0; i < n; i++) wigwam(d, pt(b.x0 + ((i + 0.5) * (b.x1 - b.x0)) / n, (b.y0 + b.y1) / 2), Math.min(24, (b.y1 - b.y0) / 2 - 6), rng);
    }
  }
}
