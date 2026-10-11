import { bezier, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { straight } from './context';

/**
 * The sea's population, as old chart-makers filled their empty water:
 * whales and turtles, a sea serpent, a brig under sail, orcas, a manta,
 * dolphins and an octopus. Each is drawn at (x, y) about `s` times its
 * sketch size, its waterline at y.
 */
const GREY = '#7d8a96';

/** A few ripple lines where something breaks the surface. */
export function ripples(d: Draw, x: number, y: number, w: number, alpha = 0.5): void {
  for (let k = 0; k < 3; k++) d.pen.hair(bezier(pt(x - w * (0.5 + k * 0.18), y + k * 4), pt(x, y + 3 + k * 5), pt(x + w * (0.5 + k * 0.18), y + k * 4), 10), 0.6, d.ink, alpha - k * 0.12);
}

/** Washes, hatches the shadow side of, and outlines a closed shape. */
function body(d: Draw, shape: readonly Pt[], wash: string, alpha = 0.85): void {
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, wash, alpha);
  d.pen.crescent(shape, pt(-4, -5), () => d.pen.hatch(shape, 2, 0.9, 0.45, { color: d.ink, alpha: 0.5 }));
  d.pen.stroke(straight(shape, 2.5), 1.1, d.ink, 0.9, false);
}

/** A sperm whale surfacing, blowing a spout. */
export function whale(d: Draw, x: number, y: number, s: number): void {
  const top = [pt(x - 46 * s, y), ...bezier(pt(x - 46 * s, y), pt(x - 44 * s, y - 22 * s), pt(x - 10 * s, y - 20 * s), 8), ...bezier(pt(x - 10 * s, y - 20 * s), pt(x + 26 * s, y - 16 * s), pt(x + 40 * s, y - 2 * s), 8)];
  const shape = [...top, pt(x + 40 * s, y), pt(x - 46 * s, y)];
  body(d, shape, GREY);
  // Flukes raised behind it.
  const fluke = [pt(x + 38 * s, y - 2 * s), pt(x + 56 * s, y - 20 * s), pt(x + 48 * s, y - 8 * s), pt(x + 66 * s, y - 14 * s), pt(x + 46 * s, y)];
  body(d, fluke, GREY);
  d.pen.dot(x - 34 * s, y - 9 * s, 1.4 * s, d.ink, 0.9);
  d.pen.hair(bezier(pt(x - 44 * s, y - 4 * s), pt(x - 36 * s, y - 2 * s), pt(x - 28 * s, y - 5 * s), 6), 0.7, d.ink, 0.8);
  for (const a of [-0.5, -0.2, 0.1, 0.4]) d.pen.hair(bezier(pt(x - 40 * s, y - 20 * s), pt(x - 40 * s + a * 10 * s, y - 34 * s), pt(x - 40 * s + a * 26 * s, y - 40 * s), 8), 0.7, d.ink, 0.65);
  ripples(d, x, y + 3, 60 * s);
}

/** A sea turtle from above, paddling. */
export function turtle(d: Draw, x: number, y: number, s: number, angle = -0.3, wash = '#7d8a4f'): void {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const P = (dx: number, dy: number): Pt => pt(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  for (const [fx, fy, len] of [[6, -8, 12], [6, 8, 12], [-9, -6, 6], [-9, 6, 6]] as const) {
    const dir = fy > 0 ? 1 : -1;
    const fl = [P(fx, fy * 0.7), P(fx + (len > 8 ? 4 : -4), fy + dir * len), P(fx - 4, fy * 0.9)];
    d.pen.fill(fl, wash, 0.75);
    d.pen.hair(straight(fl, 1.5), 0.6, d.ink, 0.85);
  }
  const head = oval(0, 0, 4, 3, 10).map((p) => P(p.x + 15, p.y));
  d.pen.fill(head, wash, 0.75);
  d.pen.hair([...head, head[0]!], 0.6, d.ink, 0.85);
  const shell = oval(0, 0, 12, 9, 16).map((p) => P(p.x, p.y));
  d.pen.fill(shell, PAPER_FILL, 1);
  d.pen.fill(shell, '#8f7a45', 0.8);
  d.pen.hair([P(-8, 0), P(8, 0)], 0.5, d.ink, 0.7);
  for (const k of [-4, 3]) d.pen.hair([P(k, -7), P(k, 7)], 0.5, d.ink, 0.6);
  d.pen.stroke([...shell, shell[0]!], 0.9, d.ink, 0.9, false);
}

/** The sea serpent: humped coils out of the water, a finned head with its tongue out. */
export function serpent(d: Draw, x: number, y: number, s: number): void {
  const wash = '#6f9a6a';
  for (const [hx, hw, hh] of [[-34, 14, 16], [-4, 15, 20], [26, 12, 14]] as const) {
    const spine = bezier(pt(x + (hx - hw) * s, y), pt(x + hx * s, y - hh * 2 * s), pt(x + (hx + hw) * s, y), 12);
    const coil = ribbon(spine, (u) => (6 - Math.abs(u - 0.5) * 3) * s).shape;
    body(d, coil, wash);
    for (let k = 3; k < 10; k += 2) d.pen.hair([spine[k]!, pt(spine[k]!.x + 2 * s, spine[k]!.y + 3 * s)], 0.5, d.ink, 0.6);
    ripples(d, x + (hx - hw) * s, y + 2, 10 * s, 0.45);
    ripples(d, x + (hx + hw) * s, y + 2, 10 * s, 0.45);
  }
  // The head rearing at the front, finned, its forked tongue out.
  const neck = bezier(pt(x - 54 * s, y), pt(x - 62 * s, y - 30 * s), pt(x - 50 * s, y - 40 * s), 12);
  body(d, ribbon(neck, (u) => (8 - u * 2) * s).shape, wash);
  const head = [pt(x - 54 * s, y - 44 * s), pt(x - 40 * s, y - 46 * s), pt(x - 30 * s, y - 40 * s), pt(x - 40 * s, y - 36 * s), pt(x - 52 * s, y - 36 * s)];
  body(d, head, wash);
  const fin = [pt(x - 52 * s, y - 44 * s), pt(x - 60 * s, y - 56 * s), pt(x - 46 * s, y - 50 * s), pt(x - 44 * s, y - 46 * s)];
  body(d, fin, '#b6c98a');
  d.pen.dot(x - 41 * s, y - 42 * s, 1.3 * s, d.ink, 0.9);
  d.pen.hair([pt(x - 30 * s, y - 40 * s), pt(x - 22 * s, y - 40 * s), pt(x - 19 * s, y - 43 * s)], 0.7, RED, 0.9);
  d.pen.hair([pt(x - 22 * s, y - 40 * s), pt(x - 19 * s, y - 37 * s)], 0.7, RED, 0.9);
  ripples(d, x - 52 * s, y + 2, 14 * s, 0.45);
}

/** A two-masted brig under full sail, flags flying. */
export function brig(d: Draw, x: number, y: number, s: number, dir: 1 | -1 = 1): void {
  const X = (dx: number): number => x + dx * s * dir;
  const hull = [pt(X(-34), y - 12 * s), pt(X(38), y - 12 * s), pt(X(30), y), pt(X(-28), y)];
  body(d, hull, '#8a6a48');
  d.pen.hair([pt(X(-30), y - 7 * s), pt(X(33), y - 7 * s)], 0.6, d.ink, 0.7);
  for (let k = -24; k < 30; k += 8) d.pen.fill(oval(X(k), y - 7 * s, 1.4 * s, 1.2 * s, 6), d.ink, 0.7);
  for (const mx of [-12, 14]) {
    d.pen.stroke([pt(X(mx), y - 12 * s), pt(X(mx), y - 62 * s)], 1.2, d.ink, 0.9, false);
    for (const [sy, sw, sh] of [[-18, 15, 11], [-32, 13, 10], [-45, 10, 9]] as const) {
      const sail = [pt(X(mx - sw), y + (sy - sh) * s), pt(X(mx + sw), y + (sy - sh) * s), pt(X(mx + sw + 2), y + sy * s), pt(X(mx - sw + 2), y + sy * s)];
      const belly = [...bezier(sail[3]!, pt(X(mx + 2), y + (sy + 3) * s), sail[2]!, 8)];
      const shape = [sail[0]!, sail[1]!, ...belly.reverse()];
      d.pen.fill(shape, PAPER_FILL, 1);
      d.pen.fill(shape, '#efe1bd', 0.7);
      d.pen.stroke(straight(shape, 2), 0.8, d.ink, 0.85, false);
    }
    const flag = [pt(X(mx), y - 62 * s), pt(X(mx - 9), y - 59 * s), pt(X(mx), y - 57 * s)];
    d.pen.fill(flag, RED, 0.85);
  }
  // Bowsprit and jib.
  d.pen.stroke([pt(X(36), y - 13 * s), pt(X(54), y - 22 * s)], 1, d.ink, 0.9, false);
  const jib = [pt(X(14), y - 58 * s), pt(X(52), y - 22 * s), pt(X(26), y - 18 * s)];
  d.pen.fill(jib, '#efe1bd', 0.7);
  d.pen.stroke(straight(jib, 2), 0.8, d.ink, 0.85, false);
  ripples(d, x, y + 3, 44 * s);
}

/** Orcas: tall black dorsal fins cutting the water. */
export function orcas(d: Draw, x: number, y: number, s: number): void {
  for (const [dx, dy, h] of [[0, 0, 1], [-34, 16, 0.8], [26, 22, 0.65]] as const) {
    const fx = x + dx * s;
    const fy = y + dy * s;
    const fin = [pt(fx - 7 * s * h, fy), ...bezier(pt(fx - 7 * s * h, fy), pt(fx - 2 * s * h, fy - 10 * s * h), pt(fx - 5 * s * h, fy - 22 * s * h), 6), ...bezier(pt(fx - 5 * s * h, fy - 22 * s * h), pt(fx + 2 * s * h, fy - 8 * s * h), pt(fx + 8 * s * h, fy), 6)];
    d.pen.fill(fin, '#2c2c34', 0.85);
    d.pen.stroke([...fin, fin[0]!], 0.8, d.ink, 0.9, false);
    const back = bezier(pt(fx - 16 * s * h, fy + 1), pt(fx, fy - 4 * s * h), pt(fx + 16 * s * h, fy + 1), 8);
    d.pen.stroke(back, 1, d.ink, 0.8, false);
    ripples(d, fx, fy + 3, 22 * s * h, 0.4);
  }
}

/** A manta ray gliding, seen from above. */
export function manta(d: Draw, x: number, y: number, s: number): void {
  const wing = [pt(x, y - 10 * s), ...bezier(pt(x, y - 10 * s), pt(x + 18 * s, y - 8 * s), pt(x + 34 * s, y + 6 * s), 8), ...bezier(pt(x + 34 * s, y + 6 * s), pt(x + 14 * s, y + 4 * s), pt(x, y + 14 * s), 8), ...bezier(pt(x, y + 14 * s), pt(x - 14 * s, y + 4 * s), pt(x - 34 * s, y + 6 * s), 8), ...bezier(pt(x - 34 * s, y + 6 * s), pt(x - 18 * s, y - 8 * s), pt(x, y - 10 * s), 8)];
  body(d, wing, '#4f5f73', 0.75);
  for (const dir of [-1, 1]) d.pen.stroke(bezier(pt(x + dir * 4 * s, y - 9 * s), pt(x + dir * 7 * s, y - 15 * s), pt(x + dir * 3 * s, y - 17 * s), 5), 1, d.ink, 0.85, false);
  d.pen.stroke(bezier(pt(x, y + 14 * s), pt(x + 3 * s, y + 26 * s), pt(x - 2 * s, y + 36 * s), 8), 0.8, d.ink, 0.8, false);
}

/** Two dolphins leaping in arcs. */
export function dolphins(d: Draw, x: number, y: number, s: number): void {
  for (const [dx, dy, k] of [[0, 0, 1], [30, 12, 0.85]] as const) {
    const ox = x + dx * s;
    const oy = y + dy * s;
    const spine = bezier(pt(ox - 20 * s * k, oy), pt(ox, oy - 26 * s * k), pt(ox + 20 * s * k, oy - 2 * s * k), 14);
    const shape = ribbon(spine, (u) => (u < 0.1 ? 2 : 9 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 1.5) * s * k).shape;
    body(d, shape, '#8a9aa8');
    const fin = [spine[6]!, pt(spine[6]!.x - 3 * s * k, spine[6]!.y - 9 * s * k), spine[8]!];
    d.pen.fill(fin, '#8a9aa8', 0.85);
    d.pen.hair(fin, 0.7, d.ink, 0.85);
    ripples(d, ox - 20 * s * k, oy + 3, 12 * s, 0.4);
    ripples(d, ox + 20 * s * k, oy + 3, 12 * s, 0.4);
  }
}

/** An octopus doodle, arms curling. */
export function octopus(d: Draw, x: number, y: number, s: number): void {
  const wash = '#c9806a';
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.12 + (k / 6) * 0.76);
    const dir = Math.cos(a) > 0 ? 1 : -1;
    const tip = pt(x + Math.cos(a) * 34 * s, y + Math.sin(a) * 30 * s);
    const spine = [...bezier(pt(x + Math.cos(a) * 6 * s, y + 6 * s), pt(x + Math.cos(a) * 26 * s, y + 6 * s + Math.sin(a) * 12 * s), tip, 10), ...bezier(tip, pt(tip.x + dir * 8 * s, tip.y + 2 * s), pt(tip.x + dir * 4 * s, tip.y - 6 * s), 5).slice(1)];
    body(d, ribbon(spine, (u) => (5 - 4.4 * u) * s).shape, wash);
  }
  const head = oval(x, y - 8 * s, 13 * s, 16 * s, 18);
  body(d, head, wash);
  for (const ex of [-5, 5]) d.pen.dot(x + ex * s, y - 2 * s, 1.5 * s, d.ink, 0.9);
}

/** Flying fish skipping over the water. */
export function flyingFish(d: Draw, x: number, y: number, s: number): void {
  for (const [dx, dy] of [[0, 0], [24, -8], [44, 6]] as const) {
    const fx = x + dx * s;
    const fy = y + dy * s;
    const fish = oval(fx, fy, 7 * s, 2.2 * s, 10);
    body(d, fish, '#6f8fb0');
    const wing = [pt(fx - 1 * s, fy - 1 * s), pt(fx - 6 * s, fy - 9 * s), pt(fx + 4 * s, fy - 2 * s)];
    d.pen.fill(wing, '#cfe0ea', 0.9);
    d.pen.hair(straight(wing, 1.5), 0.6, d.ink, 0.85);
    d.pen.hair(bezier(pt(fx - 30 * s, fy + 10 * s), pt(fx - 18 * s, fy - 4 * s), pt(fx - 8 * s, fy), 6), 0.5, d.ink, 0.35);
  }
}

/** A humpback's tail raised as it dives. */
export function fluke(d: Draw, x: number, y: number, s: number): void {
  const stock = [pt(x - 5 * s, y), pt(x - 3 * s, y - 18 * s), pt(x + 3 * s, y - 18 * s), pt(x + 5 * s, y)];
  body(d, stock, '#5d6a7a');
  const tail = [pt(x, y - 16 * s), ...bezier(pt(x, y - 16 * s), pt(x - 16 * s, y - 18 * s), pt(x - 28 * s, y - 34 * s), 8), ...bezier(pt(x - 28 * s, y - 34 * s), pt(x - 10 * s, y - 30 * s), pt(x, y - 26 * s), 6), ...bezier(pt(x, y - 26 * s), pt(x + 10 * s, y - 30 * s), pt(x + 28 * s, y - 34 * s), 6), ...bezier(pt(x + 28 * s, y - 34 * s), pt(x + 16 * s, y - 18 * s), pt(x, y - 16 * s), 8)];
  body(d, tail, '#5d6a7a');
  for (let k = 0; k < 6; k++) d.pen.dot(x - 20 * s + k * 8 * s, y - 31 * s + Math.abs(k - 2.5) * s, 0.9, '#cfe0ea', 0.9);
  ripples(d, x, y + 3, 26 * s);
}
