import { bezier, closed, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Birds of the Labrador coast in spring, side-on and facing right (the way
 * they fly): common eiders, drakes and ducks, beating fast in a low line
 * over the sea; black-legged kittiwakes, buoyant, their wingtips dipped in
 * ink; and ravens playing on the wind, rolling over onto their backs.
 * Each takes a wingbeat `f` (-1..1).
 */
const EIDER_BLACK = '#24262b';
const EIDER_NAPE = '#b9d39a';
const EIDER_HEN = '#8a6a48';
const EIDER_BAR = '#4f3a28';
const KITTI_MANTLE = '#a9b4c0';
const BILL = '#e3c23c';
const RAVEN = '#1f2026';

/** One wing side-on from the shoulder, swept back; `lift` (-1..1) raises it; `crook` bends it at the wrist. */
function wing(P: (dx: number, dy: number) => Pt, lift: number, span: number, broad: number, crook: number): Pt[] {
  const wy = -0.5 - 5 * lift;
  const ty = -0.5 - (5 + 2 * crook) * lift - crook * 0.8;
  const wrist = P(-span * 0.25 + crook * 1.5, wy);
  const lead = [...bezier(P(1, -0.4), P(1, wy * 0.6), wrist, 5), ...bezier(wrist, P(-span * 0.55, wy + (ty - wy) * 0.2 - crook), P(-span, ty), 7).slice(1)];
  const trail = cub(P(-span, ty), P(-span * 0.6, ty * 0.55 + broad), P(-span * 0.3, wy * 0.4 + broad), P(-3.5, 0.5), 8);
  return [...lead, ...trail.slice(1)];
}

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A common eider in flight: a heavy sea duck, short-necked, its long
 * wedge of a head running straight into the bill, short wings beating
 * fast. The drake (`drake`) is white above and black below, black-capped
 * with a pale green nape, his wings white at the shoulder and black behind;
 * the duck is warm brown, barred dark all over.
 */
export function eider(t: Draw, x: number, y: number, s: number, f: number, drake = true): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const back = drake ? PAPER_FILL : EIDER_HEN;
  const far = wing((dx, dy) => P(dx + 1, dy - 0.4), f * 0.85, 8, 1.4, 0.2);
  pen.fill(far, drake ? EIDER_BLACK : EIDER_BAR, FAR * 1.1);
  const body = [...cub(P(-6, 0), P(-4, -2.4), P(2, -2.6), P(4.5, -1.6), 10), ...cub(P(4.5, -1.6), P(5, 0.6), P(1, 2), P(-4, 1.4), 8).slice(1)];
  washed(t, body, back, drake ? 0.3 : 0.6, 0.4, 0.8);
  if (drake) pen.clipped(body, () => pen.fill([P(-7, 0.2), P(6, 0.2), P(6, 3), P(-7, 3)], EIDER_BLACK, 0.8));
  else pen.clipped(body, () => pen.hatch(body, 0.9, 1.2, 0.3, { color: EIDER_BAR, alpha: 0.6 }));
  // The wedge-shaped head and bill in one long slope.
  const head = [P(3.8, -2), P(6.4, -2.6), P(7.6, -1.6), P(10, -0.6), P(9.8, 0), P(6.8, 0.2), P(4.2, 0.6)];
  washed(t, head, back, drake ? 0.25 : 0.65, 0.4, 0.8);
  if (drake) {
    pen.fill([P(4.6, -2.2), P(6.6, -2.7), P(7.8, -1.7), P(5.6, -1.4)], EIDER_BLACK, 0.85);
    pen.fill(oval(x + 4.9 * s, y - 0.4 * s, 1 * s, 0.8 * s, 8), EIDER_NAPE, 0.75);
  }
  pen.fill([P(7.8, -1.2), P(10, -0.6), P(9.8, 0), P(7.6, -0.2)], drake ? '#c9cf8a' : '#5a5a52', 0.85);
  pen.dot(x + 6.8 * s, y - 1.3 * s, 0.3 * s, drake ? PAPER_FILL : '#1f1f22', 0.9);
  const near = wing(P, f, 9, 1.6, 0.2);
  if (drake) {
    pen.fill(near, EIDER_BLACK, FAR * 1.5);
    // White coverts along the forewing.
    pen.fill(near.slice(0, 8).concat(near.slice(0, 8).reverse().map((p) => pt(p.x + 0.6 * s, p.y + 1.6 * s))), PAPER_FILL, 0.95);
  } else {
    washed(t, near, EIDER_HEN, 0.7, 0.35, 0.8);
  }
  pen.hair(closed(near), 0.3, t.ink, FAR * 0.7);
}

/**
 * A black-legged kittiwake on the wind: a small, gentle gull, white with a
 * soft grey mantle, long narrow wings ending in neat black tips with no
 * white in them, a plain yellow bill, a dark eye, short black legs tucked.
 */
export function kittiwake(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1.2, dy - 0.4), f * 0.85, 11, 0.8, 0.7);
  washed(t, far, KITTI_MANTLE, 0.5, 0.35, 0.6);
  pen.fill(far.slice(9, 14), t.ink, FAR * 1.1);
  const tail = [P(-3.6, -0.6), P(-7.2, -0.4), P(-7.4, 0.8), P(-3.6, 0.9)];
  washed(t, tail, PAPER_FILL, 0.6, 0.35);
  pen.hair([P(-4.4, 1), P(-6, 1.3)], 0.5 * s, '#1f1f22', 0.7);
  const body = oval(x, y, 4.2 * s, 1.5 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  const head = oval(x + 4.4 * s, y - 0.8 * s, 1.6 * s, 1.35 * s, 10);
  pen.fill(head, PAPER_FILL, 1);
  pen.hair(closed(head).slice(7, 11), 0.4, t.ink, FAR * 0.8);
  pen.dot(x + 4.9 * s, y - 1.1 * s, 0.35 * s, '#1f1f22', 0.9);
  pen.fill([P(5.8, -1.1), P(7.8, -0.8), P(5.8, -0.3)], BILL, 0.95);
  const near = wing(P, f, 12, 0.9, 0.7);
  washed(t, near, KITTI_MANTLE, 0.55, 0.45);
  pen.fill(near.slice(9, 14), t.ink, FAR * 1.4);
  pen.hair(near.slice(14).map((p) => pt(p.x, p.y - 0.4)), 0.5, PAPER_FILL, 0.8);
}

/**
 * A raven on the wind: big and all black with a purple sheen, a heavy
 * arched bill, a shaggy throat, long fingered wings and a wedge-shaped
 * tail. `roll` (1 upright, -1 on its back) turns it over about its length
 * as ravens tumble for the fun of it.
 */
export function raven(t: Draw, x: number, y: number, s: number, f: number, roll = 1): void {
  const { pen } = t;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, Math.abs(roll) < 0.15 ? Math.sign(roll || 1) * 0.15 : roll);
  ctx.translate(-x, -y);
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1, dy - 0.4), f * 0.85, 12, 2, 0.5);
  pen.fill(far, RAVEN, FAR * 1.1);
  fingers(t, far, s, FAR * 0.9);
  // The wedge tail, longest in the middle.
  pen.fill([P(-4, -0.9), P(-8.6, -1.6), P(-10.6, 0.2), P(-8.6, 2), P(-4, 1.1)], RAVEN, FAR * 1.4);
  const body = oval(x, y, 4.6 * s, 1.8 * s, 14);
  pen.fill(body, RAVEN, FAR * 1.6);
  pen.hair(bezier(P(-2, -1.4), P(1, -1.9), P(3.5, -1.3), 5), 0.4, '#7a6fa0', 0.5);
  // Shaggy throat hackles and the great bill.
  for (const k of [0, 1, 2]) pen.hair([P(4.2 + k * 0.5, 0.6), P(3.8 + k * 0.5, 1.8)], 0.4, RAVEN, 0.7);
  pen.fill(oval(x + 5 * s, y - 0.7 * s, 1.8 * s, 1.5 * s, 10), RAVEN, FAR * 1.7);
  pen.fill([P(6.2, -1.6), P(9.4, -0.6), P(6.6, 0.2)], RAVEN, FAR * 1.8);
  pen.dot(x + 5.6 * s, y - 1.2 * s, 0.3 * s, PAPER_FILL, 0.6);
  const near = wing(P, f, 13, 2.3, 0.5);
  pen.fill(near, RAVEN, FAR * 1.6);
  pen.hair(closed(near), 0.35, t.ink, FAR * 0.8);
  fingers(t, near, s, FAR * 1.5);
  ctx.restore();
}

/** Splayed primaries at a wing's tip: a few long dark fingers. */
function fingers(t: Draw, w: readonly Pt[], s: number, alpha: number): void {
  const tip = w[Math.floor(w.length * 0.42)]!;
  for (const k of [-1.5, -0.5, 0.5, 1.5]) t.pen.hair([tip, pt(tip.x - (2 + k * 0.3) * s, tip.y + (k * 1.1 - 0.2) * s)], 0.45, RAVEN, alpha);
}
