import { bezier, closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FAR } from './common';

/**
 * The life of a mangrove estuary: egrets and ibis flying over, a brahminy
 * kite soaring side-on, an egret and a grey heron fishing the shallows; and on the
 * mud itself crab burrows ringed with mud balls, fallen leaves, bird
 * tracks and puddles.
 * Birds face right for `dir` 1.
 */
const KITE = '#a8562c';
const HERON = '#9aa4ad';
const SAIL = '#6f8fa8';
const BILL = '#e3b23c';
const MUD_BALL = '#7a6e5c';

/** One wing seen side-on in flight, from the shoulder at the body; `f` raises (1) or lowers (-1) it. */
function wing(P: (dx: number, dy: number) => Pt, f: number, span: number, broad: number): Pt[] {
  const tip = -1 - 8 * f;
  const lead = cub(P(1, -0.6), P(1, tip * 0.5), P(-1.5, tip * 0.9), P(-span * 0.6, tip * (span / 10)), 8);
  const trail = cub(P(-span * 0.6, tip * (span / 10)), P(-span * 0.5 - broad, tip * 0.5), P(-3 - broad, -0.6), P(-2.5, 0.2), 8);
  return [...lead, ...trail.slice(1)];
}

/** An egret flying: broad white wings, neck folded back into the shoulders, black legs trailing. */
export function egretFlying(t: Draw, x: number, y: number, s: number, f: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, y + dy * s);
  pen.hair([P(-3.5, 0.6), P(-11, 1.4)], 0.5, t.ink, FAR);
  const far = wing((dx, dy) => P(dx + 1.2, dy - 0.4), f * 0.8, 9, 1);
  pen.fill(far, PAPER_FILL, 0.95);
  pen.hair(closed(far), 0.4, t.ink, FAR * 0.7);
  const body = oval(x, y, 4.5 * s, 1.5 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  const neck = bezier(P(3.5, -0.6), P(6.5, -2.2), P(5.8, -0.2), 5);
  pen.hair(neck, 1.4 * s, PAPER_FILL, 1);
  pen.hair(neck, 0.4, t.ink, FAR * 0.8);
  pen.hair([P(6.2, -0.6), P(9.6, -0.1)], 0.8, BILL, 0.95);
  const near = wing(P, f, 10, 1.4);
  pen.fill(near, PAPER_FILL, 1);
  pen.hair(closed(near), 0.55, t.ink, FAR * 1.05);
}

/** A glossy ibis flying: a dark silhouette, neck stretched out to the long down-curved bill. */
export function ibis(t: Draw, x: number, y: number, s: number, f: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, y + dy * s);
  const dark = FAR * 0.95;
  pen.hair([P(-3, 0.4), P(-9.5, 0.9)], 0.45, t.ink, dark);
  pen.fill(wing((dx, dy) => P(dx + 1, dy - 0.3), f * 0.8, 8, 0.4), t.ink, dark * 0.75);
  pen.fill(oval(x, y, 3.8 * s, 1.2 * s, 12), t.ink, dark);
  pen.hair([P(3, -0.2), P(7, -0.6)], 0.9 * s, t.ink, dark);
  pen.hair(bezier(P(7, -0.6), P(9.4, -0.4), P(10.6, 1.6), 5), 0.5, t.ink, dark);
  pen.fill(wing(P, f, 9, 0.6), t.ink, dark);
}

/**
 * A brahminy kite soaring, side-on: long, broad chestnut wings held up in a
 * shallow V with dark fingered tips, a white head and breast, a hooked
 * yellow bill and a rounded chestnut tail. `f` (-1..1) flexes the wings.
 */
export function kite(t: Draw, x: number, y: number, s: number, f = 0, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, y + dy * s);
  // Wings raised a little whatever the beat: it soars more than it flaps.
  const lift = 0.4 + f * 0.3;
  const tipOf = (w: Pt[]): Pt[] => w.slice(Math.floor(w.length * 0.38), Math.ceil(w.length * 0.62));
  const far = wing((dx, dy) => P(dx + 1.5, dy - 0.5), lift * 0.85, 17, 1.4);
  pen.fill(far, PAPER_FILL, 1);
  pen.fill(far, KITE, 0.5);
  pen.fill(tipOf(far), t.ink, FAR * 0.55);
  pen.hair(closed(far), 0.4, t.ink, FAR * 0.7);
  const tail = [P(-3.5, -0.4), ...bezier(P(-8, -1.2), P(-10.5, 0.3), P(-8, 1.9), 6), P(-3.5, 1)];
  pen.fill(tail, PAPER_FILL, 1);
  pen.fill(tail, KITE, 0.65);
  pen.hair(closed(tail), 0.4, t.ink, FAR * 0.8);
  const body = oval(x, y, 4.2 * s, 1.6 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, KITE, 0.6);
  // The white head and breast, then the hooked bill.
  const front = oval(x + 2.8 * s * dir, y - 0.4 * s, 2.3 * s, 1.5 * s, 12);
  pen.fill(front, PAPER_FILL, 1);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  pen.hair(closed(front).slice(0, 8), 0.4, t.ink, FAR * 0.8);
  pen.dot(x + 3.6 * s * dir, y - 0.9 * s, 0.35 * s, t.ink, FAR);
  pen.hair(bezier(P(4.9, -0.6), P(5.9, -0.6), P(5.7, 0.4), 4), 0.6, BILL, 0.95);
  const near = wing(P, lift, 19, 1.8);
  pen.fill(near, PAPER_FILL, 1);
  pen.fill(near, KITE, 0.62);
  pen.fill(tipOf(near), t.ink, FAR * 0.75);
  pen.hair(closed(near), 0.55, t.ink, FAR * 1.05);
  // The fingered tip: a few primaries splayed out.
  const tip = near[Math.floor(near.length / 2)]!;
  for (const k of [-1, 0, 1]) pen.hair([tip, pt(tip.x - (1.4 + k * 0.4) * s * dir, tip.y - (0.6 - k * 0.9) * s)], 0.4, t.ink, FAR * 0.8);
}

/** A little egret standing in the shallows, neck in an S, watching the water; rings spread round its legs. */
export function egret(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1, wade = false): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  for (const dx of [-0.6, 0.6]) pen.hair([P(dx, 0), P(dx * 0.5, -6.5)], 0.5, t.ink, FAR * 1.1);
  const body = [P(-6, -8), ...cub(P(-6, -8), P(-2, -11.5), P(2.5, -11), P(3, -8.6), 8).slice(1), ...cub(P(3, -8.6), P(2.6, -6.6), P(-1, -6), P(-6, -8), 6).slice(1)];
  pen.fill(body, PAPER_FILL, 1);
  pen.stroke(closed(body), 0.5, t.ink, FAR, false);
  const neck = ribbon(cub(P(2.2, -9.8), P(5.5, -12.5), P(1.2, -15), P(3.6, -18), 10), () => 1.3 * s);
  pen.fill(neck.shape, PAPER_FILL, 1);
  pen.hair(neck.top, 0.4, t.ink, FAR * 0.8);
  pen.hair(neck.bot, 0.4, t.ink, FAR * 0.8);
  const head = oval(x + 4 * s * dir, ground - 18.4 * s, 1.3 * s, 1.1 * s, 10);
  pen.fill(head, PAPER_FILL, 1);
  pen.hair(closed(head), 0.4, t.ink, FAR);
  pen.hair([P(5, -18.5), P(8.6, -17.8)], 0.7, t.ink, FAR * 1.1);
  if (wade) for (const r of [3, 5.5]) pen.hair(oval(x, ground + 0.3, r * s, r * 0.25 * s, 16).slice(0, 9), 0.4, t.ink, FAR * 0.4);
}

/** A grey heron hunched on the mud: grey back, dark flight feathers, a black stripe to the crest, a dagger bill. */
export function heron(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  for (const dx of [-0.9, 0.9]) pen.hair([P(dx, 0), P(dx * 0.5, -8.5)], 0.7, '#a08a55', 0.9);
  const body = [P(-7, -10), ...cub(P(-7, -10), P(-3, -16.5), P(2.5, -16.5), P(3.6, -12.5), 10).slice(1), ...cub(P(3.6, -12.5), P(4, -9.5), P(-0.5, -7.6), P(-7, -10), 8).slice(1)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, HERON, 0.65);
  pen.fill([P(-7, -10), P(-3, -12), P(1, -10.8), P(-1, -9)], '#4a5058', 0.55);
  pen.stroke(closed(body), 0.6, t.ink, FAR * 1.05, false);
  for (let k = 0; k < 3; k++) pen.hair([P(3 - k * 0.5, -12 + k * 1.2), P(2.6 - k * 0.5, -11 + k * 1.2)], 0.4, t.ink, FAR * 0.8);
  const neck = ribbon(cub(P(2.4, -14.5), P(4.6, -15.5), P(3, -17.5), P(4.6, -19), 6), () => 1.8 * s);
  pen.fill(neck.shape, PAPER_FILL, 1);
  pen.hair(neck.bot, 0.45, t.ink, FAR);
  const head = oval(x + 4.8 * s * dir, ground - 19.4 * s, 1.6 * s, 1.3 * s, 12);
  pen.fill(head, PAPER_FILL, 1);
  pen.hair(closed(head), 0.45, t.ink, FAR);
  pen.hair([P(5, -19.6), P(1.6, -20.4)], 0.7, t.ink, FAR * 1.2);
  pen.fill([P(6.2, -19.8), P(10.6, -19), P(6.2, -18.9)], BILL, 0.95);
  pen.hair([P(6.2, -19.8), P(10.6, -19)], 0.35, t.ink, FAR);
}

/** A crab's burrow: a dark hole with the little balls of sifted mud scattered round its mouth. */
export function burrow(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  pen.fill(oval(x, y, 1.6 * s, 0.7 * s, 10), t.ink, FAR * 0.7);
  pen.hair(oval(x, y, 1.6 * s, 0.7 * s, 10).slice(0, 6), 0.4, PAPER_FILL, 0.5);
  const n = 4 + Math.floor(pen.rng() * 6);
  for (let k = 0; k < n; k++) {
    const a = pen.rng() * Math.PI * 2;
    const r = (2.8 + pen.rng() * 3) * s;
    const bx = x + Math.cos(a) * r;
    const by = y + Math.sin(a) * r * 0.4;
    pen.dot(bx, by, (0.45 + pen.rng() * 0.3) * s, MUD_BALL, 0.6);
    pen.dot(bx - 0.2, by - 0.25, 0.2, PAPER_FILL, 0.6);
  }
}

/** A fallen mangrove leaf lying flat on the mud, gone yellow or orange. */
export function leaf(t: Draw, x: number, y: number, s: number, rot: number, color: string): void {
  const { pen } = t;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const shape = oval(0, 0, 2.6 * s, 1 * s, 12).map((p) => pt(x + p.x * c - p.y * sn, y + (p.x * sn + p.y * c) * 0.5));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, color, 0.7);
  pen.hair([pt(x - 2.4 * s * c, y - 1.2 * s * sn), pt(x + 2.4 * s * c, y + 1.2 * s * sn)], 0.3, t.ink, FAR * 0.6);
  pen.hair(closed(shape), 0.3, t.ink, FAR * 0.6);
}

/** A heron's tracks across the mud: three long toes forward and one back, in a wandering line. */
export function tracks(t: Draw, x0: number, x1: number, y: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0, k = 0; x < x1; x += 9, k++) {
    const cy = y(x) + (k % 2) * 2.4;
    for (const dy of [-0.9, 0, 0.9]) pen.hair([pt(x, cy), pt(x + 2.6, cy + dy)], 0.4, t.ink, FAR * 0.5);
    pen.hair([pt(x, cy), pt(x - 1.3, cy)], 0.4, t.ink, FAR * 0.5);
  }
}

/** A puddle left by the tide, holding the pale sky in it. */
export function puddle(t: Draw, x: number, y: number, rx: number, ry: number, sky: string): void {
  const { pen } = t;
  const shape = oval(x, y, rx, ry, 20).map((p) => pt(p.x + pen.jitter(rx * 0.05), p.y));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, sky, 0.5);
  pen.clipped(shape, () => {
    for (let k = 0; k < rx / 4; k++) {
      const yy = y - ry * 0.6 + pen.rng() * ry * 1.2;
      const xx = x - rx + pen.rng() * rx * 1.6;
      pen.hair([pt(xx, yy), pt(xx + 3 + pen.rng() * rx * 0.3, yy)], 0.6, PAPER_FILL, 0.85);
    }
  });
  pen.hair(shape.slice(0, 11), 0.45, t.ink, FAR * 0.5);
  pen.hair(shape.slice(10, 21), 0.35, t.ink, FAR * 0.25);
}

/** A collared kingfisher perched and watching the mud: turquoise back, white collar and breast, a heavy bill. */
export function kingfisher(t: Draw, x: number, perch: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, perch + dy * s);
  const body = [P(-1.6, -0.2), ...cub(P(-1.6, -0.2), P(-2.6, -3.8), P(-0.6, -6.2), P(1.4, -5.6), 8).slice(1), ...cub(P(1.4, -5.6), P(2.4, -3.6), P(1.6, -0.8), P(-1.6, -0.2), 6).slice(1)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill([P(-1.6, -0.2), P(-2.4, -3.6), P(-1, -5.8), P(0.2, -3), P(-0.6, -0.4)], '#3f9ab0', 0.8);
  pen.hair(closed(body), 0.45, t.ink, FAR);
  pen.hair([P(-1.6, -0.6), P(-3.8, 2.6)], 1, '#3f9ab0', 0.8);
  const head = oval(x + 0.6 * s * dir, perch - 6.6 * s, 1.7 * s, 1.5 * s, 12);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(oval(x + 0.3 * s * dir, perch - 7.2 * s, 1.6 * s, 1 * s, 10), '#3f9ab0', 0.8);
  pen.hair(closed(head), 0.4, t.ink, FAR);
  pen.fill([P(2, -7), P(5, -6.4), P(2, -5.9)], t.ink, FAR * 0.9);
  pen.dot(x + 1.2 * s * dir, perch - 6.9 * s, 0.35 * s, t.ink, 0.9);
}
