import { bezier, closed, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Birds over a Kerala harbour, side-on and facing right (the way they
 * fly): house crows flapping across with their grey shawls, and little
 * cormorants beating fast and low over the water. (The brahminy kites and
 * the egrets are the mangrove's: the same birds.) Each takes a wingbeat
 * `f` (-1..1).
 */
const CROW = '#2b2d33';
const SHAWL = '#7d8088';
const CORMORANT = '#25272b';

/** One wing side-on from the shoulder, swept back; `lift` (-1..1) raises it; `crook` bends it at the wrist. */
function wing(P: (dx: number, dy: number) => Pt, lift: number, span: number, broad: number, crook: number): Pt[] {
  const wy = -0.5 - 5 * lift;
  const ty = -0.5 - (5 + 2 * crook) * lift - crook * 0.8;
  const wrist = P(-span * 0.25 + crook * 1.5, wy);
  const lead = [...bezier(P(1, -0.4), P(1, wy * 0.6), wrist, 5), ...bezier(wrist, P(-span * 0.55, wy + (ty - wy) * 0.2 - crook), P(-span, ty), 7).slice(1)];
  const trail = cub(P(-span, ty), P(-span * 0.6, ty * 0.55 + broad), P(-span * 0.3, wy * 0.4 + broad), P(-3.5, 0.5), 8);
  return [...lead, ...trail.slice(1)];
}

/** Splayed primaries at a wing's tip: a few short dark fingers. */
function fingers(t: Draw, w: readonly Pt[], s: number, alpha: number): void {
  const tip = w[Math.floor(w.length * 0.42)]!;
  for (const k of [-1, 0, 1]) t.pen.hair([tip, pt(tip.x - (1.5 + k * 0.3) * s, tip.y + (k * 1.1 - 0.2) * s)], 0.4, CROW, alpha);
}

/**
 * A house crow flying: glossy black with a dusky grey shawl over the nape
 * and breast, a stout black bill, broad rounded wings fingered at the
 * tips and a squarish tail.
 */
export function houseCrow(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const far = wing((dx, dy) => P(dx + 1, dy - 0.4), f * 0.85, 9, 1.6, 0.4);
  pen.fill(far, CROW, FAR * 1.1);
  fingers(t, far, s, FAR);
  pen.fill([P(-3.5, -0.8), P(-8.2, -1), P(-8.4, 1.1), P(-3.5, 1)], CROW, FAR * 1.4);
  const body = oval(x, y, 4 * s, 1.6 * s, 14);
  pen.fill(body, CROW, FAR * 1.5);
  const shawl = oval(x + 2.6 * s, y - 0.3 * s, 2.2 * s, 1.5 * s, 12);
  pen.fill(shawl, PAPER_FILL, 0.6);
  pen.fill(shawl, SHAWL, 0.75);
  const head = oval(x + 4.4 * s, y - 0.8 * s, 1.5 * s, 1.3 * s, 10);
  pen.fill(head, CROW, FAR * 1.6);
  pen.fill([P(5.6, -1.4), P(8, -0.8), P(5.8, -0.1)], CROW, FAR * 1.7);
  pen.dot(x + 4.7 * s, y - 1.1 * s, 0.3 * s, PAPER_FILL, 0.7);
  const near = wing(P, f, 10, 1.9, 0.4);
  pen.fill(near, CROW, FAR * 1.5);
  pen.hair(closed(near), 0.35, t.ink, FAR * 0.8);
  fingers(t, near, s, FAR * 1.4);
}

/**
 * A little cormorant beating low over the water: all black, small and
 * slim, its neck stretched straight out to a short hooked bill, narrow
 * wings, a long stiff tail.
 */
export function littleCormorant(t: Draw, x: number, y: number, s: number, f: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const dark = FAR * 1.2;
  pen.fill(wing((dx, dy) => P(dx + 1, dy - 0.3), f * 0.9, 8, 0.7, 0.2), CORMORANT, dark * 0.6);
  pen.fill([P(-3.5, -0.5), P(-9, -0.3), P(-9, 0.7), P(-3.5, 0.9)], CORMORANT, dark * 0.9);
  pen.fill(oval(x, y, 4 * s, 1.3 * s, 14), CORMORANT, dark);
  pen.stroke(cub(P(3.2, -0.5), P(5.5, -0.8), P(7, -0.7), P(9, -1), 8), 1.1 * s, CORMORANT, dark, false);
  pen.fill(oval(x + 9.3 * s, y - 1.1 * s, 1.1 * s, 0.9 * s, 10), CORMORANT, dark);
  pen.stroke([P(10.2, -1.2), P(12, -1), P(12.1, -0.6)], 0.35 * s, CORMORANT, dark, false);
  pen.hair(edges(oval(x + 9.3 * s, y - 1.6 * s, 0.3 * s, 0.2 * s, 6)), 0.3, PAPER_FILL, 0.6);
  pen.fill(wing(P, f, 9, 0.8, 0.2), CORMORANT, dark * 0.95);
}
