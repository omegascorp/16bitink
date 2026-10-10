import { bezier, closed, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Seabirds of a cold Pacific coast, always drawn side-on and facing right
 * (the way they fly): western gulls and double-crested cormorants. (Brown
 * pelicans are the Galápagos ones: the same bird.) Each takes a wingbeat
 * `f` (-1..1).
 */
const GULL_MANTLE = '#8f98a3';
const BILL = '#e3b23c';
const CORMORANT = '#2f3133';
const THROAT = '#d98b3a';

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
 * A western gull flying: a white head and body, a dark slate mantle and
 * long crooked wings with black tips and a white trailing edge, a stout
 * yellow bill, pink feet tucked under the tail.
 */
export function westernGull(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1.2, dy - 0.4), f * 0.85, 11, 1, 0.6);
  washed(t, far, GULL_MANTLE, 0.55, 0.4, 0.7);
  pen.fill(far.slice(9, 14), t.ink, FAR * 0.7);
  const tail = [P(-4, -0.8), P(-8.4, -0.5), P(-8.6, 0.8), P(-4, 1)];
  washed(t, tail, PAPER_FILL, 0.6, 0.4);
  pen.fill(oval(x - 4.8 * s, y + 1.2 * s, 1.2 * s, 0.5 * s, 8), '#e2a3a0', 0.8);
  const body = oval(x, y, 4.8 * s, 1.7 * s, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.hair(closed(body).slice(2, 12), 0.4, t.ink, FAR * 0.8);
  pen.fill(body.filter((p) => p.y < y - 0.6 * s), GULL_MANTLE, 0.5);
  const head = oval(x + 4.9 * s, y - 0.9 * s, 1.7 * s, 1.4 * s, 10);
  pen.fill(head, PAPER_FILL, 1);
  pen.hair(closed(head).slice(7, 11), 0.4, t.ink, FAR * 0.8);
  pen.dot(x + 5.4 * s, y - 1.2 * s, 0.35 * s, t.ink, FAR * 1.1);
  pen.fill([P(6.4, -1.3), P(9, -0.8), P(8.8, -0.2), P(6.4, -0.3)], BILL, 0.9);
  pen.dot(x + 8.4 * s, y - 0.4 * s, 0.25 * s, '#c4423a', 0.9);
  const near = wing(P, f, 12, 1.2, 0.6);
  washed(t, near, GULL_MANTLE, 0.6, 0.5);
  pen.fill(near.slice(9, 14), t.ink, FAR * 0.85);
  pen.hair(near.slice(13).map((p) => pt(p.x, p.y - 0.4)), 0.5, PAPER_FILL, 0.8);
}

/**
 * A cormorant flying low and straight: black, a long neck stretched out
 * ahead with a kink in it, a hooked bill and an orange throat patch,
 * narrow wings beating fast, a long tail.
 */
export function cormorant(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const dark = FAR * 1.1;
  pen.fill(wing((dx, dy) => P(dx + 1, dy - 0.3), f * 0.9, 9, 0.8, 0.2), CORMORANT, dark * 0.6);
  pen.fill([P(-3.5, -0.6), P(-9.5, -0.3), P(-9.5, 0.8), P(-3.5, 1)], CORMORANT, dark * 0.9);
  pen.fill(oval(x, y, 4.4 * s, 1.5 * s, 14), CORMORANT, dark);
  const neck = cub(P(3.5, -0.6), P(6, -0.9), P(7.5, -0.4), P(10, -1.1), 8);
  pen.stroke(neck, 1.3 * s, CORMORANT, dark, false);
  pen.fill(oval(x + 10.4 * s, y - 1.2 * s, 1.3 * s, 1 * s, 10), CORMORANT, dark);
  pen.fill(oval(x + 10.6 * s, y - 0.5 * s, 0.8 * s, 0.5 * s, 8), THROAT, 0.85);
  pen.stroke([P(11.4, -1.4), P(13.6, -1.1), P(13.8, -0.6)], 0.4 * s, t.ink, dark, false);
  pen.dot(x + 10.7 * s, y - 1.5 * s, 0.25 * s, '#5fb39a', 0.9);
  pen.fill(wing(P, f, 10, 0.9, 0.2), CORMORANT, dark * 0.95);
}
