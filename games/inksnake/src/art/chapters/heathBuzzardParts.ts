import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, rimLight, vane } from '../critters/birdKit';
import { type TailSpec, tailShape } from '../critters/birdHawkParts';
import { covertRows, paintWing, type Wing } from '../critters/birdWing';

/**
 * The common buzzard's paint: dark chocolate-brown upperparts mottled with
 * pale fringes, coverts edged buff and a paler band across them, barred
 * flight feathers darkening to blackish fingertips, a grey-brown tail
 * finely barred with a broad dark band near its pale tip, and a round
 * brown head streaked darker, with a yellow cere and a dark hooked bill.
 * Facing +x, light from the upper left.
 */
export const BUZ = {
  brown: '#5e412b',
  mid: '#7d5838',
  dark: '#36251a',
  deep: '#1f150e',
  buff: '#c9a77a',
  pale: '#e9dcc2',
  flight: '#4e3a2b',
  bar: '#24180f',
  tail: '#8c7a68',
  tailLight: '#b3a28c',
  tailDeep: '#4c3d31',
  head: '#8a6646',
  cere: '#e2b83e',
  bill: '#30333c',
  eye: '#5a3418',
} as const;

/** One flight feather: dusky brown, barred, the primaries' fingertips blackish. */
export function buzFlight(d: Draw, f: Blade, w: number, primary: boolean): void {
  vane(d, f, w, {
    base: primary ? mix(BUZ.flight, BUZ.dark, 0.3) : BUZ.flight,
    alpha: 0.92,
    deep: BUZ.deep,
    glazes: primary ? [BUZ.mid] : [BUZ.mid, BUZ.brown],
    glazeAlpha: 0.28,
    bars: primary ? 5 : 6,
    bar: BUZ.bar,
    barAlpha: 0.38,
    tip: BUZ.deep,
    tipFrom: primary ? 0.66 : 0.86,
    tipAlpha: primary ? 0.8 : 0.5,
    fringe: primary ? undefined : BUZ.buff,
    shaft: BUZ.buff,
    barbs: BUZ.deep,
    barbAlpha: 0.25,
    lit: BUZ.buff,
    line: primary ? 0.5 : 0.4,
    lineAlpha: primary ? 0.75 : 0.5,
  });
}

/** A small body feather: brown, darker or paler by chance, a dark shaft streak and a buff fringe. */
function smallFeather(d: Draw, f: Blade, s: number, r: number, paleBias = 0): void {
  const { pen } = d;
  const pale = r < 0.08 + paleBias;
  const tone = pale ? mix(BUZ.pale, BUZ.buff, 0.55) : r < 0.45 ? BUZ.brown : r < 0.78 ? BUZ.mid : BUZ.dark;
  pen.fill(f.shape, tone, pale ? 0.7 : 0.58);
  pen.hair([f.at(0.1, 0), f.at(0.75, 0)], s * (pale ? 0.12 : 0.2), BUZ.deep, pale ? 0.5 : 0.65);
  pen.hair(f.shape.slice(5, 13), Math.max(0.4, s * 0.12), pale ? BUZ.pale : BUZ.buff, 0.55);
  pen.hair(f.shape.slice(3, 15), 0.3, BUZ.deep, 0.5);
}

/** Brown plumage over a shape: a dark wash, a coat of pale-fringed feathers, `pale` patches, volume. */
export function buzPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; pale?: (p: Pt) => number; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BUZ.brown, 0.9);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.3, b.cy, b.rx * 0.6, b.ry * 0.7, 0, BUZ.mid, 0.4);
    glaze(d, b.cx - b.rx * 0.4, b.cy, b.rx * 0.5, b.ry * 0.6, 0, BUZ.dark, 0.35);
  });
  coat(d, shape, rng, {
    dir: () => Math.PI,
    n: o.n,
    size: o.size,
    paint: ({ f, s, r }) => smallFeather(d, f, s, r, o.pale ? o.pale(f.at(0.5, 0)) : 0),
  });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.4), BUZ.deep, { shade: 0.38, hatch: 0.25, lit: 0.12, line: 0 });
  rimLight(d, shape, BUZ.pale, 0.9, 0.3);
  pen.stroke(closed(shape), o.line ?? 1.1, d.ink, 1);
}

/** An open wing: barred flight feathers back to front, then rows of buff-edged coverts, a paler band across the greater ones. */
export function paintBuzWing(d: Draw, w: Wing, rng: Rng, depth: (t: number) => number): void {
  paintWing(d, w, {
    feather: (x) => buzFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, BUZ.brown, 0.9);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, BUZ.mid, 0.35);
        covertRows(wing, 4, depth, (t, r) => 5.6 - r * 0.9 - t * 1.2, (f, s, t, r) => smallFeather(d, f, s, 0.08 + rng() * 0.92, r === 0 && t < 0.55 ? 0.1 : 0));
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.05)), 2.4, BUZ.dark, 0.5, false);
      });
      model(d, wing.coverts, 3, BUZ.deep, { shade: 0.3, hatch: 0.2, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, BUZ.pale, 0.9, 0.28);
    },
  });
}

/** The tail: grey-brown, each feather finely barred, a broad dark band near the tip and a pale tip edge. */
export function barredTail(d: Draw, c: TailSpec): void {
  const { pen } = d;
  const shape = tailShape(c);
  const n = 12;
  const at = (u: number, k: number): Pt => {
    const tip = pt(c.x - c.len * (1 - 0.14 * u * u), c.half * u * (1 - 0.06 * u * u));
    const root = pt(c.x + 2, u * 3.5);
    return pt(root.x + (tip.x - root.x) * k, root.y + (tip.y - root.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BUZ.tail, 0.9);
  pen.clipped(shape, () => {
    glaze(d, c.x - c.len * 0.35, 0, c.len * 0.5, c.half * 0.9, 0, BUZ.mid, 0.4);
    const band = (k: number): Pt[] => Array.from({ length: 23 }, (_, i) => at(-1.1 + i * 0.1, k));
    for (let i = 0; i < 9; i++) pen.hair(band(0.22 + i * 0.075), 0.7, BUZ.tailDeep, 0.5);
    pen.stroke(band(0.9), 2.2, BUZ.deep, 0.65, false);
    pen.stroke(band(1.0), 1.5, BUZ.pale, 0.75, false);
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const um = u0 + 1 / n;
      pen.fill([at(u0 + 2 / n, 0), at(u0 + 2 / n, 1.05), at(um + 0.25 / n, 1.05), at(um, 0.1)], BUZ.tailDeep, 0.22);
      pen.hair([at(u0 + 0.2 / n, 0.15), at(u0 + 0.2 / n, 0.85)], 0.45, BUZ.tailLight, 0.4);
      pen.hair([at(um, 0.05), at(um, 0.96)], 0.35, BUZ.tailDeep, 0.5);
      if (i > 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.4, d.ink, 0.45);
    }
  });
  pen.crescent(shape, pt(-2, -3), () => pen.fill(shape, BUZ.tailDeep, 0.25));
  pen.stroke(closed(shape), 0.95, d.ink, 1);
}

/** The head: round and brown, streaked darker, a dark eye under a low brow, the yellow cere and dark hooked bill. */
export function buzHead(d: Draw, rng: Rng, c: Pt, r: number, down = 0): void {
  const { pen } = d;
  const shape = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.06 + 0.08 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * (0.95 - 0.06 * Math.max(0, Math.cos(a))));
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BUZ.head, 0.88);
  pen.clipped(shape, () => {
    glaze(d, c.x - r * 0.5, c.y, r * 0.9, r * 0.9, 0, BUZ.brown, 0.55);
    glaze(d, c.x + r * 0.5, c.y - r * 0.2, r * 0.5, r * 0.4, 0, BUZ.buff, 0.3);
    for (let i = 0; i < 30; i++) {
      const y = (rng() - 0.5) * r * 1.7;
      const x = c.x - r + rng() * r * 1.6;
      const l = 1.4 + rng() * 2;
      pen.hair([pt(x + l, c.y + y), pt(x, c.y + y * 1.04)], 0.45 + rng() * 0.35, rng() < 0.7 ? BUZ.dark : BUZ.buff, 0.65);
    }
  });
  pen.crescent(shape, pt(-1.5, -2.2), () => pen.fill(shape, BUZ.dark, 0.32));
  pen.crescent(shape, pt(-1, -1.4), () => pen.hatch(shape, 1.5, 0.9, 0.3, { color: d.ink, alpha: 0.3 }));
  pen.clipped(shape, () => glaze(d, c.x - 1, c.y - r * 0.4, r * 0.5, r * 0.3, -0.3, PAPER_FILL, 0.25));
  const ring = closed(shape);
  pen.stroke([...ring.slice(27), ...ring.slice(1, 11)], 1.05, d.ink, 1, false);
  pen.hair(ring.slice(10, 28), 0.5, d.ink, 0.7);
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.45, c.y + s * r * 0.76);
    pen.fill(ellipseAt(e.x, e.y + s * 0.2, 1.9, 1.45, 0, 14), BUZ.eye, 1);
    pen.dot(e.x + 0.3, e.y + s * 0.2, 0.85, '#120b07', 1);
    pen.dot(e.x - 0.25, e.y - 0.2, 0.38, PAPER_FILL, 0.95);
    pen.stroke(bezier(pt(e.x - 3.6, e.y - s * 1.1), pt(e.x - 0.5, e.y - s * 1.8), pt(e.x + 2.8, e.y - s * 0.8), 8), 1.3, BUZ.deep, 0.85, false);
  }
  const b0 = c.x + r * 1.02;
  const bl = 6.4 * (1 - down * 0.35);
  const bw = 2.6;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw), pt(b0 + bl * 0.9, -bw * 0.55), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.9, bw * 0.55), pt(b0 + bl * 0.5, bw), pt(b0, bw), 8).slice(1)];
  pen.fill(bill, BUZ.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0, 0, 2.4, bw + 0.3, 0, 14), BUZ.cere, 1);
    pen.hair([pt(b0 + 2, -0.6), pt(b0 + bl * 0.8, -0.4)], 0.7, '#8c93a6', 0.8);
    pen.crescent(bill, pt(-0.6, -1), () => pen.fill(bill, '#000000', 0.4));
  });
  pen.dot(b0 + 1, -bw * 0.45, 0.42, BUZ.deep, 0.9);
  pen.dot(b0 + 1, bw * 0.45, 0.42, BUZ.deep, 0.9);
  pen.stroke(closed(bill), 0.75, d.ink, 1, false);
}
