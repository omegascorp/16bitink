import type { Rng } from '../../logic/rng';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, rimLight, vane } from '../critters/birdKit';
import { covertRows, paintWing, type Wing } from '../critters/birdWing';
import { polar } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';

/**
 * The short-toed snake eagle's paint, after the red-tailed hawk's: ash-brown
 * upperparts, every feather fringed paler so the back reads scaled, the
 * upperwing coverts sandy and paler than the dusky, faintly barred flight
 * feathers, a grey-brown tail crossed by three dark bars, and the big round
 * owlish head with its staring yellow eyes and small grey hooked bill.
 * Hawk units (the eagle is scaled down to its frame), light from the upper left.
 */
export const EAGLE = {
  brown: '#7a6853',
  mid: '#9a8670',
  dark: '#4b3e31',
  deep: '#251e17',
  buff: '#d6c3a0',
  pale: '#efe5d0',
  covert: '#a8946f',
  flight: '#5c5045',
  bar: '#2d251e',
  tail: '#8c7c67',
  head: '#a38b6d',
  face: '#d9c8a8',
  cere: '#a3a8ae',
  bill: '#3b3f47',
  foot: '#c9c8b4',
  talon: '#171311',
  eye: '#f1b52c',
} as const;

/** One flight feather: dusky ash-brown, faintly barred, a pale edge to the secondaries, the primaries' tips darker. */
export function eagleFlight(d: Draw, f: Blade, w: number, primary: boolean): void {
  vane(d, f, w, {
    base: primary ? mix(EAGLE.flight, EAGLE.dark, 0.3) : EAGLE.flight,
    alpha: 0.92,
    deep: EAGLE.deep,
    glazes: primary ? [EAGLE.mid] : [EAGLE.mid, EAGLE.brown],
    glazeAlpha: 0.28,
    bars: primary ? 4 : 5,
    bar: EAGLE.bar,
    barAlpha: 0.3,
    tip: primary ? EAGLE.deep : undefined,
    tipFrom: 0.72,
    tipAlpha: 0.65,
    fringe: primary ? undefined : EAGLE.pale,
    shaft: EAGLE.buff,
    barbs: EAGLE.deep,
    barbAlpha: 0.22,
    lit: EAGLE.buff,
    line: primary ? 0.5 : 0.4,
    lineAlpha: primary ? 0.75 : 0.5,
  });
}

/** A small feather: ash-brown (now and then darker, or paler for the coverts), a dark shaft streak and a pale fringe. */
function smallFeather(d: Draw, f: Blade, s: number, r: number, pale = 0): void {
  const { pen } = d;
  const light = r < 0.12 + pale;
  const tone = light ? mix(EAGLE.buff, EAGLE.covert, 0.4) : r < 0.5 ? EAGLE.brown : r < 0.82 ? EAGLE.mid : EAGLE.dark;
  pen.fill(f.shape, tone, light ? 0.75 : 0.55);
  pen.hair([f.at(0.1, 0), f.at(0.7, 0)], s * (light ? 0.1 : 0.17), EAGLE.deep, light ? 0.45 : 0.6);
  pen.hair(f.shape.slice(5, 13), Math.max(0.45, s * 0.14), EAGLE.pale, 0.6);
  pen.hair(f.shape.slice(3, 15), 0.3, EAGLE.deep, 0.45);
}

/** Ash-brown plumage over a shape: wash, glazes, a coat of pale-fringed feathers, `pale` making some paler, the form, a contour. */
export function eaglePlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; pale?: (p: Pt) => number; tone?: string; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, o.tone ?? EAGLE.brown, 0.86);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.3, b.cy, b.rx * 0.6, b.ry * 0.7, 0, EAGLE.mid, 0.4);
    glaze(d, b.cx - b.rx * 0.4, b.cy, b.rx * 0.5, b.ry * 0.6, 0, EAGLE.dark, 0.25);
  });
  coat(d, shape, rng, {
    dir: () => Math.PI,
    n: o.n,
    size: o.size,
    paint: ({ f, s, r }) => smallFeather(d, f, s, r, o.pale ? o.pale(f.at(0.5, 0)) : 0),
  });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.4), EAGLE.deep, { shade: 0.35, hatch: 0.22, lit: 0.14, line: 0 });
  rimLight(d, shape, EAGLE.pale, 0.9, 0.35);
  if ((o.line ?? 1.2) > 0) pen.stroke(closed(shape), o.line ?? 1.2, d.ink, 1);
}

/** Paints an open wing: dusky flight feathers back to front, then rows of sandy, pale-fringed coverts. */
export function paintEagleWing(d: Draw, w: Wing, rng: Rng, depth: (t: number) => number): void {
  paintWing(d, w, {
    feather: (x) => eagleFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, EAGLE.covert, 0.88);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, EAGLE.buff, 0.35);
        covertRows(wing, 4, depth, (t, r) => 6.2 - r * 1.1 - t * 1.4, (f, s, _t, r) => smallFeather(d, f, s, 0.05 + rng() * 0.95, r < 2 ? 0.3 : 0.12));
        // The leading edge (the patagium) darker and finely feathered.
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.05)), 2.6, EAGLE.dark, 0.5, false);
      });
      model(d, wing.coverts, 3, EAGLE.deep, { shade: 0.28, hatch: 0.18, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, EAGLE.pale, 0.9, 0.3);
    },
  });
}

export interface TailSpec {
  /** Root x, length, half-width at the tip. */
  readonly x: number;
  readonly len: number;
  readonly half: number;
}

/** Where the tail's tip edge is, u from -1 to 1: squarish, a small notch between each feather. */
function tailTip(c: TailSpec, u: number): Pt {
  const lobe = Math.abs(Math.sin(((u + 1) / 2) * 6 * Math.PI));
  return pt(c.x - c.len * (1 - 0.06 * u * u) - lobe * 0.8, c.half * u * (1 - 0.05 * u * u));
}

export function tailShape(c: TailSpec): Pt[] {
  const us = Array.from({ length: 41 }, (_, i) => -1 + i / 20);
  return [pt(c.x, 5), ...us.map((u) => tailTip(c, u)).reverse(), pt(c.x, -5)];
}

/** The tail: grey-brown, each feather's shaft and edge, three dark bars across it and a pale tip. */
export function barredTail(d: Draw, c: TailSpec): void {
  const { pen } = d;
  const shape = tailShape(c);
  const n = 12;
  const at = (u: number, k: number): Pt => {
    const tip = tailTip(c, u);
    const root = pt(c.x + 2, u * 4);
    return pt(root.x + (tip.x - root.x) * k, root.y + (tip.y - root.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.tail, 0.88);
  pen.clipped(shape, () => {
    glaze(d, c.x - c.len * 0.5, 0, c.len * 0.55, c.half * 0.9, 0, EAGLE.mid, 0.45);
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const u1 = u0 + 2 / n;
      const um = (u0 + u1) / 2;
      pen.fill([at(u1, 0), at(u1, 1.05), at(um + 0.25 / n, 1.05), at(um, 0.1)], EAGLE.dark, 0.22);
      pen.hair([at(u0 + 0.2 / n, 0.15), at(u0 + 0.2 / n, 0.85)], 0.5, EAGLE.pale, 0.35);
      pen.hair([at(um, 0.05), at(um, 0.96)], 0.4, EAGLE.dark, 0.5);
      if (i > 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.45, d.ink, 0.45);
    }
    // Three dark bars, the last (subterminal) the broadest, and the pale tip.
    const band = (k: number): Pt[] => Array.from({ length: 21 }, (_, i) => at(-1.1 + i * 0.11, k));
    for (const [k, w] of [[0.38, 1.6], [0.6, 1.8], [0.84, 2.6]] as const) pen.stroke(band(k), w, EAGLE.bar, 0.6, false);
    pen.stroke(band(1), 1.8, EAGLE.pale, 0.75, false);
  });
  pen.crescent(shape, pt(-2, -3), () => pen.fill(shape, EAGLE.deep, 0.22));
  pen.stroke(closed(shape), 1, d.ink, 1);
}

export interface Head {
  readonly c: Pt;
  readonly r: number;
}

/**
 * The head: big and round (owlish), pale-faced, streaked on the crown and
 * nape, the large yellow eyes set forward under a slight brow, the grey
 * cere and the small dark hooked bill. `down` foreshortens the bill (the
 * head bent to look down, as it hangs in the wind or dives).
 */
export function eagleHead(d: Draw, rng: Rng, h: Head, down = 0): void {
  const { pen } = d;
  const { c, r } = h;
  const shape = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.02 + 0.06 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r);
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.head, 0.85);
  pen.clipped(shape, () => {
    glaze(d, c.x + r * 0.45, 0, r * 0.7, r * 0.8, 0, EAGLE.face, 0.7);
    glaze(d, c.x - r * 0.6, 0, r * 0.8, r * 0.9, 0, EAGLE.brown, 0.5);
    for (let i = 0; i < 30; i++) {
      const y = (rng() - 0.5) * r * 1.7;
      const x = c.x - r + rng() * r * 1.4;
      const l = 1.6 + rng() * 2.4;
      pen.hair([pt(x + l, c.y + y), pt(x, c.y + y * 1.04)], 0.5 + rng() * 0.35, rng() < 0.7 ? EAGLE.brown : EAGLE.dark, 0.65);
    }
  });
  pen.crescent(shape, pt(-1.8, -2.6), () => pen.fill(shape, EAGLE.dark, 0.3));
  pen.crescent(shape, pt(-1, -1.5), () => pen.hatch(shape, 1.5, 0.9, 0.3, { color: d.ink, alpha: 0.28 }));
  pen.clipped(shape, () => glaze(d, c.x - 1, c.y - r * 0.4, r * 0.5, r * 0.3, -0.3, PAPER_FILL, 0.3));
  const ring = closed(shape);
  pen.stroke([...ring.slice(26), ...ring.slice(1, 11)], 1.15, d.ink, 1, false);
  pen.hair(ring.slice(10, 27), 0.55, d.ink, 0.7);
  // The big staring eyes, set well forward, a dark ring round each and a soft brow over it.
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.55, c.y + s * r * 0.66);
    pen.fill(ellipseAt(e.x, e.y, 2.9, 2.4, 0, 16), EAGLE.dark, 0.75);
    pen.fill(ellipseAt(e.x + 0.2, e.y, 2.3, 1.9, 0, 16), EAGLE.eye, 1);
    pen.dot(e.x + 0.6, e.y, 1, '#120b07', 1);
    pen.dot(e.x - 0.3, e.y - 0.5, 0.5, PAPER_FILL, 0.95);
    pen.hair(bezier(pt(e.x - 3.6, e.y - s * 1.6), pt(e.x - 0.5, e.y - s * 2.6), pt(e.x + 3, e.y - s * 1.4), 8), 1.1, EAGLE.dark, 0.7);
  }
  const b0 = c.x + r * 1.02;
  const bl = 6 * (1 - down * 0.4);
  const bw = 2.5;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw), pt(b0 + bl * 0.9, -bw * 0.5), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.9, bw * 0.5), pt(b0 + bl * 0.5, bw), pt(b0, bw), 8).slice(1)];
  pen.fill(bill, EAGLE.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0, 0, 2.4, bw + 0.3, 0, 14), EAGLE.cere, 1);
    pen.hair([pt(b0 + 2, -0.5), pt(b0 + bl * 0.8, -0.35)], 0.7, '#8c93a6', 0.8);
    pen.crescent(bill, pt(-0.6, -1), () => pen.fill(bill, '#000000', 0.4));
  });
  pen.stroke(closed(bill), 0.8, d.ink, 1, false);
}

/** A foot: pale grey scaly toes spread, the black talons hooked; `reach` stretches it forward (feet thrown out in a dive). */
export function eagleFoot(d: Draw, at: Pt, ang: number, s: 1 | -1, reach = 0): void {
  const { pen } = d;
  if (reach > 0) {
    // The bare grey leg reaching forward to the foot.
    const hip = polar(at, ang + Math.PI, reach);
    pen.stroke([hip, polar(hip, ang, reach * 0.5), at], 3.4, EAGLE.foot, 1, false);
    pen.hair([hip, polar(hip, ang, reach * 0.5), at], 0.6, d.ink, 0.75);
  }
  for (const a of [-0.55, 0, 0.5, Math.PI - 0.2]) {
    const tip = polar(at, ang + a * s, a > 2 ? 4.5 : 6.5);
    const mid = polar(at, ang + a * s + 0.12 * s, a > 2 ? 2.2 : 3);
    pen.stroke([at, mid, tip], 2.4, EAGLE.foot, 1, false);
    pen.hair([at, mid, tip], 0.5, d.ink, 0.8);
    pen.stroke([tip, polar(tip, ang + a * s + 0.5 * s, 1.7), polar(tip, ang + a * s + 1.3 * s, 3)], 1.3, EAGLE.talon, 1, false);
  }
  pen.dot(at.x, at.y, 1.5, EAGLE.foot, 1);
}
