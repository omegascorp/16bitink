import { createRng, type Rng } from '../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The pond's plants and creatures, seen from above: lily pads and their
 * flowers, reed clumps with cattails, kingcups, stepping stones, a goldfish
 * under the surface and ripple rings. Board coordinates; each takes the rng
 * it should draw its variety from.
 */
export const WATER = '#a3c4bc';
export const WATER_DEEP = '#3f6d78';
export const PAD_GREEN = '#6e9b4c';
const PAD_DEEP = '#3d6634';
const VEIN = '#e3edbf';
const BLOOM = '#f4dbe2';
const BLOOM_DEEP = '#c97790';
const KINGCUP = '#ecb52b';
const KINGCUP_LEAF = '#4f7f3c';
const REED = '#8aa65c';
const CATTAIL = '#7a5134';
const GOLDFISH = '#e0773a';
/** Where shadows fall: away from a light at the upper left. */
const SHADOW = pt(0.55, 0.84);

const at = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

/** A lily pad's outline: a near-circle with its slit running in to the middle at angle `notch`. */
function padOutline(c: Pt, r: number, notch: number, rng: Rng): Pt[] {
  const half = 0.16;
  const n = Math.max(20, Math.round(r * 0.9));
  const ph = rng() * TAU;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = notch + half + ((TAU - 2 * half) * i) / n;
    out.push(at(c, a, r * (1 + 0.022 * Math.sin(a * 3 + ph) + 0.014 * Math.sin(a * 7 + ph * 2))));
  }
  out.push(at(c, notch, r * 0.07));
  return out;
}

/**
 * A lily pad of radius r at c floating on the water: its shadow, a glossy
 * green wash pooled darker at the rim, veins radiating from the stalk, a
 * slit, a turned-up lit rim. `detail` (big pads) adds mottling, hatching and a bead of water.
 */
export function lilyPad(d: Draw, c: Pt, r: number, rng: Rng, detail = false): void {
  const { pen } = d;
  const notch = rng() * TAU;
  const shape = padOutline(c, r, notch, rng);
  pen.fill(shape.map((p) => pt(p.x + r * 0.06 + 1, p.y + r * 0.09 + 1.5)), d.ink, 0.17);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(PAD_GREEN, '#a3b35a', rng() * 0.35), 0.74);
  pen.clipped(shape, () => {
    pen.fill(oval(c.x - r * 0.18, c.y - r * 0.22, r * 0.55, r * 0.42, 20), '#dfe9a6', 0.28);
    pen.stroke(closed(shape), r * 0.16, PAD_DEEP, 0.22, false);
    const veins = detail ? 21 : 11;
    for (let k = 0; k < veins; k++) {
      const a = notch + 0.32 + ((TAU - 0.64) * k) / (veins - 1);
      const from = at(c, a, r * 0.07);
      const to = at(c, a + 0.04, r * 0.92);
      const bend = at(c, a - 0.05, r * 0.5);
      pen.hair(bezier(from, bend, to, 6), detail ? 0.9 : 0.55, VEIN, detail ? 0.55 : 0.45);
      if (detail) {
        pen.hair(bezier(pt(from.x + 0.7, from.y + 0.9), pt(bend.x + 0.7, bend.y + 0.9), pt(to.x + 0.7, to.y + 0.9), 6), 0.35, d.ink, 0.2);
        // A fork near the rim, as the real veins branch.
        const f = at(c, a, r * 0.66);
        pen.hair([f, at(c, a + 0.09, r * 0.88)], 0.45, VEIN, 0.4);
      }
    }
    if (detail) {
      pen.stipple(shape, 160, (x, y) => (Math.hypot(x - c.x, y - c.y) > r * 0.55 ? 0.6 : 0.12), 0.65, mix(PAD_GREEN, '#7b3a2c', 0.45));
    }
  });
  pen.crescent(shape, pt(-r * 0.12, -r * 0.18), () => pen.fill(shape, PAD_DEEP, 0.32));
  if (detail) pen.crescent(shape, pt(-r * 0.2, -r * 0.3), () => pen.hatch(shape, 3.2, 0.9, 0.45, { color: d.ink, alpha: 0.28 }));
  // The rim turns up where the light catches it.
  const lit = shape.filter((_, i) => i > 2 && i < shape.length - 3).filter((p) => (p.x - c.x) * SHADOW.x + (p.y - c.y) * SHADOW.y < -r * 0.3);
  if (lit.length > 3) pen.hair(lit.map((p) => pt(p.x + (c.x - p.x) * 0.06, p.y + (c.y - p.y) * 0.06)), detail ? 1.3 : 0.8, PAPER_FILL, 0.7);
  if (detail) {
    const b = at(c, notch + 2.2, r * 0.45);
    pen.fill(oval(b.x, b.y, 3.4, 2.8, 12), '#e9f2ee', 0.75);
    pen.hair(closed(oval(b.x, b.y, 3.4, 2.8, 12)).slice(5, 12), 0.5, d.ink, 0.5);
    pen.dot(b.x - 1, b.y - 1, 0.8, PAPER_FILL, 0.95);
  }
  pen.stroke(closed(shape), detail ? 1.35 : 0.85, d.ink, detail ? 0.9 : 0.75, detail);
}

/** A waterlily flower seen from above: two rings of pointed petals round a golden heart. */
export function waterLily(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + 1.5, c.y + 2.2, r, r, 18), d.ink, 0.1);
  for (const [k, rr, n] of [[0, r, 9], [1, r * 0.68, 7]] as const) {
    const turn = rng() * TAU;
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * TAU;
      const tip = at(c, a, rr);
      const sideA = at(c, a + 0.32, rr * 0.45);
      const sideB = at(c, a - 0.32, rr * 0.45);
      const petal = [...bezier(c, sideA, tip, 6), ...bezier(tip, sideB, c, 6).slice(1)];
      pen.fill(petal, PAPER_FILL, 1);
      pen.fill(petal, k === 0 ? BLOOM : mix(BLOOM, PAPER_FILL, 0.5), 0.8);
      pen.clipped(petal, () => pen.fill(oval(c.x, c.y, rr * 0.35, rr * 0.35, 12), BLOOM_DEEP, 0.4));
      pen.hair(closed(petal), 0.45, d.ink, 0.55);
    }
  }
  pen.fill(oval(c.x, c.y, r * 0.22, r * 0.22, 12), KINGCUP, 0.95);
  pen.stipple(oval(c.x, c.y, r * 0.22, r * 0.22, 12), 14, () => 0.8, 0.4, '#a36a12');
}

/** A closed waterlily bud lying on the water at c, pointing along `ang`. */
export function lilyBud(d: Draw, c: Pt, len: number, ang: number): void {
  const { pen } = d;
  const tip = at(c, ang, len);
  const nrm = ang + Math.PI / 2;
  const bud = [...bezier(c, at(at(c, ang, len * 0.45), nrm, len * 0.42), tip, 10), ...bezier(tip, at(at(c, ang, len * 0.45), nrm, -len * 0.42), c, 10).slice(1)];
  pen.fill(bud.map((p) => pt(p.x + 1.2, p.y + 1.8)), d.ink, 0.14);
  pen.fill(bud, PAPER_FILL, 1);
  pen.fill(bud, BLOOM, 0.85);
  pen.clipped(bud, () => pen.fill(oval(tip.x, tip.y, len * 0.35, len * 0.35, 12), BLOOM_DEEP, 0.5));
  pen.hair([at(c, ang, len * 0.15), at(tip, ang + Math.PI, len * 0.08)], 0.45, d.ink, 0.5);
  // Green sepals clasping its base.
  for (const s of [1, -1]) {
    const sep = [...bezier(c, at(at(c, ang, len * 0.3), nrm, s * len * 0.4), at(c, ang + s * 0.25, len * 0.62), 6), ...bezier(at(c, ang + s * 0.25, len * 0.62), at(c, ang + s * 0.1, len * 0.3), c, 6).slice(1)];
    pen.fill(sep, PAD_GREEN, 0.85);
    pen.hair(closed(sep), 0.45, d.ink, 0.6);
  }
  pen.stroke(closed(bud), 0.8, d.ink, 0.8, false);
}

/** A reed clump from above: blades leaning out from a base, a few cattails. `lean` is where they lean. */
export function reeds(d: Draw, base: Pt, lean: number, size: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(base.x + size * 0.2, base.y + size * 0.3, size * 0.55, size * 0.4, 16), d.ink, 0.08);
  const blades = 9 + Math.floor(rng() * 6);
  for (let i = 0; i < blades; i++) {
    const a = lean + (rng() - 0.5) * 2.2;
    const len = size * (0.6 + rng() * 0.6);
    const from = at(base, a, rng() * 4);
    const tip = at(from, a + (rng() - 0.5) * 0.4, len);
    const bend = at(at(from, a, len * 0.55), a + Math.PI / 2, (rng() - 0.5) * len * 0.25);
    const spine = bezier(from, bend, tip, 10);
    const nrm = a + Math.PI / 2;
    const wd = 1.6 + rng() * 1.2;
    const blade = [...spine.map((p, k) => at(p, nrm, wd * (1 - k / spine.length))), ...[...spine].reverse().map((p, k) => at(p, nrm, -wd * (k / spine.length)))];
    pen.fill(blade, mix(REED, LEAF, rng()), 0.75);
    pen.hair(spine, 0.5, d.ink, 0.6);
  }
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
    const a = lean + (rng() - 0.5) * 1.3;
    const p0 = at(base, a, size * (0.35 + rng() * 0.25));
    const p1 = at(p0, a, 11 + rng() * 4);
    const body = Array.from({ length: 14 }, (_, k) => {
      const t = (k / 14) * TAU;
      const along = Math.cos(t) * 0.5 + 0.5;
      const wide = Math.sin(t) * 2.8;
      return pt(p0.x + (p1.x - p0.x) * along + Math.cos(a + Math.PI / 2) * wide, p0.y + (p1.y - p0.y) * along + Math.sin(a + Math.PI / 2) * wide);
    });
    pen.hair([at(base, a, 3), p0], 0.6, mix(REED, d.ink, 0.4), 0.7);
    pen.fill(body.map((p) => pt(p.x + 1, p.y + 1.6)), d.ink, 0.15);
    pen.fill(body, CATTAIL, 0.9);
    pen.stipple(body, 30, () => 0.7, 0.4, mix(CATTAIL, d.ink, 0.5));
    pen.hair(closed(body), 0.5, d.ink, 0.8);
    pen.hair([p1, at(p1, a, 5)], 0.5, d.ink, 0.6);
  }
}

/** Kingcups (marsh marigolds): glossy round leaves and a few golden five-petalled flowers. */
export function kingcups(d: Draw, c: Pt, size: number, rng: Rng): void {
  const { pen } = d;
  for (let i = 0; i < 5; i++) {
    const a = rng() * TAU;
    const lc = at(c, a, size * (0.3 + rng() * 0.5));
    const r = size * (0.28 + rng() * 0.14);
    const leaf = Array.from({ length: 22 }, (_, k) => {
      const t = (k / 22) * TAU;
      return at(lc, t, r * (1 + 0.06 * Math.sin(t * 9)));
    });
    pen.fill(leaf.map((p) => pt(p.x + 1, p.y + 1.5)), d.ink, 0.12);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, KINGCUP_LEAF, 0.7);
    pen.crescent(leaf, pt(-r * 0.25, -r * 0.35), () => pen.fill(leaf, mix(KINGCUP_LEAF, d.ink, 0.4), 0.35));
    pen.hair(bezier(at(lc, a + 2.6, r * 0.6), at(lc, a + 0.3, r * 0.1), at(lc, a, r * 0.85), 5), 0.4, VEIN, 0.5);
    pen.hair(closed(leaf), 0.55, d.ink, 0.75);
  }
  for (let i = 0; i < 3; i++) {
    const fc = at(c, rng() * TAU, size * rng() * 0.55);
    const r = size * 0.2;
    const turn = rng() * TAU;
    for (let k = 0; k < 5; k++) {
      const pc = at(fc, turn + (k / 5) * TAU, r * 0.55);
      const petal = oval(pc.x, pc.y, r * 0.55, r * 0.55, 12);
      pen.fill(petal, PAPER_FILL, 1);
      pen.fill(petal, KINGCUP, 0.9);
      pen.hair(closed(petal), 0.4, d.ink, 0.6);
    }
    pen.dot(fc.x, fc.y, r * 0.28, '#b06c14', 0.95);
  }
}

/** A flat stepping stone half-awash: its shadow on the water, a mossy top and a ring of wet stone. */
export function steppingStone(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const ph = rng() * TAU;
  const shape = Array.from({ length: 26 }, (_, k) => {
    const t = (k / 26) * TAU;
    return at(c, t, r * (1 + 0.08 * Math.sin(t * 2 + ph) + 0.05 * Math.sin(t * 5 + ph * 3)) * (Math.abs(Math.cos(t)) * 0.12 + 0.88));
  });
  ripple(d, c, r + 4, 2, rng);
  pen.fill(shape.map((p) => pt(p.x + 3, p.y + 4.5)), d.ink, 0.2);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(STONE, '#aab3a8', rng()), 0.65);
  pen.clipped(shape, () => {
    pen.stroke(closed(shape), 5, mix(STONE_DARK, '#4d6a64', 0.5), 0.3, false);
    for (let i = 0; i < 12; i++) {
      const p = at(c, rng() * TAU, r * (0.3 + rng() * 0.6));
      pen.fill(oval(p.x, p.y, 2 + rng() * 3, 1.6 + rng() * 2.4, 8), rng() < 0.4 ? LEAF : MOSS, 0.55);
    }
  });
  pen.crescent(shape, pt(-r * 0.15, -r * 0.22), () => pen.fill(shape, STONE_DARK, 0.4));
  pen.crescent(shape, pt(-r * 0.25, -r * 0.37), () => pen.hatch(shape, 3, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  pen.stroke(closed(shape), 1.1, d.ink, 0.85);
}

/** A goldfish under the surface, softened by the water, and its shadow on the bottom. */
export function goldfish(d: Draw, c: Pt, len: number, ang: number): void {
  const { pen } = d;
  const fwd = (t: number, side: number): Pt => at(at(c, ang, t * len), ang + Math.PI / 2, side);
  const half = (t: number): number => len * 0.17 * Math.sin(Math.PI * Math.min(1, (t + 0.55) / 1.05)) ** 0.8;
  const body: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = 0.5 - k / 12;
    body.push(fwd(t, half(t)));
  }
  for (let k = 12; k >= 0; k--) {
    const t = 0.5 - k / 12;
    body.push(fwd(t, -half(t)));
  }
  const tail = [fwd(-0.48, 0), fwd(-0.78, len * 0.2), fwd(-0.7, 0), fwd(-0.8, -len * 0.18)];
  const fins = [[fwd(0.18, half(0.18)), fwd(0.02, len * 0.28), fwd(0.06, half(0.06))], [fwd(0.18, -half(0.18)), fwd(0.02, -len * 0.28), fwd(0.06, -half(0.06))]];
  for (const s of [body, tail, ...fins]) pen.fill(s.map((p) => pt(p.x + 7, p.y + 10)), WATER_DEEP, 0.18);
  for (const s of [tail, ...fins]) pen.fill(s, GOLDFISH, 0.32);
  pen.fill(body, GOLDFISH, 0.55);
  pen.hair([fwd(0.35, 0), fwd(-0.2, 0)], 1.2, PAPER_FILL, 0.3);
  pen.hair(closed(body), 0.5, d.ink, 0.3);
  pen.hair(tail, 0.45, d.ink, 0.25);
  for (const side of [1, -1]) pen.dot(fwd(0.38, side * len * 0.07).x, fwd(0.38, side * len * 0.07).y, 0.9, d.ink, 0.45);
}

/** Ripple rings round c: pale lines with a faint shadow, broken as water breaks them. */
export function ripple(d: Draw, c: Pt, r: number, rings: number, rng: Rng): void {
  const { pen } = d;
  for (let i = 0; i < rings; i++) {
    const rr = r + i * (4 + rng() * 3);
    const from = rng() * TAU;
    const span = TAU * (0.45 + rng() * 0.4);
    const arc = Array.from({ length: 24 }, (_, k) => at(c, from + (span * k) / 23, rr));
    pen.hair(arc.map((p) => pt(p.x + 0.8, p.y + 1.2)), 0.5, WATER_DEEP, 0.3 - i * 0.06);
    pen.hair(arc, 0.8, PAPER_FILL, 0.7 - i * 0.15);
  }
}

/** A small round pool sunk in the paving, radius r at c: damp stone round it, water shaded under its lip. */
export function pool(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const ph = rng() * TAU;
  const rim = (rr: number): Pt[] => Array.from({ length: 48 }, (_, k) => at(c, (k / 48) * TAU, rr * (1 + 0.03 * Math.sin((k / 48) * TAU * 3 + ph) + 0.015 * Math.sin((k / 48) * TAU * 7 + ph))));
  const edge = rim(r);
  pen.fill(rim(r + 9), STONE_DARK, 0.16);
  pen.fill(rim(r + 4), mix(STONE_DARK, WATER_DEEP, 0.4), 0.18);
  pen.fill(edge, PAPER_FILL, 1);
  pen.fill(edge, WATER, 0.75);
  pen.clipped(edge, () => {
    const g = ctx.createRadialGradient(c.x + r * 0.15, c.y + r * 0.2, r * 0.1, c.x, c.y, r);
    g.addColorStop(0, `${WATER_DEEP}99`);
    g.addColorStop(1, `${WATER_DEEP}10`);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.hatch(edge, 4.4, -0.12, 0.45, { color: d.ink, alpha: 0.16 });
    for (let i = 0; i < 9; i++) {
      const p = at(c, rng() * TAU, r * rng() * 0.9);
      const l = 8 + rng() * 14;
      pen.hair([p, pt(p.x + l * 0.5, p.y + (rng() - 0.5) * 1.5), pt(p.x + l, p.y)], 0.8, PAPER_FILL, 0.45);
    }
  });
  // The lip's shadow falls on the water on the side towards the light.
  pen.crescent(edge, pt(SHADOW.x * 7, SHADOW.y * 7), () => pen.fill(edge, WATER_DEEP, 0.4));
  // Moss tucked round the lip.
  for (let k = 0; k < 40; k++) {
    const p = at(c, rng() * TAU, r + 1 + rng() * 5);
    pen.fill(oval(p.x, p.y, 1.6 + rng() * 2.4, 1.3 + rng() * 1.8, 8), rng() < 0.4 ? LEAF : MOSS, 0.55);
  }
  pen.stroke(closed(edge), 1.2, d.ink, 0.85);
}

/** The big pad the gecko sits on: optionally in its own pool (radius 1.3 r), with a bud at its rim. */
export function seatPad(d: Draw, c: Pt, r: number, inPool: boolean): void {
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  if (inPool) pool(d, c, r * 1.3, rng);
  const a = -0.5 + rng() * 0.6;
  lilyBud(d, at(c, a, r - 2), r * 0.3, a + 0.5);
  lilyPad(d, c, r, rng, true);
}

/** A dotted ring round a pad, just beyond its rim: ink dashes on a paper halo. */
export function padRing(d: Draw, c: Pt, r: number): void {
  const rr = r + 9;
  const dashes = Math.round((TAU * rr) / 14);
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * TAU;
    const a1 = a0 + (TAU / dashes) * 0.45;
    const arc = [0, 0.5, 1].map((t) => at(c, a0 + (a1 - a0) * t, rr));
    d.pen.hair(arc, 2.6, PAPER_FILL, 0.6);
    d.pen.hair(arc, 1.3, d.ink, 0.6);
  }
}
