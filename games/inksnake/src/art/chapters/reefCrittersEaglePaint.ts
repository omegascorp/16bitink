import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, rimLight, vane } from '../critters/birdKit';
import { covertRows, paintWing, type Wing } from '../critters/birdWing';

/**
 * The white-bellied sea eagle's paint: ash-grey back and wing coverts, each
 * feather fringed paler, slate-black flight feathers, a white head and neck
 * with a big blue-grey hooked bill, and a short wedge of a tail, grey at
 * the root and white beyond. Facing +x, light from the upper left.
 */
export const EAGLE = {
  grey: '#8d9399',
  mid: '#a6abb0',
  dark: '#5d636a',
  deep: '#24272d',
  pale: '#d9dcdc',
  flight: '#3a3e45',
  flightDeep: '#16181c',
  white: '#f4f2ea',
  whiteShade: '#b9bfc6',
  bill: '#7d8b9c',
  billTip: '#262b33',
  eye: '#4a2e1c',
} as const;

/** One flight feather: slate, the primaries blacker towards their tips, the secondaries with a paler edge. */
export function eagleFlight(d: Draw, f: Blade, w: number, primary: boolean): void {
  vane(d, f, w, {
    base: primary ? EAGLE.flight : mix(EAGLE.flight, EAGLE.dark, 0.35),
    alpha: 0.94,
    deep: EAGLE.flightDeep,
    glazes: [EAGLE.dark, EAGLE.grey],
    glazeAlpha: 0.25,
    tip: primary ? EAGLE.flightDeep : undefined,
    tipFrom: 0.6,
    tipAlpha: 0.6,
    fringe: primary ? undefined : EAGLE.mid,
    shaft: EAGLE.mid,
    barbs: EAGLE.flightDeep,
    barbAlpha: 0.3,
    lit: EAGLE.mid,
    line: primary ? 0.45 : 0.38,
    lineAlpha: primary ? 0.8 : 0.55,
  });
}

/** A small grey body or covert feather: its wash, a dark shaft and a pale fringe at the tip. */
function greyFeather(d: Draw, f: Blade, s: number, r: number, white = false): void {
  const { pen } = d;
  const tone = white ? (r < 0.3 ? EAGLE.whiteShade : EAGLE.white) : r < 0.4 ? EAGLE.grey : r < 0.7 ? EAGLE.mid : r < 0.92 ? EAGLE.dark : EAGLE.pale;
  pen.fill(f.shape, tone, white ? 0.6 : 0.7);
  pen.hair([f.at(0.15, 0), f.at(0.7, 0)], s * (white ? 0.07 : 0.13), white ? EAGLE.whiteShade : EAGLE.deep, white ? 0.4 : 0.5);
  pen.hair(f.shape.slice(5, 13), Math.max(0.4, s * 0.13), white ? PAPER_FILL : EAGLE.pale, 0.6);
  pen.hair(f.shape.slice(3, 15), 0.26, white ? EAGLE.whiteShade : EAGLE.deep, white ? 0.4 : 0.45);
}

/** Grey plumage (or white, for the neck) over a shape: a wash, a coat of fringed feathers, volume and a contour. */
export function eaglePlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; white?: boolean; line?: number; dir?: (p: Pt) => number }): void {
  const { pen } = d;
  const white = o.white ?? false;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, white ? EAGLE.white : EAGLE.grey, 0.88);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.3, b.cy, b.rx * 0.6, b.ry * 0.7, 0, white ? PAPER_FILL : EAGLE.mid, 0.4);
    glaze(d, b.cx - b.rx * 0.4, b.cy, b.rx * 0.5, b.ry * 0.6, 0, white ? EAGLE.whiteShade : EAGLE.dark, 0.3);
  });
  coat(d, shape, rng, { dir: o.dir ?? (() => Math.PI), n: o.n, size: o.size, paint: ({ f, s, r }) => greyFeather(d, f, s, r, white) });
  model(d, shape, Math.max(2.5, Math.min(b.rx, b.ry) * 0.4), white ? EAGLE.whiteShade : EAGLE.deep, { shade: white ? 0.45 : 0.36, hatch: 0.2, lit: 0.12, line: 0 });
  rimLight(d, shape, PAPER_FILL, 0.8, 0.35);
  if ((o.line ?? 0.95) > 0) pen.stroke(closed(shape), o.line ?? 0.95, d.ink, 1);
}

/** An open wing: the flight feathers back to front, then rows of grey coverts. */
export function paintEagleWing(d: Draw, w: Wing, rng: Rng, depth: (t: number) => number): void {
  paintWing(d, w, {
    feather: (x) => eagleFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, EAGLE.grey, 0.9);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, EAGLE.mid, 0.35);
        covertRows(wing, 4, depth, (t, r) => 4.8 - r * 0.8 - t * 1.1, (f, s, _t, r) => greyFeather(d, f, s, rng() * (r === 0 ? 1.6 : 1)));
        // The leading edge: a firm paler band of tiny feathers.
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.05)), 1.9, EAGLE.pale, 0.45, false);
      });
      model(d, wing.coverts, 2.4, EAGLE.deep, { shade: 0.3, hatch: 0.2, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, PAPER_FILL, 0.8, 0.3);
    },
  });
}

export interface EagleTail {
  /** Root x, length, half-width at the tip. */
  readonly x: number;
  readonly len: number;
  readonly half: number;
}

/** The short wedge of a tail: grey at the root, white beyond, the feathers fanned to a blunt point. */
export function wedgeTail(d: Draw, c: EagleTail): Pt[] {
  const { pen } = d;
  const n = 12;
  const tip = (u: number): Pt => pt(c.x - c.len * (1 - 0.32 * Math.abs(u)) - Math.abs(Math.sin(((u + 1) / 2) * 6 * Math.PI)) * 0.6, c.half * u);
  const us = Array.from({ length: 33 }, (_, i) => -1 + i / 16);
  const shape = [pt(c.x, 3.5), ...us.map(tip).reverse(), pt(c.x, -3.5)];
  const at = (u: number, k: number): Pt => {
    const t = tip(u);
    const r = pt(c.x + 1.5, u * 3);
    return pt(r.x + (t.x - r.x) * k, r.y + (t.y - r.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.white, 0.9);
  pen.clipped(shape, () => {
    glaze(d, c.x - c.len * 0.1, 0, c.len * 0.55, c.half * 0.8, 0, EAGLE.dark, 0.75);
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const um = u0 + 1 / n;
      pen.fill([at(u0 + 2 / n, 0), at(u0 + 2 / n, 1.05), at(um, 1.05), at(um, 0.1)], EAGLE.whiteShade, 0.35);
      pen.hair([at(um, 0.05), at(um, 0.95)], 0.32, EAGLE.whiteShade, 0.7);
      if (i > 0) pen.hair([at(u0, 0.1), at(u0, 1)], 0.35, d.ink, 0.45);
    }
  });
  pen.crescent(shape, pt(-1.5, -2.2), () => pen.fill(shape, EAGLE.whiteShade, 0.35));
  pen.stroke(closed(shape), 0.85, d.ink, 1);
  return shape;
}

export interface EagleHead {
  readonly c: Pt;
  readonly r: number;
}

/** The white head: a soft grey shade under the crown, a dark eye under a low brow, the big blue-grey hooked bill. */
export function eagleHead(d: Draw, rng: Rng, h: EagleHead, down = 0): void {
  const { pen } = d;
  const { c, r } = h;
  const shape = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.1 + 0.12 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * (0.9 - 0.1 * Math.max(0, Math.cos(a))));
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.white, 0.9);
  pen.clipped(shape, () => {
    for (let i = 0; i < 18; i++) {
      const y = (rng() - 0.5) * r * 1.6;
      const x = c.x - r + rng() * r * 1.4;
      const l = 1.2 + rng() * 1.6;
      pen.hair([pt(x + l, c.y + y), pt(x, c.y + y * 1.04)], 0.3 + rng() * 0.25, EAGLE.whiteShade, 0.55);
    }
  });
  pen.crescent(shape, pt(-1.3, -2), () => pen.fill(shape, EAGLE.whiteShade, 0.5));
  pen.crescent(shape, pt(-0.8, -1.2), () => pen.hatch(shape, 1.3, 0.9, 0.24, { color: d.ink, alpha: 0.25 }));
  const ring = closed(shape);
  pen.stroke([...ring.slice(27), ...ring.slice(1, 11)], 0.95, d.ink, 1, false);
  pen.hair(ring.slice(10, 28), 0.45, d.ink, 0.6);
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.5, c.y + s * r * 0.74);
    pen.fill(ellipseAt(e.x, e.y + s * 0.15, 1.5, 1.15, 0, 12), EAGLE.eye, 1);
    pen.dot(e.x + 0.3, e.y + s * 0.15, 0.6, '#0c0806', 1);
    pen.dot(e.x - 0.15, e.y - 0.15, 0.3, PAPER_FILL, 0.95);
    pen.stroke(bezier(pt(e.x - 2.8, e.y - s * 1), pt(e.x - 0.4, e.y - s * 1.6), pt(e.x + 2.4, e.y - s * 0.7), 8), 0.9, EAGLE.whiteShade, 0.9, false);
  }
  // The bill: long and deep from above (shorter with the head down), grey-blue with a dark hooked tip.
  const b0 = c.x + r * 1.05;
  const bl = 7.4 * (1 - down * 0.3);
  const bw = 2.5;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw), pt(b0 + bl * 0.92, -bw * 0.5), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.92, bw * 0.5), pt(b0 + bl * 0.5, bw), pt(b0, bw), 8).slice(1)];
  pen.fill(bill, EAGLE.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0 + bl, 0, bl * 0.32, bw, 0, 14), EAGLE.billTip, 0.9);
    pen.fill(ellipseAt(b0, 0, 2.2, bw + 0.3, 0, 14), mix(EAGLE.bill, EAGLE.whiteShade, 0.4), 1);
    pen.hair([pt(b0 + 2, -0.5), pt(b0 + bl * 0.75, -0.35)], 0.7, '#c5ced8', 0.8);
    pen.crescent(bill, pt(-0.5, -0.9), () => pen.fill(bill, '#000000', 0.35));
  });
  pen.dot(b0 + 1, -bw * 0.45, 0.4, EAGLE.deep, 0.9);
  pen.dot(b0 + 1, bw * 0.45, 0.4, EAGLE.deep, 0.9);
  pen.stroke(closed(bill), 0.7, d.ink, 1, false);
}
