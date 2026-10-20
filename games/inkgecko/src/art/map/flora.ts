import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, oval, pt, shade, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';

/**
 * The garden's plants and small things as the map paints them, in world
 * px: the boards' ferns, clover, fallen leaves and pebbles, plus shrubs,
 * trees, reeds, kingcups and lilies for the pond. Each takes a Draw whose
 * pen is seeded for that one thing.
 */
export const CLOVER = '#78a65a';
export const FALL = ['#d3a24c', '#c4733f', '#a3a35a', '#c98f46'] as const;
export const BLOOMS = ['#9b86c4', '#d0607a', '#f2efe6', '#e6b34a', '#c7637f'] as const;
const DEEP_LEAF = '#3f6b3a';
const BULRUSH = '#7a5636';
const KINGCUP = '#e9c23b';
const LILY = '#6f9a52';

/** A soft cast shadow of `shape`, thrown towards the lower right. */
export function castShadow(d: Draw, shape: readonly Pt[], k: number, alpha = 0.12): void {
  d.pen.fill(shape.map((p) => pt(p.x + k * 0.55, p.y + k * 0.84)), d.ink, alpha);
}

/** A closed outline with `lobes` soft scallops round radius r: a bush or a crown seen from above. */
export function scalloped(c: Pt, r: number, lobes: number, rng: Rng, depth = 0.12): Pt[] {
  const n = lobes * 5;
  const ph = rng() * TAU;
  const amp = Array.from({ length: lobes }, () => 0.7 + rng() * 0.6);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + ph;
    const lobe = Math.floor(i / 5);
    const u = (i % 5) / 5;
    const rr = r * (1 - depth + depth * amp[lobe]! * Math.sin(Math.PI * u) ** 0.6);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
}

/** A pebble with its shadow. */
export function pebble(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = oval(c.x, c.y, r * (1 + rng() * 0.4), r, 14);
  castShadow(d, shape, r * 0.6);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(STONE, STONE_DARK, rng()), 0.55);
  pen.crescent(shape, pt(-r * 0.35, -r * 0.5), () => pen.fill(shape, STONE_DARK, 0.4));
  pen.hair(closed(shape), 0.5, d.ink, 0.6);
}

/** A fallen leaf: an ovate blade with a midrib and veins, and its shadow. */
export function fallenLeaf(d: Draw, c: Pt, len: number, ang: number, colour: string): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * len + nrm.x * b * len, c.y + dir.y * a * len + nrm.y * b * len);
  const blade = [...cub(at(-0.5, 0), at(-0.35, 0.36), at(0.25, 0.32), at(0.5, 0), 10), ...cub(at(0.5, 0), at(0.25, -0.3), at(-0.35, -0.34), at(-0.5, 0), 10).slice(1)];
  castShadow(d, blade, 4, 0.07);
  pen.fill(blade, PAPER_FILL, 0.9);
  pen.fill(blade, colour, 0.6);
  pen.crescent(blade, pt(-2, -3), () => pen.fill(blade, mix(colour, d.ink, 0.45), 0.3));
  pen.hair([at(-0.62, 0), at(0.45, 0)], 0.6, d.ink, 0.55);
  for (const k of [-1, 1]) pen.hair([at(0.12 * k, 0), at(0.12 * k + 0.16, 0.2)], 0.35, d.ink, 0.35);
  pen.stroke(closed(blade), 0.7, d.ink, 0.65, false);
}

/** A clover leaf: three heart-shaped leaflets, each with its pale chevron. */
export function cloverLeaf(d: Draw, c: Pt, r: number, turn: number): void {
  const { pen } = d;
  for (let i = 0; i < 3; i++) {
    const ang = turn + (i / 3) * TAU;
    const dir = pt(Math.cos(ang), Math.sin(ang));
    const nrm = pt(-dir.y, dir.x);
    const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * r + nrm.x * b * r, c.y + dir.y * a * r + nrm.y * b * r);
    const leaf = [at(0, 0), ...cub(at(0, 0), at(0.4, 0.75), at(1.05, 0.6), at(0.92, 0.02), 6).slice(1), ...cub(at(0.92, -0.02), at(1.05, -0.6), at(0.4, -0.75), at(0, 0), 6).slice(1)];
    pen.fill(leaf, CLOVER, 0.55);
    pen.hair([at(0.35, 0.3), at(0.55, 0), at(0.35, -0.3)], 0.6, PAPER_FILL, 0.55);
    pen.hair(closed(leaf), 0.45, d.ink, 0.5);
  }
}

/** A fern frond: a curving stem with paired leaflets shrinking to the tip. */
function frond(d: Draw, base: Pt, ang: number, len: number, bend: number): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const tip = pt(base.x + dir.x * len + nrm.x * bend, base.y + dir.y * len + nrm.y * bend);
  const mid = pt(base.x + dir.x * len * 0.5 + nrm.x * bend * 0.2, base.y + dir.y * len * 0.5 + nrm.y * bend * 0.2);
  const rachis = bezier(base, mid, tip, 22);
  const wash = mix(LEAF, '#ffffff', 0.12);
  for (let i = 3; i < rachis.length - 1; i++) {
    const p = rachis[i]!;
    const q = rachis[i + 1]!;
    const t = i / rachis.length;
    const tl = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const u = pt((q.x - p.x) / tl, (q.y - p.y) / tl);
    const size = len * 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 2;
    for (const side of [1, -1]) {
      const v = pt(-u.y * side, u.x * side);
      const end = pt(p.x + (v.x * 0.9 + u.x * 0.45) * size, p.y + (v.y * 0.9 + u.y * 0.45) * size);
      const w = size * 0.28;
      const leaf = [p, ...bezier(p, pt((p.x + end.x) / 2 + u.x * w, (p.y + end.y) / 2 + u.y * w), end, 4).slice(1), ...bezier(end, pt((p.x + end.x) / 2 - u.x * w, (p.y + end.y) / 2 - u.y * w), p, 4).slice(1)];
      pen.fill(leaf, wash, 0.5);
      if (i % 3 === 0) pen.hair(leaf, 0.4, d.ink, 0.4);
    }
  }
  pen.stroke(rachis, 1, mix(LEAF, d.ink, 0.5), 0.75, false);
}

/** A clump of fern fronds fanning out from a point. */
export function fern(d: Draw, base: Pt, ang: number, spread: number, len: number, n = 5): void {
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5;
    frond(d, base, ang + k * spread, len * (0.75 + 0.25 * Math.cos(k * 2)), (k < 0 ? -1 : 1) * len * 0.12);
  }
}

/** A bush seen from above: a scalloped mound of foliage, lit at the upper left, perhaps in flower. */
export function shrub(d: Draw, c: Pt, r: number, rng: Rng, bloom: string | null, tone = LEAF): void {
  const { pen } = d;
  const body = scalloped(c, r, Math.max(6, Math.round(r / 7)), rng);
  castShadow(d, body, r * 0.35, 0.13);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(tone, MOSS, rng() * 0.5), 0.6);
  // Lit tufts towards the light, darker hollows on the far side.
  for (let i = 0; i < 4; i++) {
    const a = -2.2 + (rng() - 0.5) * 1.6;
    const k = r * (0.2 + rng() * 0.35);
    pen.fill(scalloped(pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k), r * (0.3 + rng() * 0.2), 5, rng, 0.2), mix(MOSS, '#ffffff', 0.3), 0.35);
  }
  pen.crescent(body, pt(-r * 0.3, -r * 0.45), () => pen.fill(body, DEEP_LEAF, 0.35));
  shade(d, body, 0.28);
  for (let i = 0; i < Math.round(r / 4); i++) {
    const a = rng() * TAU;
    const k = r * Math.sqrt(rng()) * 0.85;
    const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k);
    const b = rng() * TAU;
    pen.hair([pt(p.x + Math.cos(b) * 3, p.y + Math.sin(b) * 3), p, pt(p.x + Math.cos(b + 1.2) * 3, p.y + Math.sin(b + 1.2) * 3)], 0.4, d.ink, 0.4);
  }
  if (bloom) {
    for (let i = 0; i < Math.round(r / 2.5); i++) {
      const a = rng() * TAU;
      const k = r * Math.sqrt(rng()) * 0.85;
      const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k);
      pen.dot(p.x, p.y, 1.6 + rng() * 1.4, bloom, 0.85);
      if (rng() < 0.4) pen.dot(p.x - 0.5, p.y - 0.6, 0.6, PAPER_FILL, 0.8);
    }
  }
  pen.stroke(closed(body), 0.9, d.ink, 0.7);
}

/** A tree's crown from above, overhanging from the page's edge, with its shadow pooled on the lawn. */
export function treeCrown(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const crown = scalloped(c, r, 11, rng, 0.1);
  const shadow = crown.map((p) => pt(p.x + r * 0.22, p.y + r * 0.34));
  pen.fill(shadow, DEEP_LEAF, 0.16);
  pen.fill(shadow, d.ink, 0.06);
  pen.hatch(shadow, 5, 0.9, 0.45, { color: d.ink, alpha: 0.14 });
  pen.fill(crown, PAPER_FILL, 1);
  pen.fill(crown, mix(LEAF, DEEP_LEAF, 0.2), 0.6);
  const lobes = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * TAU + rng();
    const k = r * (0.35 + rng() * 0.25);
    return { p: pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k), r: r * (0.35 + rng() * 0.15) };
  });
  for (const l of lobes) {
    const s = scalloped(l.p, l.r, 7, rng, 0.14);
    pen.fill(s, mix(LEAF, MOSS, rng() * 0.6), 0.28);
    pen.crescent(s, pt(-l.r * 0.35, -l.r * 0.5), () => pen.fill(s, DEEP_LEAF, 0.3));
    pen.hair(closed(s).slice(4, 22), 0.55, d.ink, 0.35);
  }
  for (const l of lobes) {
    const s = scalloped(pt(l.p.x - l.r * 0.25, l.p.y - l.r * 0.35), l.r * 0.45, 5, rng, 0.2);
    pen.fill(s, mix(MOSS, '#ffffff', 0.35), 0.35);
  }
  pen.crescent(crown, pt(-r * 0.25, -r * 0.38), () => pen.hatch(crown, 4, 0.9, 0.5, { color: d.ink, alpha: 0.22 }));
  pen.stroke(closed(crown), 1.2, d.ink, 0.75);
}

/** A grass tuft: a few blades fanning up from one point. */
export function tuft(d: Draw, c: Pt, s: number, rng: Rng, colour = mix(LEAF, '#26316a', 0.35)): void {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 4 - 0.5) * 1.6 + (rng() - 0.5) * 0.3;
    const l = s * (0.6 + rng() * 0.5);
    const tip = pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l);
    d.pen.hair(bezier(c, pt((c.x + tip.x) / 2 + 1.5, (c.y + tip.y) / 2), tip, 4), 0.55, colour, 0.65);
  }
}

/**
 * A clump of reeds standing up from the bank (drawn a little from the
 * front, like the arch and the wall): long tapering blades leaning out from
 * the root, two or three bulrushes on their stalks, a shadow at the foot.
 */
export function reeds(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + r * 0.3, c.y + 2, r * 0.55, r * 0.14, 16), DEEP_LEAF, 0.18);
  const blade = mix(LEAF, '#5e7a3a', 0.5);
  const n = 9 + Math.floor(rng() * 5);
  const blades = Array.from({ length: n }, () => ({ x: c.x + (rng() - 0.5) * r * 0.45, lean: (rng() - 0.5) * 1.1, h: r * (0.9 + rng() * 0.9), w: 2.2 + rng() * 1.6, tone: rng() }));
  blades.sort((p, q) => q.h - p.h);
  for (const b of blades) {
    const tip = pt(b.x + Math.sin(b.lean) * b.h, c.y - Math.cos(b.lean) * b.h);
    const ctrl = pt(b.x + Math.sin(b.lean) * b.h * 0.25, c.y - b.h * 0.6);
    const spine = bezier(pt(b.x, c.y), ctrl, tip, 10);
    const nn = spine.map((p, i) => {
      const q = spine[Math.min(spine.length - 1, i + 1)]!;
      const o = spine[Math.max(0, i - 1)]!;
      const l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
      const half = (b.w / 2) * (1 - i / (spine.length - 1)) ** 0.8;
      return { l: pt(p.x - ((q.y - o.y) / l) * half, p.y + ((q.x - o.x) / l) * half), r: pt(p.x + ((q.y - o.y) / l) * half, p.y - ((q.x - o.x) / l) * half) };
    });
    const shape = [...nn.map((e) => e.l), ...nn.map((e) => e.r).reverse()];
    pen.fill(shape, PAPER_FILL, 0.9);
    pen.fill(shape, b.tone < 0.6 ? blade : mix(blade, '#c9b46a', 0.4), 0.7);
    pen.hair(spine, 0.5, mix(blade, d.ink, 0.55), 0.75);
  }
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
    const x = c.x + (rng() - 0.5) * r * 0.4;
    const lean = (rng() - 0.5) * 0.4;
    const h = r * (1.2 + rng() * 0.5);
    const top = pt(x + Math.sin(lean) * h, c.y - Math.cos(lean) * h);
    pen.hair([pt(x, c.y), pt((x + top.x) / 2, (c.y + top.y) / 2), top], 0.7, mix(blade, d.ink, 0.4), 0.85);
    const head = oval(top.x, top.y + 9, 3, 8, 14);
    pen.fill(head, BULRUSH, 0.9);
    pen.crescent(head, pt(-1.2, -1.6), () => pen.fill(head, d.ink, 0.3));
    pen.hair(closed(head), 0.5, d.ink, 0.75);
    pen.dot(top.x - 1, top.y + 5, 0.7, PAPER_FILL, 0.6);
  }
}

/** Kingcups (marsh marigolds): round glossy leaves and golden cups at the water's edge. */
export function kingcups(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  for (let i = 0; i < 5; i++) {
    const p = pt(c.x + (rng() - 0.5) * 34, c.y + (rng() - 0.5) * 22);
    const r = 6 + rng() * 4;
    const leaf = oval(p.x, p.y, r, r * 0.9, 16);
    castShadow(d, leaf, 3, 0.1);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, DEEP_LEAF, 0.55);
    pen.hair([pt(p.x, p.y + r * 0.9), p], 0.4, PAPER_FILL, 0.6);
    pen.hair(closed(leaf), 0.5, d.ink, 0.6);
  }
  for (let i = 0; i < 4; i++) {
    const p = pt(c.x + (rng() - 0.5) * 30, c.y + (rng() - 0.5) * 18);
    const petals = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * TAU + rng() * 0.3;
      return oval(p.x + Math.cos(a) * 2.6, p.y + Math.sin(a) * 2.6, 2.8, 2.8, 8);
    });
    for (const s of petals) pen.fill(s, KINGCUP, 0.9);
    pen.dot(p.x, p.y, 1.4, '#b7782a', 0.9);
    pen.hair(closed(oval(p.x, p.y, 4.8, 4.8, 14)), 0.4, d.ink, 0.45);
  }
}

/** A lily pad with its notch, and perhaps a water-lily in flower. */
export function lilyPad(d: Draw, c: Pt, r: number, ang: number, rng: Rng, flower: string | null): void {
  const { pen } = d;
  const n = 20;
  const pad = [c, ...Array.from({ length: n + 1 }, (_, i) => {
    const a = ang + 0.22 + (i / n) * (TAU - 0.44);
    const rr = r * (1 + Math.sin(a * 3) * 0.03);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.92);
  })];
  pen.fill(pad.map((p) => pt(p.x + 2, p.y + 3)), '#2c4f5c', 0.12);
  pen.fill(pad, PAPER_FILL, 0.9);
  pen.fill(pad, mix(LILY, MOSS, rng() * 0.6), 0.62);
  pen.crescent(pad, pt(-r * 0.25, -r * 0.35), () => pen.fill(pad, DEEP_LEAF, 0.3));
  for (let i = 0; i < 5; i++) {
    const a = ang + 0.6 + (i / 4) * (TAU - 1.2);
    pen.hair([c, pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.8)], 0.35, d.ink, 0.25);
  }
  pen.stroke(closed(pad), 0.8, d.ink, 0.7, false);
  if (!flower) return;
  const f = pt(c.x + (rng() - 0.5) * r * 0.5, c.y + (rng() - 0.5) * r * 0.5);
  for (const [k, ring] of [[0, 9], [0.3, 6]] as const) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + k;
      const tip = pt(f.x + Math.cos(a) * ring, f.y + Math.sin(a) * ring);
      const nn = pt(-Math.sin(a) * 2.8, Math.cos(a) * 2.8);
      const petal = [f, ...bezier(f, pt((f.x + tip.x) / 2 + nn.x, (f.y + tip.y) / 2 + nn.y), tip, 4).slice(1), ...bezier(tip, pt((f.x + tip.x) / 2 - nn.x, (f.y + tip.y) / 2 - nn.y), f, 4).slice(1)];
      pen.fill(petal, PAPER_FILL, 1);
      pen.fill(petal, flower, k === 0 ? 0.45 : 0.7);
      pen.hair(closed(petal), 0.35, d.ink, 0.45);
    }
  }
  pen.dot(f.x, f.y, 2, KINGCUP, 1);
}

/** Rings spreading where a fish rose. */
export function ripple(d: Draw, c: Pt, r: number, rng: Rng): void {
  for (const k of [1, 0.66, 0.36]) {
    const a0 = rng() * TAU;
    const ring = oval(c.x, c.y, r * k, r * k * 0.9, 28);
    d.pen.hair([...ring.slice(Math.floor(a0) % 28), ...ring.slice(0, Math.floor(a0) % 28)].slice(0, 20), 0.5, d.ink, 0.3 * k + 0.1);
  }
}

/** A koi glimpsed under the water: soft orange and white, its outline faint. */
export function koi(d: Draw, c: Pt, len: number, ang: number, rng: Rng): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * len + nrm.x * b * len, c.y + dir.y * a * len + nrm.y * b * len);
  const sway = (rng() - 0.5) * 0.25;
  const body = [...cub(at(0.5, 0), at(0.42, 0.2), at(-0.1, 0.18), at(-0.42, sway), 10), ...cub(at(-0.42, sway), at(-0.1, -0.18), at(0.42, -0.2), at(0.5, 0), 10).slice(1)];
  const tail = [at(-0.4, sway), at(-0.62, sway + 0.2), at(-0.56, sway), at(-0.62, sway - 0.2)];
  pen.fill(tail, '#e08a3c', 0.4);
  pen.fill(body, '#e08a3c', 0.5);
  pen.fill(oval(at(0.1, 0.02).x, at(0.1, 0.02).y, len * 0.12, len * 0.08, 10), PAPER_FILL, 0.55);
  pen.hair(closed(body), 0.45, d.ink, 0.3);
  pen.hair(closed(tail), 0.4, d.ink, 0.25);
}

/** A flat stepping stone, wet at its foot. */
export function steppingStone(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const s = scalloped(c, r, 5, rng, 0.08).map((p) => pt(p.x, c.y + (p.y - c.y) * 0.8));
  pen.fill(s.map((p) => pt(p.x + 3, p.y + 4)), '#2c4f5c', 0.22);
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, mix(STONE, STONE_DARK, rng() * 0.4), 0.6);
  pen.clipped(s, () => pen.stipple(s, 30, () => 0.6, 0.45, STONE_DARK));
  pen.crescent(s, pt(-3, -4.5), () => pen.fill(s, STONE_DARK, 0.4));
  pen.stroke(closed(s), 0.9, d.ink, 0.8, false);
}
