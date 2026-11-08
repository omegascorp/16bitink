import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { BADGER as B } from './heathBossHead';

/**
 * What goes round the Badger: the mouth of its sett (a dark hole in a
 * spoil heap of dug soil), clods flying as it digs in or out, scent puffs
 * as it sniffs, fright jolts when struck, a rush of air in the lunge.
 */

export const HOLE = { rx: 17, ry: 12.5 } as const;

/** The spoil heap round a hole at c: soft washes of dug soil, a few pebbles, and the dark mouth. */
export function sett(d: Draw, c: Pt, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  glaze(d, c.x + 2, c.y + 3, HOLE.rx * 1.9, HOLE.ry * 1.9, 0, B.soil, 0.55);
  glaze(d, c.x - 3, c.y - 4, HOLE.rx * 1.3, HOLE.ry * 1.1, 0, B.soilLight, 0.45);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = 1.15 + rng() * 0.6;
    const p = pt(c.x + Math.cos(a) * HOLE.rx * r, c.y + Math.sin(a) * HOLE.ry * r);
    pen.dot(p.x, p.y, 0.6 + rng() * 0.7, rng() < 0.5 ? B.soilDeep : B.soilLight, 0.7);
  }
  const mouth = ellipseAt(c.x, c.y, HOLE.rx, HOLE.ry, 0, 28);
  pen.fill(mouth, B.hole, 0.95);
  pen.clipped(mouth, () => glaze(d, c.x + 5, c.y + 4, HOLE.rx * 0.8, HOLE.ry * 0.7, 0, '#000000', 0.5));
  // The lip of the hole: its near (lit) edge pale, the far edge in shadow.
  pen.stroke(closed(mouth).slice(14, 29), 1.6, B.soilLight, 0.7, false);
  pen.stroke(closed(mouth), 0.7, d.ink, 0.85);
}

/** Clods of soil flung out round c, between radius r0 and r1, in the arc `from`..`to`. */
export function clods(d: Draw, c: Pt, r0: number, r1: number, from: number, to: number, n: number, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  for (let i = 0; i < n; i++) {
    const a = from + rng() * (to - from);
    const r = r0 + rng() * (r1 - r0);
    const p = pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.85);
    const s = 1 + rng() * 1.8;
    const clod = Array.from({ length: 7 }, (_, k) => {
      const q = (k / 7) * Math.PI * 2;
      const rr = s * (0.7 + rng() * 0.5);
      return pt(p.x + Math.cos(q) * rr, p.y + Math.sin(q) * rr);
    });
    pen.fill(clod.map((q) => pt(q.x + 1, q.y + 1.5)), d.ink, 0.15);
    pen.fill(clod, rng() < 0.5 ? B.soil : B.soilDeep, 1);
    pen.dot(p.x - s * 0.3, p.y - s * 0.3, s * 0.35, B.soilLight, 0.7);
    pen.stroke(closed(clod), 0.35, d.ink, 0.8, false);
    if (rng() < 0.5) pen.hair([pt(p.x - Math.cos(a) * s * 1.4, p.y - Math.sin(a) * s * 1.4), pt(p.x - Math.cos(a) * s * 3.6, p.y - Math.sin(a) * s * 3.6)], 0.4, d.ink, 0.45);
  }
}

/** Scent puffs curling off the ground at its nose. */
export function sniffs(d: Draw, nose: Pt, s: number): void {
  for (const [dy, len, a] of [[-3, 6, 0.6], [3, 6, 0.6], [s * 0.5, 9, 0.45]] as const) {
    const p = pt(nose.x + 1.5, nose.y + dy);
    d.pen.hair(bezier(p, pt(p.x + len * 0.5, p.y + dy * 0.8 - 1.6), pt(p.x + len, p.y + dy * 1.25 + 0.8), 6), 0.65, d.ink, a);
  }
}

/** Fright jolts bursting out round the struck badger. */
export function jolts(d: Draw): void {
  for (const [a, r] of [[-2.5, 44], [-1.6, 34], [-0.6, 44], [0.6, 44], [1.6, 34], [2.5, 44]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-3.5, 0, 3.5]) {
      const b = pt(u.x * (r - Math.abs(o) * 0.6) * 1.2 + v.x * o, u.y * (r - Math.abs(o) * 0.6) + v.y * o);
      const len = o === 0 ? 7 : 4.6;
      d.pen.stroke([b, pt(b.x + (u.x + v.x * o * 0.05) * len, b.y + (u.y + v.y * o * 0.05) * len)], 0.9, d.ink, 0.8, false);
    }
  }
}

/** A rush of air streaming back past its flanks in the lunge. */
export function rush(d: Draw): void {
  for (const s of [-1, 1]) {
    for (const [y, x0, len, a] of [[25, -6, 26, 0.55], [21, -30, 22, 0.4], [14, -46, 14, 0.35]] as const) {
      const p = pt(x0, s * y);
      d.pen.hair(bezier(p, pt(p.x - len * 0.5, p.y + s * 0.8), pt(p.x - len, p.y + s * 2), 6), 0.75, d.ink, a);
    }
  }
}
