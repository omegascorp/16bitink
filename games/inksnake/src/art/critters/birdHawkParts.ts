import type { Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, rimLight, vane } from './birdKit';
import { covertRows, paintWing, type Wing } from './birdWing';

/**
 * The red-tailed hawk's paint: warm dark-brown upperparts, every feather
 * fringed in buff so the back and coverts read mottled, pale patches on
 * the scapulars, barred dusky flight feathers with dark fingertips, the
 * brick-red tail with its thin dark band and pale tip, a pale streaked head
 * with a fierce brow, yellow cere and a dark hooked bill. Facing +x, light
 * from the upper left.
 */
export const HAWK_PAINT = {
  brown: '#6e4527',
  mid: '#8d5b32',
  dark: '#3a2314',
  deep: '#22140b',
  buff: '#d6b07c',
  pale: '#efe0c0',
  flight: '#5f4431',
  bar: '#2c1b11',
  rufous: '#c2502a',
  rufousLight: '#e07b45',
  rufousDeep: '#7d2c15',
  head: '#e2c99a',
  cere: '#e6b843',
  bill: '#353944',
  foot: '#e8bd45',
  talon: '#16120f',
  eye: '#8a5a24',
} as const;

/** One flight feather: dusky brown, barred, a pale edge to the secondaries, dark tips to the primaries. */
export function hawkFlight(d: Draw, f: Blade, w: number, primary: boolean, line = primary ? 0.5 : 0.4): void {
  vane(d, f, w, {
    base: primary ? mix(HAWK_PAINT.flight, HAWK_PAINT.dark, 0.25) : HAWK_PAINT.flight,
    alpha: 0.92,
    deep: HAWK_PAINT.deep,
    glazes: primary ? [HAWK_PAINT.mid] : [HAWK_PAINT.mid, HAWK_PAINT.brown],
    glazeAlpha: 0.3,
    bars: primary ? 5 : 4,
    bar: HAWK_PAINT.bar,
    barAlpha: 0.42,
    tip: primary ? HAWK_PAINT.deep : undefined,
    tipFrom: 0.74,
    tipAlpha: 0.7,
    fringe: primary ? undefined : HAWK_PAINT.pale,
    shaft: HAWK_PAINT.buff,
    barbs: HAWK_PAINT.deep,
    barbAlpha: 0.25,
    lit: HAWK_PAINT.buff,
    line,
    lineAlpha: primary ? 0.75 : 0.5,
  });
}

/** A small body feather: brown (now and then dark or pale), a dark shaft streak and a buff fringe at its tip. */
function smallFeather(d: Draw, f: Blade, s: number, r: number, paleBias = 0): void {
  const { pen } = d;
  const pale = r < 0.1 + paleBias;
  const tone = pale ? mix(HAWK_PAINT.pale, HAWK_PAINT.buff, 0.45) : r < 0.5 ? HAWK_PAINT.brown : r < 0.8 ? HAWK_PAINT.mid : HAWK_PAINT.dark;
  pen.fill(f.shape, tone, pale ? 0.75 : 0.55);
  pen.hair([f.at(0.1, 0), f.at(0.75, 0)], s * (pale ? 0.12 : 0.2), HAWK_PAINT.deep, pale ? 0.5 : 0.65);
  pen.hair(f.shape.slice(5, 13), Math.max(0.45, s * 0.14), pale ? HAWK_PAINT.pale : HAWK_PAINT.buff, 0.65);
  pen.hair(f.shape.slice(3, 15), 0.3, HAWK_PAINT.deep, 0.5);
}

/** Brown plumage over a shape: a warm wash, a coat of buff-fringed feathers, `pale` patches (scapulars), volume. */
export function hawkPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; dir?: (p: Pt) => number; pale?: (p: Pt) => number; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HAWK_PAINT.brown, 0.88);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.3, b.cy, b.rx * 0.6, b.ry * 0.7, 0, HAWK_PAINT.mid, 0.4);
    glaze(d, b.cx - b.rx * 0.4, b.cy, b.rx * 0.5, b.ry * 0.6, 0, HAWK_PAINT.dark, 0.3);
  });
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI),
    n: o.n,
    size: o.size,
    paint: ({ f, s, r }) => {
      const c = f.at(0.5, 0);
      smallFeather(d, f, s, r, o.pale ? o.pale(c) : 0);
    },
  });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.4), HAWK_PAINT.deep, { shade: 0.38, hatch: 0.25, lit: 0.12, line: 0 });
  rimLight(d, shape, HAWK_PAINT.pale, 0.9, 0.35);
  pen.stroke(closed(shape), o.line ?? 1.2, d.ink, 1);
}

/** Paints an open wing: barred flight feathers back to front, then rows of buff-fringed coverts. */
export function paintHawkWing(d: Draw, w: Wing, rng: Rng, depth: (t: number) => number): void {
  paintWing(d, w, {
    feather: (x) => hawkFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, HAWK_PAINT.brown, 0.9);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, HAWK_PAINT.mid, 0.35);
        covertRows(wing, 4, depth, (t, r) => 6.4 - r * 1.1 - t * 1.4, (f, s, t, r) => smallFeather(d, f, s, 0.1 + rng() * 0.9, r === 1 && t < 0.3 ? 0.12 : 0));
        // The leading edge (the patagium) is darker and finely feathered.
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.05)), 2.6, HAWK_PAINT.dark, 0.45, false);
      });
      model(d, wing.coverts, 3, HAWK_PAINT.deep, { shade: 0.3, hatch: 0.2, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, HAWK_PAINT.pale, 0.9, 0.3);
    },
  });
}

/** Where the tail's tip edge is, u from -1 to 1: rounded, a small notch between each feather. */
function tailTip(c: TailSpec, u: number): Pt {
  const lobe = Math.abs(Math.sin(((u + 1) / 2) * 6 * Math.PI));
  return pt(c.x - c.len * (1 - 0.14 * u * u) - lobe * 0.8, c.half * u * (1 - 0.06 * u * u));
}

export interface TailSpec {
  /** Root x, length, half-width at the tip. */
  readonly x: number;
  readonly len: number;
  readonly half: number;
}

export function tailShape(c: TailSpec): Pt[] {
  const us = Array.from({ length: 41 }, (_, i) => -1 + i / 20);
  return [pt(c.x, 4.5), ...us.map((u) => tailTip(c, u)).reverse(), pt(c.x, -4.5)];
}

/**
 * The red tail: brick-red washed over orange, each feather's shaft and edge,
 * the thin dark subterminal band and the pale tip, the root under buff
 * upper tail coverts.
 */
export function redTail(d: Draw, c: TailSpec): void {
  const { pen } = d;
  const shape = tailShape(c);
  const n = 12;
  const at = (u: number, k: number): Pt => {
    const tip = tailTip(c, u);
    const root = pt(c.x + 2, u * 3.5);
    return pt(root.x + (tip.x - root.x) * k, root.y + (tip.y - root.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HAWK_PAINT.rufousLight, 0.85);
  pen.clipped(shape, () => {
    glaze(d, c.x - c.len * 0.45, 0, c.len * 0.55, c.half * 0.9, 0, HAWK_PAINT.rufous, 0.75);
    glaze(d, c.x - c.len * 0.5, c.half * 0.4, c.len * 0.5, c.half * 0.6, 0, HAWK_PAINT.rufousDeep, 0.3);
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const u1 = u0 + 2 / n;
      const um = (u0 + u1) / 2;
      // Each feather shaded along its far edge, lit along its near one.
      pen.fill([at(u1, 0), at(u1, 1.05), at(um + 0.25 / n, 1.05), at(um, 0.1)], HAWK_PAINT.rufousDeep, 0.28);
      pen.hair([at(u0 + 0.2 / n, 0.15), at(u0 + 0.2 / n, 0.85)], 0.5, '#f6b07a', 0.4);
      pen.hair([at(um, 0.05), at(um, 0.96)], 0.4, HAWK_PAINT.rufousDeep, 0.55);
      if (i > 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.45, d.ink, 0.5);
    }
    // The thin dark subterminal band, then the pale tip.
    const band = (k: number): Pt[] => Array.from({ length: 21 }, (_, i) => at(-1.1 + i * 0.11, k));
    pen.stroke(band(0.9), 1.6, HAWK_PAINT.deep, 0.6, false);
    pen.stroke(band(1.0), 1.8, HAWK_PAINT.pale, 0.75, false);
  });
  pen.crescent(shape, pt(-2, -3), () => pen.fill(shape, HAWK_PAINT.rufousDeep, 0.25));
  pen.stroke(closed(shape), 1, d.ink, 1);
}

/** The upper tail coverts: a buff, barred patch over the tail's root. */
export function rump(d: Draw, c: TailSpec, rng: Rng): void {
  const shape = ellipseAt(c.x - 3, 0, 8, 6.5, 0, 20);
  hawkPlumage(d, shape, rng, { n: 12, size: 4, pale: () => 0.35, line: 0.8 });
}

export interface HawkHead {
  readonly c: Pt;
  readonly r: number;
}

/**
 * The head: pale buff, streaked brown on the crown and nape, the brows
 * jutting over the eyes (the fierce look from above), the yellow cere and
 * the dark hooked bill.
 */
export function hawkHead(d: Draw, rng: Rng, h: HawkHead, down = 0): Pt[] {
  const { pen } = d;
  const { c, r } = h;
  const shape = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.08 + 0.1 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * (0.92 - 0.08 * Math.max(0, Math.cos(a))));
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HAWK_PAINT.head, 0.85);
  pen.clipped(shape, () => {
    glaze(d, c.x - r * 0.6, 0, r * 0.8, r * 0.9, 0, HAWK_PAINT.brown, 0.5);
    // Streaks on the crown and nape, combed back.
    for (let i = 0; i < 26; i++) {
      const y = (rng() - 0.5) * r * 1.6;
      const x = c.x - r + rng() * r * 1.5;
      const l = 1.6 + rng() * 2.2;
      pen.hair([pt(x + l, c.y + y), pt(x, c.y + y * 1.04)], 0.5 + rng() * 0.35, rng() < 0.7 ? HAWK_PAINT.brown : HAWK_PAINT.dark, 0.7);
    }
  });
  pen.crescent(shape, pt(-1.6, -2.4), () => pen.fill(shape, HAWK_PAINT.dark, 0.3));
  pen.crescent(shape, pt(-1, -1.5), () => pen.hatch(shape, 1.5, 0.9, 0.3, { color: d.ink, alpha: 0.3 }));
  pen.clipped(shape, () => glaze(d, c.x - 1, c.y - r * 0.4, r * 0.5, r * 0.3, -0.3, PAPER_FILL, 0.3));
  // Firm round the face, soft where the nape runs into the back.
  const ring = closed(shape);
  pen.stroke([...ring.slice(27), ...ring.slice(1, 11)], 1.15, d.ink, 1, false);
  pen.hair(ring.slice(10, 28), 0.55, d.ink, 0.7);
  // The eyes under the jutting brows: a dark stripe behind each, the pale brow over it.
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.45, c.y + s * r * 0.78);
    pen.fill(ellipseAt(e.x - 2.2, e.y + s * 0.2, 3.4, 1.2, s * 0.15, 12), HAWK_PAINT.dark, 0.7);
    pen.fill(ellipseAt(e.x, e.y + s * 0.2, 2, 1.5, 0, 14), HAWK_PAINT.eye, 1);
    pen.dot(e.x + 0.4, e.y + s * 0.2, 0.9, '#120b07', 1);
    pen.dot(e.x - 0.2, e.y - 0.2, 0.4, PAPER_FILL, 0.95);
    // The brow: a dark jutting shelf over the eye, a pale stripe above it, angled down to the bill.
    pen.stroke(bezier(pt(e.x - 4, e.y - s * 1.2), pt(e.x - 0.5, e.y - s * 2), pt(e.x + 3.2, e.y - s * 0.8), 8), 1.6, HAWK_PAINT.deep, 0.9, false);
    pen.hair(bezier(pt(e.x - 4.5, e.y - s * 2.3), pt(e.x - 0.5, e.y - s * 3.1), pt(e.x + 2.6, e.y - s * 2), 8), 0.9, HAWK_PAINT.pale, 0.85);
  }
  // Cere and bill: short from above (shorter still with the head down), deep and hooked.
  const b0 = c.x + r * 1.05;
  const bl = 7.5 * (1 - down * 0.35);
  const bw = 2.9;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw), pt(b0 + bl * 0.9, -bw * 0.55), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.9, bw * 0.55), pt(b0 + bl * 0.5, bw), pt(b0, bw), 8).slice(1)];
  pen.fill(bill, HAWK_PAINT.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0, 0, 2.6, bw + 0.3, 0, 14), HAWK_PAINT.cere, 1);
    pen.hair([pt(b0 + 2.2, -0.6), pt(b0 + bl * 0.8, -0.4)], 0.8, '#8c93a6', 0.8);
    pen.crescent(bill, pt(-0.6, -1), () => pen.fill(bill, '#000000', 0.4));
  });
  pen.dot(b0 + 1.1, -bw * 0.45, 0.45, HAWK_PAINT.deep, 0.9);
  pen.dot(b0 + 1.1, bw * 0.45, 0.45, HAWK_PAINT.deep, 0.9);
  pen.stroke(closed(bill), 0.8, d.ink, 1, false);
  return shape;
}

/** A foot gripping: yellow scaly toes spread, the black talons hooked in. */
export function talons(d: Draw, at: Pt, ang: number, s: 1 | -1): void {
  const { pen } = d;
  for (const a of [-0.55, 0, 0.5, Math.PI - 0.2]) {
    const tip = polar(at, ang + a * s, a > 2 ? 5 : 7);
    const mid = polar(at, ang + a * s + 0.12 * s, a > 2 ? 2.4 : 3.2);
    pen.stroke([at, mid, tip], 2.6, HAWK_PAINT.foot, 1, false);
    pen.hair([at, mid, tip], 0.5, d.ink, 0.8);
    pen.stroke([tip, polar(tip, ang + a * s + 0.5 * s, 1.8), polar(tip, ang + a * s + 1.3 * s, 3.2)], 1.4, HAWK_PAINT.talon, 1, false);
  }
  pen.dot(at.x, at.y, 1.5, HAWK_PAINT.foot, 1);
}
