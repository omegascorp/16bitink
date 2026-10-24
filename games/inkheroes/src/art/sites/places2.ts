import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import {
  arch, backArc, beam, block, DEPTH, frontArc, frontOf, gable, HOLE, P, PLANK, roundWash, STONE, TIMBER, TIMBER_DARK,
} from './build';
import { mine } from './mines';
import { lump } from './parts';
import { small } from './piles';
import { flame } from './places';
import { blob, crisp, flat, glow, mix, paint, SHADOW } from './paintKit';
import { cone } from './spire';

/**
 * The map's visitable places, part two: a carved standing stone, a
 * wayside shrine with its candle, a windmill and a stable.
 */
const MOSS = '#6f8f4e';
const RUNE = '#7fb6e0';

/** Grass tufts at the foot of something. */
function tufts(d: Draw, rng: Rng, x0: number, x1: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0);
    for (let k = -1; k <= 1; k++) d.pen.stroke([pt(x + k * 0.8, y + rng()), pt(x + k * 2 + (rng() - 0.5), y - 3 - rng() * 2.5)], 0.6, rng() < 0.5 ? MOSS : '#4d7a45', 0.95, false);
  }
}

function standingStone(d: Draw, rng: Rng): void {
  lump(d, rng, pt(-13, 3), 3, 2.2, '#a39d8c');
  lump(d, rng, pt(14, 4), 2.4, 1.8, '#a39d8c');
  const stone = [pt(-9, 2), ...bezier(pt(-9, 2), pt(-11, -26), pt(-3, -47), 12).slice(1), ...bezier(pt(-3, -47), pt(3, -50), pt(6, -42), 6).slice(1), ...bezier(pt(6, -42), pt(11, -20), pt(10, 2), 10).slice(1), pt(0, 3.5)];
  paint(d, stone, '#9fa39a', { shadow: 0.65, hatch: 0.3, cross: true, line: 0.7 });
  d.pen.clipped(stone, () => {
    // The side turned from the light, a narrow face down its right.
    d.pen.fill([pt(4, -46), pt(12, -40), pt(12, 4), pt(5, 4), pt(6, -20)], mix('#9fa39a', SHADOW, 0.45), 0.45);
    d.pen.hair([pt(4, -45), pt(6, -20), pt(5, 3)], 0.5, d.ink, 0.6);
    d.pen.stipple(stone, 220, () => 0.6, 0.45, mix('#9fa39a', SHADOW, 0.5));
    for (let i = 0; i < 5; i++) paint(d, blob(pt(-6 + rng() * 10, -6 - rng() * 36), 2.2 + rng() * 1.6, 1.4 + rng(), rng, 0.3, 10), rng() < 0.5 ? '#c8c27a' : MOSS, { shadow: 0.2, hatch: 0, line: 0, alpha: 0.6 });
  });
  // Runes cut down its face.
  const glyphs: [number, number][][] = [
    [[0, 0], [0, 4], [2, 2]], [[2, 0], [0, 2], [2, 4]], [[0, 0], [2, 4], [0, 4]], [[1, 0], [1, 4], [0, 1], [2, 1]], [[0, 4], [1, 0], [2, 4]],
  ];
  glyphs.forEach((g, i) => {
    const o = pt(-3.5 + (i % 2) * 0.6, -40 + i * 7);
    const pts = g.map(([gx, gy]) => pt(o.x + gx * 1.6, o.y + gy * 1.3));
    d.pen.stroke(pts.map((p) => pt(p.x + 0.45, p.y + 0.45)), 1.3, mix('#9fa39a', SHADOW, 0.7), 0.95, false);
    d.pen.stroke(pts, 0.9, RUNE, 1, false);
  });
  tufts(d, rng, -10, 11, 4, 6);
}

function runeGlow(d: Draw): void {
  glow(d.pen.ctx, pt(-2.5, -24), 12, RUNE, 0.25);
}

function shrine(d: Draw, rng: Rng): void {
  block(d, rng, { x0: -9, x1: 9, z0: -2, z1: 6, h0: 0, h1: 3 }, mix(STONE, '#a39d8c', 0.3), 'stone');
  block(d, rng, { x0: -4.5, x1: 4.5, z0: 0, z1: 5, h0: 3, h1: 20 }, STONE, 'stone', false);
  const niche = { x0: -7, x1: 7, z0: -1, z1: 7, h0: 20, h1: 33 };
  block(d, rng, niche, STONE, 'stone', false);
  const at = frontOf(niche);
  const hole = arch(d, at, 3, 8, 11, STONE, 1.3);
  d.pen.clipped(hole, () => {
    glow(d.pen.ctx, at(7, 5), 7, '#f6c060', 0.75);
    const base = at(7, 0.5);
    const candle = crisp([pt(base.x - 1, base.y), pt(base.x + 1, base.y), pt(base.x + 1, base.y - 4), pt(base.x - 1, base.y - 4)], 1);
    paint(d, candle, '#f3ead2', { shadow: 0.3, hatch: 0, line: 0.35 });
    flame(d, pt(base.x, base.y - 4.2), 3.2);
  });
  gable(d, rng, niche, 8, 'z', '#8d5a3e', 'shingle', STONE, 1.6);
  // A small cross-shaped finial and flowers left at its foot.
  const apex = P(0, -2.6, 41.4);
  d.pen.stroke([apex, pt(apex.x, apex.y - 4)], 0.9, d.ink, 1, false);
  d.pen.stroke([pt(apex.x - 1.5, apex.y - 2.8), pt(apex.x + 1.5, apex.y - 2.8)], 0.9, d.ink, 1, false);
  tufts(d, rng, -10, 10, 5, 4);
  for (const [x, y, c] of [[-8, 3, '#d65a5a'], [-6, 4.5, '#f3ead2'], [7, 4, '#d65a5a'], [9, 2.5, '#e3c845']] as const) {
    d.pen.dot(x, y, 1.1, c, 1);
    d.pen.dot(x + 0.3, y + 0.2, 0.4, d.ink, 0.6);
  }
}

function candleGlow(d: Draw): void {
  glow(d.pen.ctx, P(0, -1, 26), 10, '#f6c060', 0.25);
}

/** One sail: a stock from the hub, a lattice frame along it, cloth over part of it. */
function sail(d: Draw, hub: Pt, ang: number, len: number): void {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-dir.y, dir.x);
  const at = (s: number, t: number): Pt => pt(hub.x + dir.x * s + n.x * t, hub.y + dir.y * s + n.y * t);
  const frame = crisp([at(6, 0.6), at(len, 0.6), at(len, 7), at(6, 7)], 2);
  d.pen.fill(frame, PAPER_FILL, 0.25);
  const cloth = crisp([at(8, 0.8), at(len - 1, 0.8), at(len - 1, 6.6), at(8, 6.6)], 2);
  paint(d, cloth, '#e7dcc0', { shadow: 0.3, hatch: 0, line: 0, alpha: 0.75 });
  for (let s = 6; s <= len; s += 3.6) d.pen.hair([at(s, 0.6), at(s, 7)], 0.4, TIMBER_DARK, 0.85);
  for (const t of [3.8, 7]) d.pen.hair([at(6, t), at(len, t)], 0.5, TIMBER_DARK, 0.9);
  beam(d, hub, at(len + 1, 0), 1.6, TIMBER, 0.5);
}

function windmill(d: Draw, rng: Rng): void {
  const [x, z, r0, r1, H] = [-2, 8, 13, 9, 32];
  const b = P(x, z, 0);
  const t = P(x, z, H);
  const body = [...frontArc(b.x, b.y, r0), ...backArc(t.x, t.y, r1)];
  roundWash(d, body, b.x - r0, b.x + r0, '#d6ccb4');
  d.pen.clipped(body, () => {
    for (let v = 4; v < H; v += 4.2) {
      const k = v / H;
      const r = r0 + (r1 - r0) * k;
      d.pen.hair(frontArc(b.x, b.y - v, r, 14), 0.42, d.ink, 0.38);
      for (let i = 0; i < 5; i++) {
        const s = ((i + ((v / 4.2) % 2) * 0.5 + 0.3) / 5) * Math.PI;
        const px = b.x - r * Math.cos(s);
        const py = b.y - v + r * DEPTH * Math.sin(s);
        d.pen.hair([pt(px, py), pt(px, py + 3.8)], 0.38, d.ink, 0.35);
      }
    }
  });
  d.pen.stroke(closed(crisp(body, 4)), 0.6, d.ink, 0.85);
  const at = (u: number, v: number): Pt => pt(b.x + u, b.y + r0 * DEPTH - v);
  arch(d, at, -3.5, 7, 10, '#d6ccb4', 1.3);
  arch(d, at, -1.2, 2.6, 4, '#d6ccb4', 0.8, 20);
  cone(d, rng, t, r1 + 2, 12, '#7b5a40', null);
  const hub = pt(t.x + 1, t.y - 2);
  for (let k = 0; k < 4; k++) sail(d, hub, 0.38 + (k * Math.PI) / 2, 23);
  paint(d, oval(hub.x, hub.y, 2.2, 2.2, 12), TIMBER_DARK, { shadow: 0.4, hatch: 0, line: 0.5 });
  for (const [px, py] of [[16, 6], [20, 4]] as const) {
    const sackShape = blob(pt(px, py), 3, 3.4, rng, 0.15, 14);
    paint(d, sackShape, '#d9c9a0', { shadow: 0.55, hatch: 0.25, line: 0.55 });
  }
}

/** A horse's head and neck looking out over a half door, facing right, `c` at the neck's foot. */
function horse(d: Draw, c: Pt): void {
  const p = (x: number, y: number): Pt => pt(c.x + x * 0.8, c.y + y * 0.8);
  const coat = '#a86a40';
  const head = [p(-3.4, 0.5), p(-3.6, -6), p(-1.8, -11), p(0.6, -11.4), p(4.6, -8), p(7.4, -3.6), p(7, -1.2), p(4.2, -1.4), p(2.2, -4), p(1.6, 0.5)];
  paint(d, head, coat, { shadow: 0.5, hatch: 0.22, line: 0.6 });
  paint(d, [p(-1.8, -10.6), p(-1.4, -14.4), p(0.4, -11.2)], mix(coat, SHADOW, 0.2), { shadow: 0.3, hatch: 0, line: 0.45 });
  // The mane down the back of the neck, a white blaze, the eye and nostril.
  for (let i = 0; i < 5; i++) d.pen.stroke([p(-3.3 + i * 0.35, -1.5 - i * 2), p(-4.6 + i * 0.35, -0.6 - i * 2)], 0.9, '#3d2a1e', 0.95, false);
  d.pen.fill([p(1, -10.4), p(6.6, -4), p(5.8, -3.4), p(0.4, -9.4)], '#f3ead2', 0.9);
  d.pen.dot(p(1.4, -8).x, p(1.4, -8).y, 0.65, d.ink, 1);
  d.pen.dot(p(6.2, -2.4).x, p(6.2, -2.4).y, 0.45, d.ink, 0.9);
  d.pen.hair([p(4.2, -1.4), p(5.4, -2.2)], 0.4, d.ink, 0.7);
}

function stables(d: Draw, rng: Rng): void {
  const b = { x0: -34, x1: 12, z0: 8, z1: 26, h0: 0, h1: 20 };
  block(d, rng, b, PLANK, 'plank', false);
  const at = frontOf(b);
  // Two stalls: a half door, dark above, a horse looking out of the first.
  for (const u of [6, 26]) {
    const hole = crisp([at(u, 7), at(u + 11, 7), at(u + 11, 18), at(u, 18)], 2);
    d.pen.fill(hole, HOLE, 0.92);
    d.pen.stroke(closed(hole), 0.5, d.ink, 0.9);
    const door = crisp([at(u, 0), at(u + 11, 0), at(u + 11, 7), at(u, 7)], 2);
    flat(d, door, mix(PLANK, TIMBER, 0.4), { tone: 0.05, line: 0.55 });
    d.pen.stroke([at(u + 0.6, 0.8), at(u + 10.4, 6.2)], 0.8, TIMBER_DARK, 0.9, false);
  }
  horse(d, at(10.5, 7.4));
  gable(d, rng, b, 12, 'x', '#c4a35c', 'thatch', PLANK, 2);
  // A hay bale by the door and a fence run off to the left.
  const hay = crisp([pt(16, 9), pt(28, 8), pt(28, 1), pt(16, 2)], 2);
  paint(d, hay, '#d9b862', { shadow: 0.5, hatch: 0.25, line: 0.6 });
  d.pen.clipped(hay, () => {
    for (let i = 0; i < 30; i++) {
      const q = pt(16 + rng() * 12, 1 + rng() * 8);
      d.pen.hair([q, pt(q.x + 2 + rng() * 2, q.y + (rng() - 0.5))], 0.4, rng() < 0.5 ? '#a5823a' : '#f2e2a4', 0.8);
    }
  });
  for (const x of [20, 25]) d.pen.stroke([pt(x, 1.5), pt(x, 8.6)], 0.8, '#efe2bd', 0.95, false);
  for (const x of [-38, -30]) beam(d, pt(x, 10), pt(x, 0), 1.6, TIMBER_DARK, 0.5);
  beam(d, pt(-39, 3), pt(-29, 3), 1.3, TIMBER, 0.45);
  beam(d, pt(-39, 7), pt(-29, 7), 1.3, TIMBER, 0.45);
}

export const PLACES_B = {
  standingStone: small(standingStone, 13, runeGlow),
  shrine: small(shrine, 13, candleGlow),
  windmill: mine(windmill, 26),
  stables: mine(stables, 38),
} as const;
