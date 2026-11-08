import { bezier, closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * Dizzy marks for a stunned boss, seen from above: a ring of little
 * four-pointed stars and a couple of swirls circling round its head on a
 * tilted orbit, in ink. The orbit turns a little with each boil frame.
 */
export function dizzy(d: Draw, c: Pt, rx: number, ry: number): void {
  const { pen } = d;
  const turn = d.f * 0.35;
  const at = (a: number): Pt => pt(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry);
  // The orbit, broken into arcs.
  for (let i = 0; i < 3; i++) {
    const a0 = turn + (i / 3) * TAU + 0.35;
    pen.hair(Array.from({ length: 9 }, (_, k) => at(a0 + (k / 8) * (TAU / 3 - 0.9))), 0.8, d.ink, 0.75);
  }
  // Stars on it.
  for (let i = 0; i < 3; i++) {
    const p = at(turn + (i / 3) * TAU);
    const r = i === 0 ? 5.6 : 4.6;
    const star = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * TAU + 0.2;
      const rr = k % 2 === 0 ? r : r * 0.36;
      return pt(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    });
    pen.fill(star, PAPER_FILL, 0.95);
    pen.stroke(closed(star), 0.85, d.ink, 1, false);
    pen.dot(p.x, p.y, r * 0.16, d.ink, 0.8);
  }
  // Two little swirls between them.
  for (let i = 0; i < 2; i++) {
    const p = at(turn + (i + 0.5) * (TAU / 3) + 0.2);
    const sw = Array.from({ length: 14 }, (_, k) => {
      const a = (k / 13) * TAU * 1.4 + i;
      const r = 0.4 + (k / 13) * 3.2;
      return pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    });
    pen.hair(sw, 0.8, d.ink, 0.95);
  }
  pen.hair(bezier(at(turn - 0.5), at(turn - 0.25), at(turn - 0.05), 4), 0.4, d.ink, 0.4);
}
