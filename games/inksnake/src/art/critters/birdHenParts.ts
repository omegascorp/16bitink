import type { Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Blade, boxOf, coat, ellipseAt, glaze, lanceBlade, model, petalBlade, rimLight, scalloped, vane } from './birdKit';

/**
 * The russet hen's paint: rich mahogany plumage, each round feather laced
 * paler gold at its edge; golden hackles streaked dark down the neck; a
 * dark tail glossed green; the red comb along the crown and the wattles
 * peeping out under a horn-yellow beak; yellow legs. Facing +x, light from
 * the upper left.
 */
export const HEN_PAINT = {
  russet: '#b45a28',
  light: '#d98a4a',
  gold: '#e8b062',
  deep: '#6a2c12',
  dark: '#3a1b0d',
  tail: '#3a2418',
  sheen: '#3f6a52',
  comb: '#d23a2b',
  combLight: '#f07a5c',
  combDeep: '#86201a',
  beak: '#e2c27a',
  beakDeep: '#a77f3a',
  foot: '#e3b244',
  eye: '#d0701e',
} as const;

/** Russet plumage over a shape: warm wash, a coat of gold-laced feathers, volume. */
export function henPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; dir?: (p: Pt) => number; ruffle?: number; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HEN_PAINT.russet, 0.85);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx - b.rx * 0.2, b.cy - b.ry * 0.3, b.rx * 0.7, b.ry * 0.6, -0.3, HEN_PAINT.light, 0.45);
    glaze(d, b.cx + b.rx * 0.3, b.cy + b.ry * 0.4, b.rx * 0.6, b.ry * 0.5, 0, HEN_PAINT.deep, 0.35);
  });
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI),
    n: o.n,
    size: o.size,
    ruffle: o.ruffle,
    paint: ({ f, s, r }) => {
      pen.fill(f.shape, r < 0.45 ? HEN_PAINT.russet : r < 0.8 ? HEN_PAINT.deep : HEN_PAINT.light, 0.4);
      pen.hair([f.at(0.15, 0), f.at(0.7, 0)], s * 0.1, HEN_PAINT.dark, 0.35);
      pen.hair(f.shape.slice(4, 15), Math.max(0.4, s * 0.12), HEN_PAINT.gold, 0.55);
      pen.hair(f.shape.slice(3, 16), 0.3, HEN_PAINT.dark, 0.45);
    },
  });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.45), HEN_PAINT.dark, { shade: 0.32, hatch: 0.28, lit: 0.16, line: 0 });
  rimLight(d, shape, HEN_PAINT.gold, 1, 0.4);
  pen.stroke(closed(shape), o.line ?? 1, d.ink, 1);
}

/** A flight or tail feather: russet (or glossy dark for the tail), darker at its tip. */
export function henFeather(d: Draw, f: Blade, w: number, dark = false, line = 0.5): void {
  vane(d, f, w, {
    base: dark ? HEN_PAINT.tail : HEN_PAINT.russet,
    alpha: 0.9,
    deep: dark ? '#0d0907' : HEN_PAINT.dark,
    glazes: dark ? [HEN_PAINT.deep, HEN_PAINT.sheen] : [HEN_PAINT.light, HEN_PAINT.russet],
    glazeAlpha: dark ? 0.3 : 0.4,
    fringe: dark ? HEN_PAINT.russet : undefined,
    tip: dark ? undefined : HEN_PAINT.dark,
    tipFrom: 0.7,
    tipAlpha: 0.55,
    shaft: dark ? '#7a6a58' : HEN_PAINT.gold,
    barbs: dark ? '#5a4a3c' : HEN_PAINT.deep,
    barbAlpha: 0.3,
    lit: dark ? '#9bb8a6' : HEN_PAINT.gold,
    line,
    lineAlpha: 0.7,
  });
}

/** The hackles: golden lance feathers streaked dark, flowing back from the head over the shoulders. */
export function hackles(d: Draw, rng: Rng, c: Pt, rx: number, ry: number, ruffle = 0): Pt[] {
  const { pen } = d;
  // A cape: narrow at the throat, spreading over the shoulders, its rear edge broken into hackle tips.
  const base = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * TAU;
    const k = Math.cos(a);
    return pt(c.x + k * rx, c.y + Math.sin(a) * ry * (1 - 0.38 * Math.max(0, k) ** 1.5));
  });
  const shape = scalloped(base, 2.4, 0.55);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HEN_PAINT.gold, 0.8);
  pen.clipped(shape, () => {
    glaze(d, c.x - rx * 0.4, c.y, rx * 0.8, ry * 0.9, 0, HEN_PAINT.russet, 0.5);
    for (let i = 0; i < 46; i++) {
      const a = rng() * TAU;
      const rr = Math.sqrt(rng());
      const p = pt(c.x + Math.cos(a) * rx * rr, c.y + Math.sin(a) * ry * rr);
      const back = Math.PI + (p.y - c.y) / ry * 0.5 + (rng() - 0.5) * (0.25 + ruffle * 1.4);
      const len = 4 + rng() * 2.5;
      const f = lanceBlade(polar(p, back + Math.PI, len * 0.3), back, len, 2.2, (rng() - 0.5) * 0.15);
      pen.fill(f.shape, rng() < 0.6 ? HEN_PAINT.gold : HEN_PAINT.light, 0.6);
      pen.hair([f.at(0.1, 0), f.at(0.8, 0)], 0.5, HEN_PAINT.deep, 0.7);
      pen.hair(f.shape.slice(0, 11), 0.3, HEN_PAINT.dark, 0.4);
    }
  });
  model(d, shape, 2.5, HEN_PAINT.deep, { shade: 0.3, hatch: 0.22, lit: 0.12, line: 0 });
  pen.hair(closed(shape), 0.6, d.ink, 0.85);
  return shape;
}

export interface HenHead {
  readonly c: Pt;
  readonly r: number;
  /** Beak length from the face (short when pointing down). */
  readonly beak: number;
  /** Beak open (squawking). */
  readonly open?: boolean;
}

/**
 * The comb along the crown, seen from above: the top of its red blade, a
 * narrow strip swelling into rounded points, flopped a little to one side.
 */
function comb(d: Draw, h: HenHead): void {
  const { pen } = d;
  const x0 = h.c.x - h.r * 0.7;
  const x1 = h.c.x + h.r * 0.95;
  const n = 24;
  const side = (s: number): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n;
      const bump = Math.abs(Math.sin(u * 5 * Math.PI));
      const w = (0.45 + 0.75 * Math.sin(Math.PI * (0.08 + u * 0.84))) * (0.75 + 0.35 * bump);
      return pt(x0 + (x1 - x0) * u, -0.5 + s * w);
    });
  const top = side(-1);
  const shape = [...top, ...side(1).reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HEN_PAINT.comb, 0.95);
  pen.clipped(shape, () => {
    pen.fill(shape.map((p) => pt(p.x, p.y + 1.1)), HEN_PAINT.combDeep, 0.45);
    pen.hair(top.map((p) => pt(p.x, p.y + 0.5)), 0.5, HEN_PAINT.combLight, 0.85);
  });
  pen.stroke(closed(shape), 0.55, d.ink, 1, false);
}

/** The head: russet, the comb on the crown, amber eyes with a red earlobe behind, the wattles and beak. */
export function henHead(d: Draw, rng: Rng, h: HenHead): void {
  const { pen } = d;
  const { c, r } = h;
  const b0 = c.x + r * 0.85;
  // Wattles first: red lobes peeping out under the beak.
  for (const s of [-1, 1]) {
    const w = ellipseAt(b0 + 0.6, s * 2.1, 2.1, 1.6, s * 0.4, 14);
    pen.fill(w, HEN_PAINT.comb, 0.95);
    pen.crescent(w, pt(-0.5, -0.7), () => pen.fill(w, HEN_PAINT.combDeep, 0.5));
    pen.hair(closed(w), 0.5, d.ink, 0.9);
  }
  const shape = ellipseAt(c.x, c.y, r * 1.1, r * 0.92, 0, 28);
  henPlumage(d, shape, rng, { n: 16, size: 2.2, line: 1 });
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.35, s * r * 0.72);
    pen.fill(ellipseAt(e.x - 2, e.y, 1.3, 0.9, 0, 10), HEN_PAINT.comb, 0.75);
    pen.fill(ellipseAt(e.x, e.y, 1.25, 1, 0, 12), HEN_PAINT.eye, 1);
    pen.dot(e.x + 0.1, e.y, 0.55, '#140c08', 1);
    pen.dot(e.x - 0.3, e.y - 0.35, 0.3, PAPER_FILL, 0.95);
    pen.hair([pt(e.x - 1.3, e.y - s * 0.8), pt(e.x + 1.3, e.y - s * 0.7)], 0.5, d.ink, 0.8);
  }
  const l = h.beak;
  const half = 1.9;
  const upper = [...cub(pt(b0, -half), pt(b0 + l * 0.5, -half), pt(b0 + l * 0.85, -half * 0.5), pt(b0 + l, 0), 6), ...cub(pt(b0 + l, 0), pt(b0 + l * 0.85, half * 0.5), pt(b0 + l * 0.5, half), pt(b0, half), 6).slice(1)];
  if (h.open) {
    const lower = upper.map((p) => pt(p.x - 0.6, p.y * 0.8 + 1.2));
    pen.fill(lower, HEN_PAINT.beakDeep, 1);
    pen.hair(closed(lower), 0.5, d.ink, 0.9);
  }
  pen.fill(upper, HEN_PAINT.beak, 1);
  pen.clipped(upper, () => pen.crescent(upper, pt(-0.5, -0.8), () => pen.fill(upper, HEN_PAINT.beakDeep, 0.6)));
  pen.hair([pt(b0 + 0.6, -0.3), pt(b0 + l * 0.8, -0.2)], 0.5, PAPER_FILL, 0.7);
  pen.stroke(closed(upper), 0.65, d.ink, 1, false);
  comb(d, h);
}

/** A yellow foot: three toes forward, one back, the scaly shank, the claws. */
export function henFoot(d: Draw, at: Pt, ang: number): void {
  const { pen } = d;
  for (const a of [-0.55, 0, 0.55, Math.PI]) {
    const len = a > 3 ? 3.4 : 6;
    const tip = polar(at, ang + a, len);
    pen.stroke([at, tip], 1.9, HEN_PAINT.foot, 1, false);
    pen.hair([at, tip], 0.45, d.ink, 0.8);
    pen.dot(tip.x, tip.y, 0.5, d.ink, 0.9);
  }
  pen.dot(at.x, at.y, 1.1, HEN_PAINT.foot, 1);
}

/** The hen's tail: a short fan of dark green-glossed feathers, `half` its half-width, raised over the rump. */
export function henTail(d: Draw, x: number, len: number, half: number, ruffle = 0): Blade[] {
  const out: Blade[] = [];
  for (const k of [3, 2, 1, 0]) {
    for (const s of [-1, 1]) {
      if (k === 0 && s < 0) continue;
      const y = s * k * (half / 4);
      const jitter = ruffle * ((k * 37 + (s > 0 ? 11 : 0)) % 7 - 3) * 0.06;
      out.push(petalBlade(pt(x, y * 0.4), Math.PI + Math.atan2(y, len) * 2.2 + jitter, len - k * 0.8, 5.4, s * 0.02));
    }
  }
  for (const f of out) henFeather(d, f, 5.4, true, 0.55);
  return out;
}
