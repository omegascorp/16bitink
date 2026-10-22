import type { Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, ribbon, shade, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { tilted } from './tunnel';
import { mix } from './wash';

/**
 * The ruins' stones and plants, seen from above: dressed limestone blocks
 * worn round at the corners, ivy, wild roses, moss, a toppled urn, an empty
 * statue plinth, a stone bench and fallen masonry (blocks and a broken length
 * of fluted column). Board coordinates; each takes the rng it draws its
 * variety from.
 */
export const LIMESTONE = '#cfc3a6';
export const LIMESTONE_COOL = '#bdbfb2';
export const IVY = '#4e7d45';
const IVY_LIT = '#8cb267';
export const LICHEN = '#cbc57f';
const ROSE = '#ee9db3';
const ROSE_DEEP = '#c95f80';
const ROSE_LEAF = '#5f8a4c';
const SOIL = '#7a5a3e';
const HOLLOW = '#2a2a33';

/** A rectangle centred at c, `len` along unit u and `wide` across it. */
export function rect(c: Pt, u: Pt, len: number, wide: number): Pt[] {
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  return [at(-len / 2, -wide / 2), at(len / 2, -wide / 2), at(len / 2, wide / 2), at(-len / 2, wide / 2)];
}

/** A polygon with each corner cut back by up to `k`: stone worn round at the arrises. */
export function worn(poly: readonly Pt[], k: number): Pt[] {
  return poly.flatMap((p, i) => {
    const a = poly[(i - 1 + poly.length) % poly.length]!;
    const b = poly[(i + 1) % poly.length]!;
    const la = Math.hypot(a.x - p.x, a.y - p.y) || 1;
    const lb = Math.hypot(b.x - p.x, b.y - p.y) || 1;
    const ka = Math.min(k, la / 3);
    const kb = Math.min(k, lb / 3);
    return [pt(p.x + ((a.x - p.x) / la) * ka, p.y + ((a.y - p.y) / la) * ka), pt(p.x + ((b.x - p.x) / lb) * kb, p.y + ((b.y - p.y) / lb) * kb)];
  });
}

const centreOf = (shape: readonly Pt[]): { c: Pt; size: number } => {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { c: pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2), size: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) };
};

/**
 * One dressed limestone block from above, `lift` high: its shadow, a warm
 * or cool wash, weathering and lichen, the top lit towards the light, the
 * far arrises in shade and hatched, a pen outline.
 */
export function ashlar(d: Draw, quad: readonly Pt[], rng: Rng, lift = 6): Pt[] {
  const { pen } = d;
  const shape = outline(worn(quad, 3 + rng() * 3), 5);
  const { c, size } = centreOf(shape);
  if (lift > 0) castShadow(d, shape, lift, 0.2);
  body(d, shape, mix(rng() < 0.55 ? LIMESTONE : LIMESTONE_COOL, STONE_DARK, rng() * 0.25), 0.72);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - SHADOW.x * size * 0.12, c.y - SHADOW.y * size * 0.12), size * 0.32, size * 0.24, rng, 0.3, 14), PAPER_FILL, 0.25);
    pen.stipple(shape, Math.round(size * 1.4), () => 0.6, 0.5, STONE_DARK);
    for (let k = 0; k < 2; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * size * 0.3), size * 0.14, size * 0.09, rng, 0.3, 12), STONE_DARK, 0.1);
    if (rng() < 0.6) {
      const p = polar(c, rng() * TAU, rng() * size * 0.3);
      const lr = 2 + rng() * 3.5;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.25, 12), LICHEN, 0.5);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * 3.5, -SHADOW.y * 3.5), () => pen.fill(shape, mix(STONE_DARK, d.ink, 0.2), 0.42));
  pen.crescent(shape, pt(SHADOW.x * 2.5, SHADOW.y * 2.5), () => pen.fill(shape, PAPER_FILL, 0.35));
  if (size > 26) pen.crescent(shape, pt(-SHADOW.x * 6, -SHADOW.y * 6), () => pen.hatch(shape, 2.8, 0.9, 0.42, { color: d.ink, alpha: 0.3 }));
  pen.stroke(shape, 1, d.ink, 0.88);
  return shape;
}

/** A cushion of moss: soft green, flecked, a faint edge. */
export function mossPatch(d: Draw, c: Pt, r: number, rng: Rng, alpha = 0.6): void {
  const { pen } = d;
  const shape = blob(c, r, r * 0.8, rng, 0.3, 16, rng() * TAU);
  pen.fill(shape, MOSS, alpha * 0.8);
  for (let k = 0; k < r * 2.2; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.9);
    const s = 0.9 + rng() * 1.6;
    pen.fill(oval(p.x, p.y, s, s * 0.8, 7), rng() < 0.4 ? LEAF : '#b9cc78', alpha);
  }
  pen.crescent(shape, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.fill(shape, mix(LEAF, d.ink, 0.4), 0.25));
  pen.hair(closed(shape), 0.4, mix(LEAF, d.ink, 0.5), 0.45);
}

/** One ivy leaf, `s` long, pointing along `ang` from c: five lobes, pale veins, a fine edge. */
export function ivyLeaf(d: Draw, c: Pt, s: number, ang: number, rng: Rng): void {
  const { pen } = d;
  // Three broad, shallow lobes and a heart-shaped base: an ivy leaf, not a sharp one.
  const lobes = [-1.2, 0, 1.2];
  const lens = [0.78, 1, 0.78];
  const shape = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * TAU - Math.PI;
    let k = 0;
    lobes.forEach((l, j) => {
      k = Math.max(k, lens[j]! * Math.exp(-(((a - l) / 0.55) ** 2)));
    });
    k = 0.5 + 0.5 * k;
    if (Math.abs(a) > Math.PI - 0.35) k *= 0.75;
    return polar(pt(c.x - Math.cos(ang) * s * 0.15, c.y - Math.sin(ang) * s * 0.15), ang + a, s * k * 0.85);
  });
  castShadow(d, shape, 1.6, 0.16);
  body(d, shape, mix(IVY, IVY_LIT, rng() * 0.6), 0.85);
  pen.crescent(shape, pt(-SHADOW.x * s * 0.25, -SHADOW.y * s * 0.25), () => pen.fill(shape, mix(IVY, d.ink, 0.4), 0.4));
  for (const l of [-1, 0, 1]) pen.hair([c, polar(c, ang + l, s * 0.55)], 0.35, PAPER_FILL, 0.55);
  pen.hair(closed(shape), 0.45, d.ink, 0.6);
}

/**
 * A run of ivy from `start` heading along `ang`, `len` long: a wandering
 * stem with leaves either side, smaller towards the growing tip. Stops where
 * `ok` says no.
 */
export function ivyRun(d: Draw, start: Pt, ang: number, len: number, rng: Rng, size = 6, ok: (p: Pt) => boolean = () => true): void {
  const stem: Pt[] = [start];
  let a = ang;
  for (let s = 0; s < len; s += 4) {
    a += (rng() - 0.5) * 0.5;
    const p = polar(stem[stem.length - 1]!, a, 4);
    if (!ok(p)) break;
    stem.push(p);
  }
  if (stem.length < 3) return;
  d.pen.stroke(stem, 0.9, mix(IVY, d.ink, 0.55), 0.7, false);
  for (let i = 1; i < stem.length; i += 1 + Math.floor(rng() * 2)) {
    const p = stem[i]!;
    const q = stem[Math.min(stem.length - 1, i + 1)]!;
    const dir = Math.atan2(q.y - p.y, q.x - p.x);
    const side = i % 2 === 0 ? 1 : -1;
    const s = size * (0.55 + 0.45 * (1 - i / stem.length)) * (0.8 + rng() * 0.4);
    const at = polar(p, dir + side * 1.4, s * 0.55);
    d.pen.hair([p, at], 0.4, mix(IVY, d.ink, 0.5), 0.6);
    ivyLeaf(d, at, s, dir + side * (0.7 + rng() * 0.6), rng);
  }
}

/** A mat of ivy round c, ~r across, smothering whatever it grows over: stems under a crowd of leaves. */
export function ivyMat(d: Draw, c: Pt, r: number, rng: Rng): void {
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    d.pen.hair([polar(c, a + Math.PI, r * 0.6), c, polar(c, a + 0.4, r * 0.9)], 0.7, mix(IVY, d.ink, 0.55), 0.6);
  }
  const leaves = Array.from({ length: Math.round((r * r) / 26) }, () => polar(c, rng() * TAU, Math.sqrt(rng()) * r)).sort((p, q) => p.y - q.y);
  for (const p of leaves) ivyLeaf(d, p, 6 + rng() * 3.5, rng() * TAU, rng);
}

/** A wild rose: a loose mound of small leaves with arching canes, studded with pink single flowers and buds. */
export function roseBush(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mound = blob(c, r, r * 0.85, rng, 0.28, 24, rng() * TAU);
  castShadow(d, mound, r * 0.25, 0.16);
  body(d, mound, ROSE_LEAF, 0.55);
  pen.clipped(mound, () => {
    for (let k = 0; k < r * 4; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r);
      const lf = blob(p, 2.6 + rng() * 1.6, 1.5 + rng(), rng, 0.1, 8, rng() * TAU);
      pen.fill(lf, rng() < 0.5 ? mix(ROSE_LEAF, '#b8cf84', 0.4) : mix(ROSE_LEAF, d.ink, 0.35), 0.55);
    }
  });
  pen.crescent(mound, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(mound, mix(ROSE_LEAF, d.ink, 0.5), 0.35));
  pen.crescent(mound, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.hatch(mound, 2.6, 0.9, 0.4, { color: d.ink, alpha: 0.25 }));
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    pen.hair([polar(c, a, r * 0.2), polar(c, a + 0.3, r * 0.7), polar(c, a + 0.5, r * 1.1)], 0.6, mix(ROSE_LEAF, d.ink, 0.5), 0.6);
  }
  pen.hair(closed(mound), 0.5, d.ink, 0.5);
  for (let k = 0; k < 2 + r / 5; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.85);
    const fr = 3 + rng() * 1.8;
    const turn = rng() * TAU;
    const tone = mix(ROSE, PAPER_FILL, rng() * 0.4);
    for (let s = 0; s < 5; s++) {
      const petal = blob(polar(p, turn + (s / 5) * TAU, fr * 0.55), fr * 0.55, fr * 0.45, rng, 0.1, 10, turn + (s / 5) * TAU);
      body(d, petal, tone, 0.85);
      pen.hair(closed(petal), 0.3, ROSE_DEEP, 0.6);
    }
    pen.fill(oval(p.x, p.y, fr * 0.3, fr * 0.3, 8), '#e8c24a', 0.95);
    pen.dot(p.x + 0.4, p.y + 0.5, 0.5, '#9a6a2a', 0.8);
  }
  for (let k = 0; k < r / 8; k++) {
    const p = polar(c, rng() * TAU, r * (0.6 + rng() * 0.35));
    pen.fill(oval(p.x, p.y, 1.6, 1.2, 8), ROSE_DEEP, 0.85);
  }
}

/** Half widths along a toppled urn, foot (0) to lip (1), as shares of its length. */
const URN = [[0, 0.28], [0.07, 0.3], [0.11, 0.15], [0.18, 0.17], [0.3, 0.38], [0.45, 0.45], [0.6, 0.4], [0.72, 0.24], [0.82, 0.2], [0.93, 0.27], [1, 0.32]] as const;
const urnHalf = (t: number): number => {
  for (let i = 1; i < URN.length; i++) {
    const [t1, w1] = URN[i]!;
    const [t0, w0] = URN[i - 1]!;
    if (t <= t1) return w0 + ((w1 - w0) * (t - t0)) / (t1 - t0);
  }
  return URN[URN.length - 1]![1];
};

/** A stone garden urn lying on its side along u, `len` long: gadrooned body, rings, its mouth spilling earth and a trail of ivy. */
export function toppledUrn(d: Draw, c: Pt, u: Pt, len: number, rng: Rng): void {
  const { pen } = d;
  const n = 28;
  const a = pt(c.x - (u.x * len) / 2, c.y - (u.y * len) / 2);
  const spine = Array.from({ length: n + 1 }, (_, i) => pt(a.x + (u.x * len * i) / n, a.y + (u.y * len * i) / n));
  const at = (t: number, k: number): Pt => pt(a.x + u.x * len * t - u.y * k * urnHalf(t) * len, a.y + u.y * len * t + u.x * k * urnHalf(t) * len);
  const lip = spine[n]!;
  // Earth spilled from the mouth, a little ivy grown out of it.
  const spill = blob(polar(lip, Math.atan2(u.y, u.x), len * 0.22), len * 0.24, len * 0.2, rng, 0.35, 18);
  body(d, spill, SOIL, 0.55);
  pen.stipple(spill, 90, () => 0.7, 0.6, mix(SOIL, d.ink, 0.5));
  pen.hair(closed(spill), 0.4, d.ink, 0.35);
  const shape = ribbon(spine, (t) => urnHalf(t) * len * 2).shape;
  castShadow(d, shape, len * 0.12, 0.2);
  body(d, shape, mix(LIMESTONE_COOL, LIMESTONE, rng()), 0.75);
  pen.clipped(shape, () => {
    pen.stipple(shape, Math.round(len * 3), () => 0.6, 0.5, STONE_DARK);
    // Gadroons round the belly, rings at the foot, waist and neck.
    for (let k = -0.8; k <= 0.81; k += 0.32) pen.hair(Array.from({ length: 8 }, (_, i) => at(0.22 + i * 0.045, k)), 0.45, d.ink, 0.4);
    for (const t of [0.07, 0.18, 0.6, 0.72, 0.93]) pen.hair([at(t, -1), at(t, 0), at(t, 1)], 0.55, d.ink, 0.55);
    for (let k = 0; k < 3; k++) pen.fill(blob(at(0.2 + rng() * 0.7, (rng() - 0.5) * 1.4), 2.5 + rng() * 3, 2 + rng() * 2, rng, 0.25, 10), LICHEN, 0.55);
    pen.stroke(spine.map((_, i) => at(i / n, -0.45)), len * 0.08, PAPER_FILL, 0.3, false);
  });
  shade(d, shape, 0.4);
  pen.stroke(closed(shape), 1.2, d.ink, 0.92);
  const mouth = tilted(lip, u, len * 0.05, urnHalf(1) * len, 22);
  body(d, mouth, LIMESTONE_COOL, 0.8);
  const hole = tilted(lip, u, len * 0.03, urnHalf(1) * len * 0.72, 20);
  pen.fill(hole, HOLLOW, 0.85);
  pen.stroke(closed(mouth), 0.9, d.ink, 0.9, false);
  ivyRun(d, lip, Math.atan2(u.y, u.x) + 0.5, len * 0.9, rng, 5);
}

/** An empty statue plinth, `s` square, turned by `turn`: a moulded cap on a broad base, the stump of the lost figure moss-grown on top. */
export function statuePlinth(d: Draw, c: Pt, s: number, turn: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const base = rect(c, u, s * 1.3, s * 1.3);
  const cap = rect(c, u, s, s);
  castShadow(d, cap, s * 0.85, 0.12);
  castShadow(d, cap, s * 0.5, 0.1);
  ashlar(d, base, rng, 4);
  const top = ashlar(d, cap, rng, 8);
  for (const k of [0.84, 0.7]) pen.hair(closed(outline(worn(rect(c, u, s * k, s * k), 2), 5)), 0.55, d.ink, 0.5);
  const stump = blob(polar(c, turn + 0.8, s * 0.05), s * 0.22, s * 0.17, rng, 0.45, 14, turn);
  castShadow(d, stump, 4, 0.22);
  body(d, stump, LIMESTONE, 0.8);
  pen.stipple(stump, 60, () => 0.8, 0.5, STONE_DARK);
  pen.crescent(stump, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(stump, STONE_DARK, 0.4));
  pen.stroke(closed(stump), 0.9, d.ink, 0.85);
  pen.clipped(top, () => mossPatch(d, polar(c, turn + 2.4, s * 0.3), s * 0.16, rng));
}

/** A stone bench, `len` long, facing `facing`: a slab with a moulded front edge on two hidden supports. */
export function stoneBench(d: Draw, c: Pt, facing: Pt, len: number, rng: Rng): void {
  const u = pt(facing.y, -facing.x);
  for (const s of [-1, 1]) castShadow(d, rect(pt(c.x + u.x * s * len * 0.32, c.y + u.y * s * len * 0.32), u, 12, 22), 14, 0.14);
  const slab = ashlar(d, rect(c, u, len, 26), rng, 10);
  const front = rect(pt(c.x + facing.x * 9, c.y + facing.y * 9), u, len - 6, 1);
  d.pen.hair([front[0]!, front[1]!], 0.6, d.ink, 0.5);
  d.pen.clipped(slab, () => mossPatch(d, polar(c, rng() * TAU, len * 0.3), 5 + rng() * 3, rng));
}

/** A broken length of fluted column lying on the ground along u: flutes along it, a dressed end, a broken one. */
export function fallenShaft(d: Draw, c: Pt, u: Pt, len: number, rad: number, rng: Rng): void {
  const { pen } = d;
  const n = Math.max(4, Math.ceil(len / 6));
  const a = pt(c.x - (u.x * len) / 2, c.y - (u.y * len) / 2);
  const spine = Array.from({ length: n + 1 }, (_, i) => pt(a.x + (u.x * len * i) / n, a.y + (u.y * len * i) / n));
  const body_ = ribbon(spine, () => rad * 2);
  castShadow(d, body_.shape, rad * 0.6, 0.2);
  body(d, body_.shape, mix(LIMESTONE, LIMESTONE_COOL, rng()), 0.75);
  pen.clipped(body_.shape, () => {
    for (let k = 1; k < 9; k++) {
      const off = Math.cos((k / 9) * Math.PI) * rad;
      pen.hair(spine.map((p) => pt(p.x - u.y * off, p.y + u.x * off)), 0.45, d.ink, 0.25 + 0.3 * Math.abs(off / rad));
    }
    pen.stipple(body_.shape, Math.round(len * rad * 0.12), () => 0.6, 0.5, STONE_DARK);
    pen.stroke(spine.map((p) => pt(p.x + u.y * rad * 0.45, p.y - u.x * rad * 0.45)), rad * 0.4, PAPER_FILL, 0.25, false);
  });
  shade(d, body_.shape, 0.4);
  pen.stroke(closed(body_.shape), 1.1, d.ink, 0.9);
  const end = tilted(spine[0]!, u, rad * 0.3, rad, 22);
  body(d, end, LIMESTONE, 0.7);
  pen.stroke(closed(end), 0.9, d.ink, 0.9, false);
  // The broken end: a jagged lip of fresh stone.
  const b = spine[n]!;
  const broken = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8 - 0.5;
    return pt(b.x - u.y * t * rad * 2 + u.x * (rng() - 0.3) * rad * 0.5, b.y + u.x * t * rad * 2 + u.y * (rng() - 0.3) * rad * 0.5);
  });
  pen.stroke(broken, 0.9, d.ink, 0.8, false);
}

/** Fallen masonry round c, ~r across: a few tumbled blocks and chips of stone. */
export function rubble(d: Draw, c: Pt, r: number, rng: Rng): void {
  const n = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const p = polar(c, rng() * TAU, rng() * r * 0.55);
    const l = r * (0.35 + rng() * 0.3);
    ashlar(d, rect(p, polar(pt(0, 0), rng() * TAU, 1), l, l * (0.5 + rng() * 0.3)), rng, 4 + l * 0.12);
  }
  for (let k = 0; k < 6; k++) {
    const p = polar(c, rng() * TAU, r * (0.5 + rng() * 0.6));
    const cr = 1.6 + rng() * 2.4;
    const chip = blob(p, cr * 1.3, cr, rng, 0.3, 8, rng() * TAU);
    castShadow(d, chip, cr * 0.6, 0.16);
    body(d, chip, LIMESTONE, 0.7);
    d.pen.hair(closed(chip), 0.45, d.ink, 0.65);
  }
}
