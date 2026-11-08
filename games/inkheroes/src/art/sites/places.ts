import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { erase } from '../wash';
import { arch, beam, block, CROWN_GOLD, drum, HOLE, P, pennant, slit, TIMBER, TIMBER_DARK } from './build';
import { STONE } from './darkPaints';
import { mine } from './mines';
import { IRON, lump } from './parts';
import { small } from './piles';
import { blob, crisp, flat, glow, ink, LIGHT, mix, paint, SHADOW, soft } from './paintKit';

/**
 * The map's treasure and visitable places, part one: the iron-bound chest,
 * a traveller's campfire, the mercenaries' camp and the ruined watchtower.
 */
const OAK = '#5a3a22';
const CANVAS = '#a3946f';
const RED = '#8e2420';
/** Field stones, warm grey. */
const FIELDSTONE = '#5e574c';

function chest(d: Draw, rng: Rng): void {
  const [x0, x1, z0, z1, h] = [-11, 11, 0, 11, 9];
  block(d, rng, { x0, x1, z0, z1, h0: 0, h1: h }, OAK, 'plank', false);
  // The domed lid: a half-round along the chest, its right end cap in shade.
  const r = (z1 - z0) / 2;
  const prof = (th: number): [number, number] => [z0 + r - r * Math.cos(th), h + r * 0.8 * Math.sin(th)];
  const ths = Array.from({ length: 13 }, (_, i) => (i / 12) * Math.PI);
  const end = crisp(ths.map((th) => P(x1, ...prof(th))), 2);
  const top = [...ths.map((th) => P(x0, ...prof(th))), ...[...ths].reverse().map((th) => P(x1, ...prof(th)))];
  flat(d, end, OAK, { tone: 0.4, hatch: 0.3, line: 0.5 });
  paint(d, top, OAK, { shadow: 0.35, hatch: 0, line: 0.6 });
  d.pen.clipped(top, () => {
    for (let k = 1; k < 6; k++) d.pen.hair([P(x0, ...prof((k / 6) * Math.PI)), P(x1, ...prof((k / 6) * Math.PI))], 0.4, mix(OAK, SHADOW, 0.6), 0.6);
  });
  // Iron bands over the lid and down the front, studded; gilt lock plate and corners.
  for (const x of [x0 + 2.5, x1 - 2.5]) {
    d.pen.stroke(ths.map((th) => P(x, ...prof(th))), 1.6, IRON, 1, false);
    d.pen.stroke([P(x, z0, h), P(x, z0, 0.5)], 1.6, IRON, 1, false);
    for (const v of [2, 5, 8]) d.pen.dot(P(x, z0, v).x, P(x, z0, v).y, 0.45, '#c9c3b6', 1);
  }
  d.pen.stroke([P(x0, z0, h), P(x1, z0, h)], 1.2, IRON, 1, false);
  d.pen.stroke([P(x0, z0, 1), P(x1, z0, 1)], 1.2, IRON, 1, false);
  const lp = P(0, z0, h - 1);
  const plate = crisp([pt(lp.x - 2.4, lp.y - 2.4), pt(lp.x + 2.4, lp.y - 2.4), pt(lp.x + 2.4, lp.y + 3), pt(lp.x - 2.4, lp.y + 3)], 1.5);
  paint(d, plate, CROWN_GOLD, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  d.pen.dot(lp.x, lp.y + 0.6, 0.6, HOLE, 1);
  d.pen.stroke([pt(lp.x, lp.y + 0.8), pt(lp.x, lp.y + 2)], 0.5, HOLE, 1, false);
  for (const x of [x0, x1]) for (const v of [0.5, h]) {
    const c = P(x, z0, v);
    d.pen.fill(oval(c.x, c.y, 1.4, 1.4, 8), CROWN_GOLD, 0.95);
  }
}

/** A flame: layered tongues, deep orange outside to a pale core. */
export function flame(d: Draw, c: Pt, h: number): void {
  const tongue = (k: number, color: string): void => {
    const w = h * 0.42 * k;
    const shape = [...bezier(pt(c.x - w, c.y), pt(c.x - w * 1.1, c.y - h * k * 0.6), pt(c.x + w * 0.1, c.y - h * k), 8), ...bezier(pt(c.x + w * 0.1, c.y - h * k), pt(c.x + w * 0.2, c.y - h * k * 0.55), pt(c.x + w * 0.7, c.y - h * k * 0.62), 5).slice(1), ...bezier(pt(c.x + w * 0.7, c.y - h * k * 0.62), pt(c.x + w * 1.2, c.y - h * k * 0.2), pt(c.x + w, c.y), 6).slice(1)];
    d.pen.fill(shape, color, 0.95);
  };
  tongue(1, '#d8642a');
  tongue(0.72, '#f0a83a');
  tongue(0.42, '#fbe7a8');
  d.pen.stroke(bezier(pt(c.x - h * 0.42, c.y), pt(c.x - h * 0.46, c.y - h * 0.6), pt(c.x + h * 0.04, c.y - h), 8), 0.45, '#8a2a12', 0.8, false);
}

function campfire(d: Draw, rng: Rng): void {
  // A bedroll beside the fire.
  const roll = [pt(9, -1), pt(21, -3), pt(22, 3), pt(10, 5)];
  paint(d, crisp(roll, 2), '#4e3c50', { shadow: 0.5, hatch: 0.25, line: 0.55 });
  d.pen.fill(oval(9.5, 2, 2, 3, 12), mix('#4e3c50', SHADOW, 0.2), 1);
  d.pen.hair(closed(oval(9.5, 2, 1.1, 1.8, 10)), 0.4, d.ink, 0.7);
  d.pen.stroke(closed(oval(9.5, 2, 2, 3, 12)), 0.5, d.ink, 0.9);
  for (const x of [14, 18.5]) d.pen.stroke([pt(x, -2.4), pt(x + 0.6, 4.4)], 0.9, '#3a2616', 1, false);
  // The ring of stones, back half first, the logs and flame, then the near stones.
  const ring = (a: number): Pt => pt(-4 + Math.cos(a) * 11, Math.sin(a) * 4.6);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    lump(d, rng, ring(a), 2.6, 1.9, mix(FIELDSTONE, '#8a8070', rng() * 0.4), 0.45);
  }
  d.pen.fill(oval(-4, 0, 9, 3.6, 18), '#1a1210', 0.9);
  beam(d, pt(-11, 1), pt(2, -3.5), 2.6, TIMBER);
  beam(d, pt(-10, -3), pt(3, 1.5), 2.6, mix(TIMBER, SHADOW, 0.15));
  for (const p of [pt(-11, 1), pt(3, 1.5)]) d.pen.fill(oval(p.x, p.y, 1.3, 1.3, 8), '#3a2a22', 0.95);
  flame(d, pt(-4, -1), 11);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    lump(d, rng, ring(a), 2.8, 2, mix(FIELDSTONE, '#8a8070', rng() * 0.4), 0.5);
  }
}

function fireAir(d: Draw, rng: Rng): void {
  glow(d.pen.ctx, pt(-4, -4), 18, '#f6a040', 0.42);
  for (let i = 0; i < 3; i++) {
    const s = blob(pt(-3 + i * 2, -18 - i * 6), 2.4 + i, 1.8 + i * 0.6, rng, 0.25, 12);
    soft(d.pen.ctx, 1, () => d.pen.fill(s, '#7e776c', 0.4 - i * 0.1));
  }
  for (const p of [pt(-1, -16), pt(-6, -20), pt(1, -24)]) d.pen.dot(p.x, p.y, 0.5, '#f8c060', 0.9);
}

function tent(d: Draw, rng: Rng): void {
  const [x0, x1, z0, z1, H] = [-30, 4, 4, 30, 30];
  const xm = (x0 + x1) / 2;
  const left = crisp([P(x0, z1, 0), P(x0, z0, 0), P(xm, z0, H), P(xm, z1, H)], 3);
  const right = crisp([P(xm, z0, H), P(x1, z0, 0), P(x1, z1, 0), P(xm, z1, H)], 3);
  const front = crisp([P(x0, z0, 0), P(x1, z0, 0), P(xm, z0, H)], 3);
  flat(d, left, CANVAS, { tone: -0.1, line: 0.6 });
  flat(d, right, CANVAS, { tone: 0.38, hatch: 0.28, line: 0.6 });
  for (const t of [0.33, 0.66]) {
    d.pen.hair([P(x0 + (xm - x0) * t, z0, H * t), P(x0 + (xm - x0) * t, z1, H * t)], 0.4, mix(CANVAS, SHADOW, 0.5), 0.7);
    d.pen.hair([P(x1 - (x1 - xm) * t, z0, H * t), P(x1 - (x1 - xm) * t, z1, H * t)], 0.4, d.ink, 0.5);
  }
  flat(d, front, CANVAS, { tone: 0.05, line: 0.6 });
  // A red hem along the eaves and up the front.
  d.pen.stroke([P(x0, z0, 1), P(xm, z0, H), P(x1, z0, 1)], 1.6, RED, 0.95, false);
  // The door: the flaps tied back on a dark inside.
  const door = crisp([P(xm - 7, z0, 0), P(xm + 7, z0, 0), P(xm, z0, 17)], 2);
  d.pen.fill(door, HOLE, 0.92);
  for (const s of [-1, 1]) {
    const flap = [P(xm + s * 7, z0, 0), P(xm, z0, 17), P(xm + s * 9, z0, 5)];
    paint(d, flap, mix(CANVAS, SHADOW, 0.1), { shadow: 0.4, hatch: 0, line: 0.5 });
  }
  d.pen.stroke(closed(door), 0.5, d.ink, 0.8);
  const ridge = P(xm, z0 - 1, H);
  pennant(d, ridge, 9, RED, 9, 0.6);
  void rng;
}

function rack(d: Draw, rng: Rng): void {
  const b0 = pt(12, 4);
  const b1 = pt(30, 2);
  // Spears leant on a crossbar between two posts, and a shield against the foot.
  for (let i = 0; i < 4; i++) {
    const foot = pt(b0.x + 2 + i * 4.4, b0.y + 1 - i * 0.4);
    const tip = pt(foot.x + 2.5, foot.y - 30 + (i % 2) * 3);
    ink(d, [foot, tip], 0.9, 1);
    d.pen.stroke([foot, tip], 0.6, TIMBER, 1, false);
    const head = [pt(tip.x - 1, tip.y + 2.5), pt(tip.x, tip.y - 2.5), pt(tip.x + 1, tip.y + 2.5)];
    paint(d, head, '#b8bcc6', { shadow: 0.3, hatch: 0, line: 0.4, gloss: true });
  }
  beam(d, pt(b0.x, b0.y + 1), pt(b0.x, b0.y - 18), 2, TIMBER_DARK);
  beam(d, pt(b1.x, b1.y + 1), pt(b1.x, b1.y - 18), 2, TIMBER_DARK);
  beam(d, pt(b0.x - 1, b0.y - 15), pt(b1.x + 1, b1.y - 15), 2, TIMBER);
  const sc = pt(24, -3);
  const shield = oval(sc.x, sc.y, 6, 6.4, 22);
  paint(d, shield, RED, { shadow: 0.5, hatch: 0.25, line: 0.7 });
  d.pen.stroke(closed(oval(sc.x, sc.y, 5.3, 5.7, 20)), 0.7, CROWN_GOLD, 0.9);
  paint(d, oval(sc.x, sc.y, 1.6, 1.6, 10), '#b8bcc6', { shadow: 0.4, hatch: 0, line: 0.45, gloss: true });
  void rng;
}

function mercCamp(d: Draw, rng: Rng): void {
  tent(d, rng);
  rack(d, rng);
}

function watchtower(d: Draw, rng: Rng): void {
  const [x, z, r, H] = [-3, 10, 12, 52];
  const t = drum(d, rng, x, z, r, 0, H, STONE);
  const at = (u: number, v: number): Pt => pt(t.base.x + u, t.base.y - v);
  arch(d, at, -4, 7, 11, STONE, 1.4);
  slit(d, at, -7, 26, 2, 5);
  slit(d, at, 2, 38, 2, 5);
  // Broken off across the top: high on the left, low on the right with a gap.
  const L = t.base.x - r;
  const R = t.base.x + r;
  const top = t.top.y + r * 0.6;
  const jag = [pt(L - 1, top + 2), pt(L + 3, top - 1), pt(L + 7, top + 3), pt(L + 10, top + 1), pt(L + 13, top + 8), pt(L + 16, top + 6), pt(L + 19, top + 14), pt(R - 2, top + 13), pt(R + 1, top + 17)];
  erase(d.pen.ctx, [...jag, pt(R + 4, top - 20), pt(L - 4, top - 20)]);
  // Inside: the hollow in shadow, then the far wall's inner face standing a little higher, coursed.
  const back = [pt(R - 1, top + 10), pt(R - 4, top + 6), pt(L + 15, top + 1), pt(L + 12, top - 3), pt(L + 8, top - 1), pt(L + 5, top - 5), pt(L + 1, top - 2)];
  const far = crisp([...jag, ...back], 2);
  flat(d, far, mix(STONE, SHADOW, 0.12), { tone: 0.1, line: 0.6 });
  d.pen.clipped(far, () => {
    for (let y = top - 6; y < top + 16; y += 3.6) d.pen.hair([pt(L, y), pt(R, y + 1)], 0.4, d.ink, 0.4);
    d.pen.fill([...jag.map((p) => pt(p.x, p.y + 0.5)), ...[...jag].reverse().map((p) => pt(p.x + 1.5, p.y - 3.2))], '#1e1814', 0.8);
  });
  d.pen.stroke(jag.map((p) => pt(p.x, p.y + 0.9)), 1.4, mix(STONE, LIGHT, 0.5), 0.9, false);
  ink(d, jag, 0.7, 0.95);
  // Ivy up its left side, and fallen stones at its foot.
  const stem = Array.from({ length: 12 }, (_, i) => pt(L + 3 + Math.sin(i * 1.3) * 2.5 + i * 0.25, t.base.y + 4 - i * 4));
  d.pen.stroke(stem, 0.6, '#24361c', 0.95, false);
  stem.forEach((p, i) => {
    for (const s of [-1, 1]) {
      if (rng() < 0.25) continue;
      const leaf = blob(pt(p.x + s * 1.8, p.y - 0.6), 1.7, 1.2, rng, 0.25, 8, s * 0.6);
      paint(d, leaf, i % 2 ? '#3d5a28' : '#2c4520', { shadow: 0.4, hatch: 0, line: 0.35 });
    }
  });
  for (const [px, py, s] of [[-24, 6, 3], [14, 7, 3.6], [20, 4, 2.4], [-18, 8, 2.2], [9, 9, 2]] as const) lump(d, rng, pt(px, py), s, s * 0.75, mix(STONE, FIELDSTONE, 0.5));
}

export const PLACES_A = {
  chest: small(chest, 14),
  campfire: small(campfire, 16, fireAir),
  mercCamp: mine(mercCamp, 37),
  watchtower: mine(watchtower, 24),
} as const;
