import { bezier, closed, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';

/**
 * The animals of a Gulf coast backdrop, always drawn side-on and facing
 * right (the way they go): laughing gulls and an osprey on the wind, a
 * brown pelican resting on a piling, bottlenose dolphins rolling through
 * the swell. (Pelicans flying are the Galápagos ones: the same bird.)
 * Birds take a wingbeat `f` (-1..1).
 */
const LAUGHING_MANTLE = '#5f6670';
const HOOD = '#26272b';
const LAUGHING_BILL = '#8f2f2a';
const OSPREY = '#5c4838';
const OSPREY_TAIL = '#8a7560';
const PELICAN = '#8b8478';
const PELICAN_NAPE = '#6a4a36';
const DOLPHIN = '#7f8c94';
const DOLPHIN_BACK = '#56626b';
const DOLPHIN_BELLY = '#d9ddd8';

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
 * A laughing gull flying: slim, a black hood, a dark slate mantle and long
 * pointed wings dipped in black with a white trailing edge, a drooping
 * dark red bill.
 */
export function laughingGull(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1.2, dy - 0.4), f * 0.85, 11, 0.8, 0.8);
  washed(t, far, LAUGHING_MANTLE, 0.6, 0.4, 0.7);
  pen.fill(far.slice(8, 14), t.ink, FAR * 0.9);
  washed(t, [P(-3.8, -0.7), P(-7.8, -0.5), P(-8, 0.7), P(-3.8, 0.9)], PAPER_FILL, 0.6, 0.4);
  const body = oval(x, y, 4.4 * s, 1.5 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  pen.fill(body.filter((p) => p.y < y - 0.5 * s), LAUGHING_MANTLE, 0.5);
  const head = oval(x + 4.6 * s, y - 0.9 * s, 1.6 * s, 1.3 * s, 10);
  washed(t, head, HOOD, 0.8, 0.35);
  pen.hair([P(4.4, -1.6), P(5, -1.7)], 0.3, PAPER_FILL, 0.9);
  pen.fill([P(6, -1.2), P(8.4, -0.7), P(8.3, 0), P(6, -0.3)], LAUGHING_BILL, 0.85);
  const near = wing(P, f, 12, 1, 0.8);
  washed(t, near, LAUGHING_MANTLE, 0.65, 0.5);
  pen.fill(near.slice(8, 14), t.ink, FAR * 1.1);
  pen.hair(near.slice(14).map((p) => pt(p.x, p.y - 0.4)), 0.5, PAPER_FILL, 0.85);
}

/**
 * An osprey soaring: long, narrow wings crooked at the wrist, dark brown
 * above with darker fingers, white beneath and on the head, a dark stripe
 * through the eye, a short barred tail and a hooked bill.
 */
export function osprey(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1.4, dy - 0.5), f * 0.8, 15, 1.5, 1.2);
  washed(t, far, OSPREY, 0.6, 0.4, 0.7);
  pen.fill(far.slice(9, 14), t.ink, FAR * 0.8);
  const tail = [P(-4.4, -0.9), P(-9.4, -0.6), P(-9.4, 1), P(-4.4, 1.2)];
  washed(t, tail, OSPREY_TAIL, 0.55, 0.4);
  for (const dx of [-6, -7.6]) pen.hair([P(dx, -0.7), P(dx, 1)], 0.3, t.ink, FAR * 0.7);
  const body = [P(-5, 0.2), ...cub(P(-5, 0.2), P(-3, -2.2), P(2, -2.4), P(4.4, -1.4), 8).slice(1), ...cub(P(4.4, -1.4), P(3.6, 1.2), P(-1, 2), P(-5, 0.2), 8).slice(1)];
  washed(t, body, PAPER_FILL, 0.5, 0.45);
  pen.clipped(body, () => pen.fill(body.map((p) => pt(p.x, p.y - 1.2 * s)), OSPREY, 0.55));
  const head = oval(x + 5 * s, y - 1.1 * s, 1.7 * s, 1.4 * s, 10);
  washed(t, head, PAPER_FILL, 0.5, 0.4);
  pen.hair([P(3.6, -1), P(5.4, -1.2), P(6.2, -1.4)], 0.6 * s, OSPREY, 0.85);
  pen.fill([P(6.4, -1.5), P(7.8, -1.2), P(7.7, -0.3), P(7, -0.6), P(6.4, -0.6)], '#2f2a26', 0.85);
  const near = wing(P, f, 16, 1.7, 1.2);
  washed(t, near, OSPREY, 0.68, 0.5);
  pen.fill(near.slice(9, 14), t.ink, FAR * 1);
  pen.hair(near.slice(1, 6).map((p) => pt(p.x, p.y + 0.5)), 0.5, PAPER_FILL, 0.7);
}

/**
 * A brown pelican resting on a piling top (`perch`): hunched, wings
 * folded, its head drawn back on the neck and the long bill laid down
 * the front of it; white head, a chestnut stripe down the back of the neck.
 */
export function perchedPelican(t: Draw, x: number, perch: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, perch + dy * s);
  for (const dx of [-0.8, 1]) pen.hair([P(dx, -2.6), P(dx + 0.4, 0), P(dx + 1.6, 0.2)], 0.6, '#3f3a34', 0.85);
  washed(t, [P(-4.8, -4.2), P(-9, -1.4), P(-8.4, -0.6), P(-4, -2.6)], '#5f5a52', 0.6, 0.4);
  const body = [...cub(P(-6, -3), P(-6.4, -9), P(0, -11.2), P(3.6, -8), 10), ...cub(P(3.6, -8), P(4.6, -4.4), P(1.8, -1.8), P(-1.4, -2), 8).slice(1), P(-6, -3)];
  washed(t, body, PELICAN, 0.6, 0.55);
  pen.clipped(body, () => {
    const wingFold = cub(P(-6.4, -4), P(-4, -9.2), P(1, -9), P(2.4, -5.4), 8);
    pen.fill([...wingFold, P(-6.4, -2)], '#6c665c', 0.45);
    for (let k = 0; k < 4; k++) pen.hair([P(-4.4 + k * 1.6, -7.6 + k * 0.4), P(-6 + k * 1.6, -3.6)], 0.3, PAPER_FILL, 0.6);
    pen.crescent(body, pt(-1.4 * s * dir, -1.4 * s), () => pen.hatch(body, 1.3, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.4 }));
  });
  const neck = [P(1.2, -9.4), ...bezier(P(1.2, -9.4), P(0.6, -12), P(2, -14), 5).slice(1), P(4.2, -13.6), ...bezier(P(4.2, -13.6), P(3.2, -11.6), P(3.8, -8.6), 5).slice(1)];
  washed(t, neck, PAPER_FILL, 0.6, 0.45);
  pen.fill([P(1.2, -9.4), P(0.8, -12.2), P(1.8, -12.6), P(2.2, -9.6)], PELICAN_NAPE, 0.7);
  const head = oval(x + 3 * s * dir, perch - 14.4 * s, 1.9 * s, 1.5 * s, 10);
  washed(t, head, '#f1e6c2', 0.7, 0.45);
  pen.dot(x + 3.6 * s * dir, perch - 14.7 * s, 0.35 * s, t.ink, FAR * 1.2);
  const bill = [P(4.4, -14.8), P(5.6, -14.2), P(6.2, -6.4), P(5.4, -5.6), P(4.6, -7.2)];
  washed(t, bill, '#b9a07a', 0.7, 0.4);
  pen.fill([P(4.6, -13), P(4.6, -7.4), P(5.2, -6.4), P(5.2, -12.4)], '#6e6458', 0.4);
}

/**
 * A bottlenose dolphin rolling up through the surface and down again, the
 * whole body arched on a circle round a point under the water: `u` (0..1)
 * carries it through one roll; only what's above `water` shows, with a
 * splash where it breaks the surface and rings on the water.
 */
export function dolphin(t: Draw, x: number, water: number, s: number, u: number): void {
  const { pen } = t;
  const R = 13 * s;
  const sink = 0.5;
  const a = Math.asin(sink);
  const cy = water + R * sink;
  const L = 1.3;
  const at = (th: number, r: number): Pt => pt(x + Math.cos(th) * r, cy + Math.sin(th) * r);
  const rise = at(-Math.PI + a, R);
  const dive = at(-a, R);
  for (const p of [rise, dive]) pen.hair(oval(p.x, water + 0.5 * s, 5 * s, 0.8 * s, 16).slice(0, 9), 0.4, PAPER_FILL, 0.6);
  if (u <= 0 || u >= 1) return;
  const head = -Math.PI + a + u * (Math.PI - 2 * a + L);
  const half = (k: number): number => s * (k < 0.3 ? 0.9 + 1.4 * (k / 0.3) ** 0.6 : 0.5 + 1.8 * (1 - (k - 0.3) / 0.7) ** 0.9);
  const ks = Array.from({ length: 17 }, (_, i) => i / 16);
  const outer = ks.map((k) => at(head - k * L, R + half(k)));
  const inner = ks.map((k) => at(head - k * L, R - half(k) * 0.9));
  const th1 = head - L;
  const tail = at(th1, R);
  const back = pt(Math.sin(th1), -Math.cos(th1));
  const flukes = [at(th1 + 0.04, R + 0.6 * s), pt(tail.x + back.x * 3.4 * s + Math.cos(th1) * 1.8 * s, tail.y + back.y * 3.4 * s + Math.sin(th1) * 1.8 * s), pt(tail.x + back.x * 2.6 * s, tail.y + back.y * 2.6 * s), pt(tail.x + back.x * 3.4 * s - Math.cos(th1) * 1.8 * s, tail.y + back.y * 3.4 * s - Math.sin(th1) * 1.8 * s), at(th1 + 0.04, R - 0.6 * s)];
  const thF = head - 0.45 * L;
  const fin = [at(thF + 0.1, R + half(0.38) - 0.3), at(thF - 0.16, R + half(0.5) + 4.2 * s), at(thF - 0.2, R + half(0.55) - 0.3)];
  const fwd = pt(-Math.sin(head), Math.cos(head));
  const nose = at(head, R - 0.2 * s);
  const beak = [at(head, R + 0.5 * s), pt(nose.x + fwd.x * 2.4 * s, nose.y + fwd.y * 2.4 * s), at(head, R - 0.9 * s)];
  const above = [pt(x - R * 2, water - R * 2), pt(x + R * 2, water - R * 2), pt(x + R * 2, water), pt(x - R * 2, water)];
  pen.clipped(above, () => {
    const body = [...outer, ...[...inner].reverse()];
    for (const shape of [fin, flukes, beak]) washed(t, shape, DOLPHIN_BACK, 0.7, 0.4, 0.9);
    pen.fill(body, PAPER_FILL, 1);
    pen.fill(body, DOLPHIN, 0.62);
    pen.clipped(body, () => {
      pen.fill([...outer, ...[...outer].reverse().map((p, i) => pt(p.x + (inner[16 - i]!.x - p.x) * 0.45, p.y + (inner[16 - i]!.y - p.y) * 0.45))], DOLPHIN_BACK, 0.45);
      pen.fill([...inner, ...[...inner].reverse().map((p, i) => pt(p.x + (outer[16 - i]!.x - p.x) * 0.3, p.y + (outer[16 - i]!.y - p.y) * 0.3))], DOLPHIN_BELLY, 0.7);
    });
    pen.stroke(edges(body, 2), 0.5, t.ink, FAR, false);
    const eye = at(head - 0.12, R + half(0.1) * 0.1);
    pen.dot(eye.x, eye.y, 0.35 * s, t.ink, FAR * 1.2);
    pen.hair(outer.slice(2, 9), 0.4, PAPER_FILL, 0.7);
  });
  // Spray where it breaks the surface: rising at the near end, diving at the far.
  const span = (th: number): boolean => head > th && head - L < th;
  for (const [th, p] of [[-Math.PI + a, rise], [-a, dive]] as const) {
    if (!span(th)) continue;
    glow(t, p.x, water - 1.5 * s, 4 * s, 2.4 * s, '#ffffff', 0.8);
    for (let k = 0; k < 4; k++) pen.hair(bezier(pt(p.x + pen.jitter(3 * s), water), pt(p.x + pen.jitter(2 * s), water - (2 + pen.rng() * 2) * s), pt(p.x + pen.jitter(4 * s), water - pen.rng() * s), 4), 0.6, PAPER_FILL, 0.9);
  }
}
