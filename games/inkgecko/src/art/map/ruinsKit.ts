import { createRng, type Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { castShadow, scalloped } from './flora';
import { chamfer } from './paving';

/**
 * The ruined folly's stones as the map paints them, in world px: fluted
 * columns still standing (drawn a little from the front, like the standing
 * stones) and fallen ones lying in their drums, low walls of dressed stone
 * broken off at odd heights, mosaic laid in rings with pieces lost, a stone
 * urn tipped over and spilling flowers, ivy, and wild roses scrambling.
 */
export const LIMESTONE = '#d8d0bc';
const WEATHERED = '#bdb6a2';
const IVY = '#3f6a44';
const ROSE = ['#e7a0b4', '#f4e8e8', '#d8708e'] as const;
export const TESSERAE = ['#b8583e', '#e8dcc0', '#3f5f86', '#c9a24a', '#2f3a3a'] as const;

/** A fluted column standing on its square plinth, broken off at `h` (or crowned with its capital), its long shadow, ivy up it. */
export function column(d: Draw, base: Pt, w: number, h: number, capital: boolean, rng: Rng): void {
  const { pen } = d;
  const plinth = boxPts(base.x - w * 0.8, base.y - 10, base.x + w * 0.8, base.y + 4, 6);
  // The shadow its height throws down the slope to the lower right.
  pen.fill([pt(base.x - w / 2, base.y), pt(base.x + w / 2, base.y), pt(base.x + w / 2 + h * 0.55, base.y + h * 0.62), pt(base.x - w / 2 + h * 0.55, base.y + h * 0.66)], d.ink, 0.15);
  pen.fill(plinth, PAPER_FILL, 1);
  pen.fill(plinth, WEATHERED, 0.75);
  pen.crescent(plinth, pt(-3, -3), () => pen.fill(plinth, STONE_DARK, 0.35));
  pen.stroke(closed(plinth), 0.9, d.ink, 0.85, false);
  const top = base.y - 10 - h;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let k = 0; k <= 6; k++) {
    const u = k / 6;
    const half = (w / 2) * (1 - 0.1 * u);
    left.push(pt(base.x - half, base.y - 10 - h * u));
    right.push(pt(base.x + half, base.y - 10 - h * u));
  }
  // The broken top: jagged, or the capital's scroll and abacus.
  const brk: Pt[] = capital ? [] : Array.from({ length: 5 }, (_, k) => pt(base.x - (w / 2) * 0.9 + (k / 4) * w * 0.9, top + (rng() - 0.3) * w * 0.5));
  const shaft = [...left, ...brk, ...[...right].reverse()];
  pen.fill(shaft, PAPER_FILL, 1);
  pen.fill(shaft, LIMESTONE, 0.75);
  pen.clipped(shaft, () => {
    for (let k = 1; k < 6; k++) {
      const x = base.x - w / 2 + (k * w) / 6;
      pen.hair([pt(x, base.y - 10), pt(x + (base.x - x) * 0.1, top - 10)], 0.45, d.ink, 0.35);
    }
  });
  pen.crescent(shaft, pt(-w * 0.4, 0), () => pen.fill(shaft, STONE_DARK, 0.5));
  pen.crescent(shaft, pt(-w * 0.2, 0), () => pen.hatch(shaft, 2.6, 0.9, 0.4, { color: d.ink, alpha: 0.28 }));
  for (let k = 0; k < 6; k++) pen.dot(base.x + (rng() - 0.5) * w, base.y - 10 - rng() * h, 1.2 + rng() * 1.8, rng() < 0.6 ? '#c9c78a' : MOSS, 0.75);
  pen.stroke(closed(shaft), 1.1, d.ink, 0.9);
  if (capital) {
    const cap = boxPts(base.x - w * 0.75, top - 12, base.x + w * 0.75, top, 6);
    pen.fill(cap, PAPER_FILL, 1);
    pen.fill(cap, LIMESTONE, 0.8);
    pen.crescent(cap, pt(-3, -3), () => pen.fill(cap, STONE_DARK, 0.35));
    for (const s of [-1, 1]) pen.hair(Array.from({ length: 9 }, (_, k) => pt(base.x + s * w * 0.55 + Math.cos(k * 0.8) * k * 0.45 * s, top - 4 + Math.sin(k * 0.8) * k * 0.45)), 0.5, d.ink, 0.7);
    pen.stroke(closed(cap), 1, d.ink, 0.9, false);
  }
  ivy(d, base.x - w * 0.3, base.y - 6, h * (0.3 + rng() * 0.5), rng);
}

/** Ivy climbing up from (x, y) for `h`: a wandering stem with dark lobed leaves. */
export function ivy(d: Draw, x: number, y: number, h: number, rng: Rng): void {
  const { pen } = d;
  const stem: Pt[] = [];
  for (let k = 0; k <= 8; k++) stem.push(pt(x + Math.sin(k * 1.3 + rng()) * 5, y - (k / 8) * h));
  pen.hair(stem, 0.6, '#5a4a30', 0.7);
  for (let k = 0; k < Math.round(h / 5); k++) {
    const p = stem[Math.floor(rng() * stem.length)]!;
    const c = pt(p.x + (rng() - 0.5) * 12, p.y + (rng() - 0.5) * 6);
    const leaf = scalloped(c, 2.6 + rng() * 1.6, 3, rng, 0.35);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(IVY, LEAF, rng() * 0.5), 0.85);
    pen.hair(closed(leaf), 0.35, d.ink, 0.6);
  }
}

/** A fallen column lying along `ang`: its drums parted a little, fluting along them, the capital rolled off the end. */
export function fallenColumn(d: Draw, c: Pt, ang: number, n: number, r: number, rng: Rng): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const len = r * 2.1;
  for (let k = 0; k < n; k++) {
    const u = (k - (n - 1) / 2) * (len + 4 + rng() * 6);
    const off = (rng() - 0.5) * 6;
    const twist = (rng() - 0.5) * 0.15;
    const dx = pt(Math.cos(ang + twist), Math.sin(ang + twist));
    const nx = pt(-dx.y, dx.x);
    const m = pt(c.x + dir.x * u + nrm.x * off, c.y + dir.y * u + nrm.y * off);
    const at = (a: number, b: number): Pt => pt(m.x + dx.x * a + nx.x * b, m.y + dx.y * a + nx.y * b);
    const body = [at(-len / 2, -r), at(len / 2, -r), at(len / 2, r), at(-len / 2, r)];
    castShadow(d, body, r * 0.8, 0.16);
    pen.fill(body, PAPER_FILL, 1);
    pen.fill(body, LIMESTONE, 0.75);
    for (let f = -0.66; f <= 0.67; f += 0.33) pen.hair([at(-len / 2 + 1, r * f), at(len / 2 - 1, r * f)], 0.4, d.ink, 0.35);
    // Round: lit along the side towards the light, shaded along the other.
    const shadeSide = nx.y > 0 ? 1 : -1;
    pen.fill([at(-len / 2, shadeSide * r * 0.35), at(len / 2, shadeSide * r * 0.35), at(len / 2, shadeSide * r), at(-len / 2, shadeSide * r)], STONE_DARK, 0.4);
    pen.fill([at(-len / 2, -shadeSide * r * 0.75), at(len / 2, -shadeSide * r * 0.75), at(len / 2, -shadeSide * r * 0.45), at(-len / 2, -shadeSide * r * 0.45)], PAPER_FILL, 0.4);
    const end = oval(0, 0, r * 0.32, r, 14).map((p) => at(len / 2 + p.x, p.y));
    pen.fill(end, mix(LIMESTONE, '#ffffff', 0.3), 0.9);
    pen.hair(closed(end), 0.5, d.ink, 0.7);
    pen.stroke(closed(body), 0.9, d.ink, 0.85, false);
    for (let k2 = 0; k2 < 4; k2++) pen.dot(m.x + (rng() - 0.5) * len, m.y + (rng() - 0.5) * r, 1.4 + rng() * 1.6, rng() < 0.5 ? MOSS : '#c9c78a', 0.7);
  }
}

/** A stump of column still on its plinth, seen from above: the broken drum's rough top in its fluted ring. */
export function stump(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const plinth = boxPts(c.x - r * 1.3, c.y - r * 1.3, c.x + r * 1.3, c.y + r * 1.3, 6);
  castShadow(d, plinth, 8, 0.14);
  pen.fill(plinth, PAPER_FILL, 1);
  pen.fill(plinth, WEATHERED, 0.7);
  pen.stroke(closed(plinth), 0.8, d.ink, 0.8, false);
  const drum = scalloped(c, r, 16, rng, 0.06);
  castShadow(d, drum, r * 0.9, 0.18);
  pen.fill(drum, PAPER_FILL, 1);
  pen.fill(drum, LIMESTONE, 0.8);
  const rough = scalloped(pt(c.x - 1, c.y - 1), r * 0.7, 6, rng, 0.35);
  pen.fill(rough, STONE_DARK, 0.25);
  pen.hair(closed(rough), 0.45, d.ink, 0.5);
  pen.crescent(drum, pt(-r * 0.3, -r * 0.4), () => pen.fill(drum, STONE_DARK, 0.4));
  pen.stroke(closed(drum), 0.9, d.ink, 0.85);
}

/**
 * A low wall of dressed stone along x at y0..y1 seen from above: its top
 * courses, broken down to rubble in places, its shadow side to the right.
 */
export function sideRuin(d: Draw, x: number, y0: number, y1: number, rng: Rng): void {
  const { pen } = d;
  const w = 22;
  for (let y = y0; y < y1; ) {
    const len = 14 + rng() * 22;
    const yb = Math.min(y1, y + len);
    const low = rng() < 0.18;
    const k = low ? 0.7 : 1;
    const block = chamfer(boxPts(x - (w / 2) * k + (rng() - 0.5) * 2, y + 1, x + (w / 2) * k + (rng() - 0.5) * 2, yb - 1, 8), 2);
    const sh = low ? 5 : 11;
    pen.fill(block.map((p) => pt(p.x + sh, p.y + sh * 0.9)), d.ink, 0.15);
    pen.fill(block, PAPER_FILL, 1);
    pen.fill(block, mix(LIMESTONE, WEATHERED, rng()), 0.8);
    pen.fill(block.map((p) => pt(Math.max(p.x, x + w * 0.25), p.y)), STONE_DARK, 0.3);
    pen.hair(closed(block), 0.6, d.ink, 0.8);
    if (rng() < 0.25) for (let k2 = 0; k2 < 4; k2++) pen.dot(x + (rng() - 0.5) * w, y + rng() * len, 1.6 + rng() * 2, rng() < 0.5 ? MOSS : IVY, 0.75);
    y = yb + (rng() < 0.1 ? 10 : 0);
  }
}

/** A stretch of dressed-stone wall across x0..x1, its foot at y, broken at odd heights, drawn a little from the front. */
export function wallRuin(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const COURSE = 11;
  const ph = rng() * TAU;
  const height = (x: number): number => Math.max(1, Math.round(2 + 2.2 * Math.sin(x / 70 + ph) + Math.sin(x / 23 + ph * 2) * 0.9));
  pen.fill([pt(x0 + 4, y - 2), pt(x1 + 8, y - 2), pt(x1 + 30, y + 22), pt(x0 + 26, y + 22)], d.ink, 0.12);
  for (let x = x0; x < x1 - 4; ) {
    const n = height(x);
    const w = 18 + rng() * 14;
    const xb = Math.min(x1, x + w);
    for (let r = 0; r < n; r++) {
      const ya = y - (r + 1) * COURSE;
      const off = r % 2 ? w * 0.4 : 0;
      const s = chamfer(boxPts(x + 1 + (r === n - 1 ? rng() * 3 : 0), ya + 1, Math.min(xb, x + w - off * 0.1) - 1, ya + COURSE - 1, 8), 1.5);
      pen.fill(s, PAPER_FILL, 1);
      pen.fill(s, mix(LIMESTONE, WEATHERED, rng()), 0.82);
      pen.fill(s.map((p) => pt(p.x, Math.max(p.y, ya + COURSE * 0.55))), STONE_DARK, 0.25);
      pen.hair(closed(s), 0.5, d.ink, 0.65);
    }
    const top = y - n * COURSE;
    pen.fill(boxPts(x + 1, top - 3, xb - 1, top + 1, 8), PAPER_FILL, 0.6);
    pen.hair([pt(x, top), pt(xb, top)], 0.9, d.ink, 0.85);
    if (rng() < 0.3) ivy(d, x + w / 2, y, n * COURSE, rng);
    x = xb;
  }
  pen.stroke([pt(x0, y), pt(x1, y + 0.5)], 1.2, d.ink, 0.85, false);
}

/** A mosaic disc of rings and a rosette laid in tesserae, with pieces lost to the weather. Drawn straight to the context in batches. */
export function mosaic(d: Draw, c: Pt, r: number, seed: number): void {
  const ctx = d.pen.ctx;
  const rng = createRng(seed);
  const paths = TESSERAE.map(() => new Path2D());
  const lost = (x: number, y: number): boolean => Math.sin(x / 23 + seed) + Math.sin(y / 17 - seed * 2) + Math.sin((x + y) / 31) > 1.3;
  const T = 4.2;
  ctx.save();
  ctx.fillStyle = 'rgba(160,140,110,0.35)';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r + 3, 0, TAU);
  ctx.fill();
  for (let ring = 0; ring * T < r; ring++) {
    const rr = r - ring * T - T / 2;
    if (rr < T) break;
    const n = Math.max(6, Math.floor((TAU * rr) / T));
    const band = ring < 2 ? (ring === 0 ? 4 : 0) : ring < 4 ? 1 : ring < 6 ? (ring % 2 ? 2 : 1) : 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const x = c.x + Math.cos(a) * rr;
      const y = c.y + Math.sin(a) * rr;
      if (lost(x, y)) continue;
      // A wave border, then the rosette's petals in the middle.
      let col = band;
      if (ring >= 2 && ring < 4 && Math.sin(a * 12 + ring * 1.6) > 0.3) col = 0;
      if (rr < r * 0.45) col = Math.cos(a * 8) * (r * 0.45 - rr) > 2 ? 3 : rr < r * 0.12 ? 0 : 1;
      paths[col]!.rect(x - T / 2 + 0.4, y - T / 2 + 0.4, T - 0.8, T - 0.8);
    }
  }
  paths.forEach((p, i) => {
    ctx.fillStyle = TESSERAE[i]!;
    ctx.globalAlpha = 0.78;
    ctx.fill(p);
  });
  ctx.restore();
  d.pen.hair(closed(oval(c.x, c.y, r + 2, r + 2, 40)).slice(0, 30 + Math.floor(rng() * 10)), 0.6, d.ink, 0.45);
}

/** A stone urn tipped over on the grass, its mouth to `ang`, the earth and flowers it held spilling out. */
export function toppledUrn(d: Draw, c: Pt, ang: number, rng: Rng): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const at = (a: number, b: number): Pt => pt(c.x + dir.x * a + nrm.x * b, c.y + dir.y * a + nrm.y * b);
  const mouth = at(22, 0);
  for (let k = 0; k < 14; k++) {
    const p = pt(mouth.x + dir.x * (6 + rng() * 26) + nrm.x * (rng() - 0.5) * 30, mouth.y + dir.y * (6 + rng() * 26) + nrm.y * (rng() - 0.5) * 30);
    if (k < 6) pen.fill(scalloped(p, 4 + rng() * 3, 4, rng, 0.3), '#6b4a33', 0.45);
    else {
      pen.fill(scalloped(p, 3 + rng() * 2, 4, rng, 0.3), LEAF, 0.8);
      pen.dot(p.x + 2, p.y - 1, 2, ROSE[k % 3]!, 0.95);
    }
  }
  const body = [...bezier(at(-24, -6), at(-4, -24), at(22, -15), 8), ...bezier(at(22, 15), at(-4, 24), at(-24, 6), 8)];
  castShadow(d, body, 10, 0.16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, LIMESTONE, 0.8);
  for (let k = -1; k <= 1; k++) pen.hair([at(-18, k * 10), at(18, k * 12)], 0.45, d.ink, 0.4);
  pen.crescent(body, pt(-4, -6), () => pen.fill(body, STONE_DARK, 0.4));
  pen.stroke(closed(body), 1, d.ink, 0.85);
  const lip = oval(0, 0, 6, 17, 16).map((p) => at(22 + p.x, p.y));
  pen.fill(lip, '#4a3a2a', 0.8);
  pen.stroke(closed(lip), 0.9, d.ink, 0.9);
  const foot = [at(-24, -9), at(-36, -12), at(-36, 12), at(-24, 9)];
  pen.fill(foot, PAPER_FILL, 1);
  pen.fill(foot, WEATHERED, 0.8);
  pen.stroke(closed(foot), 0.9, d.ink, 0.85);
}

/** A wild rose scrambling over the stones: a loose mound of leaves with open five-petalled flowers. */
export function wildRose(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, Math.max(7, Math.round(r / 6)), rng, 0.22);
  castShadow(d, body, r * 0.35, 0.13);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(LEAF, '#2f5a33', 0.25), 0.62);
  pen.crescent(body, pt(-r * 0.3, -r * 0.45), () => pen.fill(body, '#2f4f2c', 0.35));
  for (let k = 0; k < r / 3; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95);
    pen.hair([pt(c.x + Math.cos(a) * r * 0.6, c.y + Math.sin(a) * r * 0.6), p, pt(p.x + Math.cos(a + 1) * 6, p.y + Math.sin(a + 1) * 6)], 0.6, '#5a6a3a', 0.7);
  }
  const colour = ROSE[Math.floor(rng() * ROSE.length)]!;
  for (let k = 0; k < r / 3.5; k++) {
    const a = rng() * TAU;
    const kk = r * Math.sqrt(rng()) * 0.9;
    const p = pt(c.x + Math.cos(a) * kk, c.y + Math.sin(a) * kk);
    for (let i = 0; i < 5; i++) {
      const b = (i / 5) * TAU + a;
      pen.dot(p.x + Math.cos(b) * 2.2, p.y + Math.sin(b) * 2.2, 1.8, colour, 0.95);
    }
    pen.dot(p.x, p.y, 1, '#e8c040', 1);
  }
  pen.stroke(closed(body), 0.85, d.ink, 0.7);
}

/** Rubble: a few squared stones tumbled together. */
export function rubble(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 4; k++) {
    const p = pt(c.x + (rng() - 0.5) * 30, c.y + (rng() - 0.5) * 18);
    const s = 5 + rng() * 6;
    const a = rng();
    const block = chamfer([pt(p.x - s, p.y - s * 0.7 + a), pt(p.x + s, p.y - s * 0.7), pt(p.x + s - a, p.y + s * 0.7), pt(p.x - s, p.y + s * 0.7)], 1.5);
    castShadow(d, block, s * 0.8, 0.15);
    pen.fill(block, PAPER_FILL, 1);
    pen.fill(block, mix(LIMESTONE, STONE, rng()), 0.8);
    pen.crescent(block, pt(-2, -2.5), () => pen.fill(block, STONE_DARK, 0.4));
    pen.hair(closed(block), 0.6, d.ink, 0.8);
  }
}
