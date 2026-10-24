import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { backArc, beam, CROWN_BLUE, CROWN_GOLD, drum, frontArc, frontOf, HOLE, P, pennant, PLANK, quad, sideOf, STONE, TIMBER, TIMBER_DARK, type Box, type Surface } from '../sites/build';
import { IRON } from '../sites/parts';
import { blob, crisp, dab, flat, gleam, groundShadow, LIGHT, mix, paint, SHADOW, soft } from '../sites/paintKit';
import {
  barrel, CANVAS, crate, earth, face, fruit, heap, OAK, OCHRE, paintIn, RED, roof, sack, solid, STRAW, straw, throwShadow, tufts,
} from './tradesKit';
import type { TownDrawer } from './types';

/**
 * The market and the stables: stalls under striped awnings heaped with
 * fruit, bread and cheese, a handcart of pumpkins; a timber stable block
 * under thatch, its hayloft over the middle stall and horses looking out.
 */
const APPLE = '#c23a2c';
const PEAR = '#b8c24a';
const ORANGE = '#e08a2a';
const PLUM = '#6b3f7a';
const BREAD = '#c98a44';
const CHEESE = '#e8c24a';
const CABBAGE = '#7fa84e';
const PUMPKIN = '#df7f2a';

// ---- The market ----

interface Stall {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly stripe: string;
  /** Lays out the wares; `on(x, dz)` is a point on the counter top, `dz` back from its front edge. */
  readonly goods: (d: Draw, rng: Rng, on: (x: number, dz: number) => Pt) => void;
}

const COUNTER_DEPTH = 9;
const COUNTER_H = 14;

/** A stall's awning: a canvas sloping down to the front, striped, its scalloped valance hanging from the front edge. */
function awning(d: Draw, x0: number, x1: number, z0: number, z1: number, stripe: string): void {
  const { pen } = d;
  const [hf, hb] = [32, 42];
  const w = x1 - x0 + 6;
  const at: Surface = (u, v) => P(x0 - 3 + u, z0 - 6 + (v / 10) * (z1 + 2 - (z0 - 6)), hf + (v / 10) * (hb - hf));
  const shape = crisp(quad(at, 0, 0, w, 10), 3);
  flat(d, shape, CANVAS, { tone: -0.05, line: 0 });
  const band = 5;
  pen.clipped(shape, () => {
    for (let u = 0; u < w; u += band * 2) pen.fill(crisp(quad(at, u, -1, u + band, 11), 3), stripe, 0.85);
    // The canvas sags between its poles: a soft shadow along the middle, light along the front fold.
    soft(pen.ctx, 2, () => pen.fill(quad(at, -1, 3, w + 1, 6.5), SHADOW, 0.12));
    pen.hair([at(0, 0.6), at(w, 0.6)], 0.6, PAPER_FILL, 0.55);
  });
  pen.stroke(closed(shape), 0.85, d.ink, 0.9);
  // The valance: a scalloped tab under each stripe.
  for (let u = 0, k = 0; u < w - 0.5; u += band, k++) {
    const a = at(u, 0);
    const b = at(Math.min(w, u + band), 0);
    const tab = [a, b, ...bezier(b, pt((a.x + b.x) / 2, b.y + 6.5), a, 6).slice(1, -1)];
    paint(d, tab, k % 2 === 0 ? stripe : CANVAS, { shadow: 0.35, hatch: 0, line: 0.55 });
  }
}

/** One stall: back posts and a hanging cloth, the counter with its goods, front posts, the awning over all. */
function stall(d: Draw, rng: Rng, s: Stall): void {
  const z1 = s.z0 + COUNTER_DEPTH + 5;
  for (const x of [s.x0, s.x1]) beam(d, P(x, z1, 0), P(x, z1, 42), 2.2, TIMBER, 0.55);
  const cloth = crisp([P(s.x0, z1, 17), P(s.x1, z1, 17), P(s.x1, z1, 41), P(s.x0, z1, 41)], 3);
  flat(d, cloth, mix(s.stripe, SHADOW, 0.35), { tone: 0.2, line: 0.6 });
  d.pen.clipped(cloth, () => {
    for (let x = s.x0 + 3; x < s.x1; x += 4.5) d.pen.hair([P(x, z1, 17), P(x + 0.4, z1, 41)], 0.4, mix(s.stripe, SHADOW, 0.7), 0.6);
  });
  const counter: Box = { x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z0 + COUNTER_DEPTH, h0: 0, h1: COUNTER_H };
  solid(d, rng, counter, PLANK, 'plank', true);
  // A cloth hung over the counter's front.
  const at = frontOf(counter);
  const drape = [at(2, COUNTER_H), at(s.x1 - s.x0 - 2, COUNTER_H), at(s.x1 - s.x0 - 3, 6), ...bezier(at(s.x1 - s.x0 - 3, 6), at((s.x1 - s.x0) / 2, 2.5), at(3, 6), 8).slice(1)];
  paint(d, drape, mix(s.stripe, CANVAS, 0.25), { shadow: 0.35, hatch: 0, line: 0.6 });
  s.goods(d, rng, (x, dz) => P(x, s.z0 + dz, COUNTER_H));
  for (const x of [s.x0, s.x1]) beam(d, P(x, s.z0 - 4, 0), P(x, s.z0 - 4, 33), 2.2, mix(TIMBER, SHADOW, x === s.x1 ? 0.15 : 0), 0.55);
  awning(d, s.x0, s.x1, s.z0, z1, s.stripe);
  pennant(d, P(s.x0, z1, 42), 14, s.stripe, 13, 1);
}

/** A wicker basket, `w` across at its rim on `foot`. */
function basket(d: Draw, foot: Pt, w: number, h: number): Pt {
  const rim = foot.y - h;
  const body = [pt(foot.x - w / 2, rim), pt(foot.x + w / 2, rim), ...bezier(pt(foot.x + w / 2, rim), pt(foot.x + w * 0.45, foot.y + 1), pt(foot.x, foot.y), 6).slice(1), ...bezier(pt(foot.x, foot.y), pt(foot.x - w * 0.45, foot.y + 1), pt(foot.x - w / 2, rim), 6).slice(1, -1)];
  paint(d, body, '#b88a4a', { shadow: 0.5, hatch: 0, line: 0.6 });
  d.pen.clipped(body, () => {
    for (let y = rim + 1.4; y < foot.y; y += 1.6) d.pen.hair([pt(foot.x - w / 2, y), pt(foot.x + w / 2, y)], 0.35, '#6a4a24', 0.6);
    for (let x = foot.x - w / 2 + 1.5; x < foot.x + w / 2; x += 2.2) d.pen.hair([pt(x, rim), pt(x + (foot.x - x) * 0.15, foot.y)], 0.3, '#6a4a24', 0.45);
  });
  return pt(foot.x, rim + 1);
}

/** A loaf: a long rounded bake with its slashes. */
function loaf(d: Draw, c: Pt, w: number, ang = 0): void {
  const shape = oval(c.x, c.y, w / 2, w * 0.24, 16).map((p) => pt(c.x + (p.x - c.x) * Math.cos(ang) - (p.y - c.y) * Math.sin(ang), c.y + (p.x - c.x) * Math.sin(ang) + (p.y - c.y) * Math.cos(ang)));
  paint(d, shape, BREAD, { shadow: 0.5, hatch: 0, line: 0.5 });
  for (let k = -1; k <= 1; k++) d.pen.hair([pt(c.x + k * w * 0.22 - 1, c.y - w * 0.1), pt(c.x + k * w * 0.22 + 1.2, c.y + w * 0.06)], 0.5, '#7a4a20', 0.8);
}

/** A cheese wheel standing on `foot`: its rind round the side, the pale top. */
function cheese(d: Draw, foot: Pt, r: number, h: number): void {
  const ry = r * 0.6;
  const side = [...oval(foot.x, foot.y - h, r, ry, 20).slice(0, 11), ...oval(foot.x, foot.y, r, ry, 20).slice(0, 11).reverse()];
  paint(d, side, mix(CHEESE, OCHRE, 0.4), { shadow: 0.5, hatch: 0, line: 0.55 });
  paint(d, oval(foot.x, foot.y - h, r, ry, 20), CHEESE, { shadow: 0.2, hatch: 0, line: 0.55 });
}

/** A jug: a round belly, a neck and lip, a handle on the right. */
function jug(d: Draw, foot: Pt, h: number, color: string): void {
  const w = h * 0.38;
  const shape = [pt(foot.x - w * 0.6, foot.y), ...bezier(pt(foot.x - w * 0.6, foot.y), pt(foot.x - w * 1.35, foot.y - h * 0.55), pt(foot.x - w * 0.38, foot.y - h * 0.86), 8).slice(1), pt(foot.x - w * 0.5, foot.y - h), pt(foot.x + w * 0.5, foot.y - h), pt(foot.x + w * 0.38, foot.y - h * 0.86), ...bezier(pt(foot.x + w * 0.38, foot.y - h * 0.86), pt(foot.x + w * 1.35, foot.y - h * 0.55), pt(foot.x + w * 0.6, foot.y), 8).slice(1)];
  d.pen.stroke(bezier(pt(foot.x + w * 0.45, foot.y - h * 0.82), pt(foot.x + w * 1.5, foot.y - h * 0.85), pt(foot.x + w * 0.85, foot.y - h * 0.4), 6), 0.9, mix(color, SHADOW, 0.3), 1, false);
  paint(d, shape, color, { shadow: 0.55, hatch: 0, line: 0.6, gloss: true });
  d.pen.fill(oval(foot.x, foot.y - h, w * 0.45, w * 0.14, 10), '#2b2230', 0.85);
}

/** A cabbage: a pale heart in round outer leaves. */
function cabbage(d: Draw, c: Pt, r: number): void {
  paint(d, oval(c.x, c.y, r, r * 0.85, 16), CABBAGE, { shadow: 0.5, hatch: 0, line: 0.5 });
  paint(d, oval(c.x - r * 0.15, c.y - r * 0.15, r * 0.55, r * 0.45, 12), mix(CABBAGE, '#e8f0b0', 0.5), { shadow: 0.25, hatch: 0, line: 0.35 });
  for (const s of [-1, 1]) d.pen.hair([pt(c.x + s * r * 0.2, c.y + r * 0.6), pt(c.x + s * r * 0.75, c.y - r * 0.1)], 0.4, mix(CABBAGE, SHADOW, 0.5), 0.8);
}

/** A pumpkin: ribbed, a curled stalk. */
function pumpkin(d: Draw, c: Pt, r: number): void {
  paint(d, oval(c.x, c.y, r * 1.15, r * 0.85, 18), PUMPKIN, { shadow: 0.55, hatch: 0, line: 0.6, gloss: true });
  for (const k of [-0.6, -0.2, 0.2, 0.6]) d.pen.hair(bezier(pt(c.x + k * r * 0.4, c.y - r * 0.8), pt(c.x + k * r * 1.5, c.y), pt(c.x + k * r * 0.4, c.y + r * 0.8), 6), 0.45, mix(PUMPKIN, SHADOW, 0.5), 0.8);
  d.pen.stroke([pt(c.x, c.y - r * 0.75), pt(c.x + r * 0.15, c.y - r * 1.15), pt(c.x + r * 0.4, c.y - r * 1.2)], 1, '#5a6a2a', 1, false);
}

function breadStall(d: Draw, rng: Rng, on: (x: number, z: number) => Pt): void {
  const top = basket(d, on(-90, 5), 13, 4);
  for (let i = 0; i < 3; i++) loaf(d, pt(top.x - 3 + i * 3, top.y - 1.5 - (i % 2) * 2), 8, -0.2 + i * 0.25);
  cheese(d, on(-75, 6), 5, 3.5);
  cheese(d, pt(on(-75, 6).x + 0.5, on(-75, 6).y - 3.6), 4.2, 3);
  const b2 = basket(d, on(-62, 4), 12, 3.6);
  for (let i = 0; i < 5; i++) d.pen.dot(b2.x - 4 + i * 2, b2.y - 1 - (i % 2), 1.6, mix(BREAD, LIGHT, 0.2), 1);
  for (let i = 0; i < 5; i++) d.pen.hair(closed(oval(b2.x - 4 + i * 2, b2.y - 1 - (i % 2), 1.6, 1.6, 8)), 0.35, '#7a4a20', 0.8);
  void rng;
}

function fruitStall(d: Draw, rng: Rng, on: (x: number, z: number) => Pt): void {
  heap(d, rng, on(-36, 4), 3, 2.1, [APPLE, APPLE, mix(APPLE, ORANGE, 0.4)]);
  heap(d, rng, on(-22, 4), 3, 2, [PEAR, mix(PEAR, ORANGE, 0.3)]);
  heap(d, rng, on(-9, 4), 2, 2.1, [PLUM, mix(PLUM, '#3a2a5a', 0.3)]);
  cabbage(d, on(-1, 7), 3);
}

function potteryStall(d: Draw, rng: Rng, on: (x: number, z: number) => Pt): void {
  jug(d, on(16, 4), 11, '#b5653e');
  jug(d, on(24, 5), 8, CROWN_BLUE);
  jug(d, on(31, 4), 10, '#c9a46a');
  heap(d, rng, on(43, 4), 3, 2, [ORANGE, mix(ORANGE, '#f0c040', 0.4)]);
}

const STALLS: readonly Stall[] = [
  { x0: 6, x1: 52, z0: 44, stripe: OCHRE, goods: potteryStall },
  { x0: -100, x1: -54, z0: 26, stripe: CROWN_BLUE, goods: breadStall },
  { x0: -46, x1: 4, z0: 4, stripe: RED, goods: fruitStall },
];

/** A spoked cart wheel facing the viewer. */
function wheel(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    beam(d, c, pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.85), 1.1, TIMBER, 0.4);
  }
  const ring = [...oval(c.x, c.y, r, r, 28), ...oval(c.x, c.y, r * 0.8, r * 0.8, 28).reverse()];
  paint(d, ring, OAK, { shadow: 0.5, hatch: 0, line: 0 });
  pen.stroke(closed(oval(c.x, c.y, r, r, 28)), 1.3, IRON, 1);
  pen.stroke(closed(oval(c.x, c.y, r * 0.8, r * 0.8, 24)), 0.5, d.ink, 0.85);
  paint(d, oval(c.x, c.y, r * 0.22, r * 0.22, 12), mix(OAK, SHADOW, 0.2), { shadow: 0.4, hatch: 0, line: 0.5 });
  pen.dot(c.x - r * 0.06, c.y - r * 0.06, r * 0.08, IRON, 1);
}

/** A handcart heaped with pumpkins and apples, its shafts resting on the ground. */
function handcart(d: Draw, rng: Rng): void {
  for (const z of [5, 14]) beam(d, P(52, z, 12), P(32, z - 1, 0.5), 1.8, mix(TIMBER, SHADOW, z > 10 ? 0.2 : 0), 0.55);
  const bed: Box = { x0: 50, x1: 82, z0: 2, z1: 16, h0: 8, h1: 15 };
  solid(d, rng, bed, PLANK, 'plank', false);
  const inside = crisp([P(bed.x0, bed.z0, bed.h1), P(bed.x1, bed.z0, bed.h1), P(bed.x1, bed.z1, bed.h1), P(bed.x0, bed.z1, bed.h1)], 3);
  flat(d, inside, mix(PLANK, SHADOW, 0.4), { tone: 0.2, line: 0.6 });
  for (let i = 0; i < 3; i++) pumpkin(d, P(56 + i * 9.5, 12, 16), 4.3 + (i % 2) * 0.6);
  for (let i = 0; i < 4; i++) pumpkin(d, P(54 + i * 8.6, 6, 15.5), 4.3 - (i % 2) * 0.4);
  for (let i = 0; i < 4; i++) fruit(d, P(59 + i * 4.6, 9, 21 + (i % 2)), 1.9, APPLE, i % 2 === 0);
  wheel(d, P(66, 1, 8), 8.5);
}

function marketWares(d: Draw, rng: Rng): void {
  crate(d, rng, { x0: -108, x1: -94, z0: 8, z1: 18, h0: 0, h1: 10 });
  crate(d, rng, { x0: -105, x1: -93, z0: 10, z1: 18, h0: 10, h1: 18 });
  heap(d, rng, P(-99, 13, 18), 2, 1.9, [APPLE, PEAR]);
  sack(d, rng, P(-86, 10), 4.6);
  sack(d, rng, P(-80, 6), 4.2, mix('#d9c9a0', OCHRE, 0.2));
  crate(d, rng, { x0: -60, x1: -50, z0: 0, z1: 8, h0: 0, h1: 8 });
  for (let i = 0; i < 3; i++) cabbage(d, P(-57 + i * 3.4, 4, 8.5 + (i % 2) * 1.5), 2.6);
  barrel(d, P(10, 6), 5, 11, OAK);
  heap(d, rng, P(10.6, 6.2, 11.5), 2, 1.9, [APPLE, mix(APPLE, ORANGE, 0.4)]);
  handcart(d, rng);
  basketOnGround(d, rng, P(22, 12));
  sack(d, rng, P(88, 20), 4.4);
}

function basketOnGround(d: Draw, rng: Rng, foot: Pt): void {
  const top = basket(d, foot, 13, 7);
  heap(d, rng, pt(top.x, top.y + 1.5), 2, 2, [PEAR, ORANGE, APPLE]);
}

/** The market cross at the back of the square: stepped, a slender shaft, a gilt orb and cross on its head. */
function marketCross(d: Draw, rng: Rng): void {
  const [x, z] = [-25, 50];
  for (const [r, h0] of [[10, 0], [8, 3], [6, 6]] as const) {
    drum(d, rng, x, z, r, h0, h0 + 3, STONE, false);
    const t = P(x, z, h0 + 3);
    flat(d, [...frontArc(t.x, t.y, r, 16), ...backArc(t.x, t.y, r, 16).slice(1, -1)], STONE, { tone: -0.3, line: 0.55 });
  }
  drum(d, rng, x, z, 2.6, 9, 13, STONE, false);
  drum(d, rng, x, z, 1.7, 13, 56, mix(STONE, '#e8e2d4', 0.4), false);
  const cap = P(x, z, 56);
  paint(d, crisp([pt(cap.x - 4, cap.y - 3), pt(cap.x + 4, cap.y - 3), pt(cap.x + 2.2, cap.y + 0.6), pt(cap.x - 2.2, cap.y + 0.6)], 1), STONE, { shadow: 0.4, hatch: 0, line: 0.55 });
  const orb = pt(cap.x, cap.y - 6.2);
  paint(d, oval(orb.x, orb.y, 3, 3, 16), CROWN_GOLD, { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
  d.pen.stroke([pt(orb.x, orb.y - 3), pt(orb.x, orb.y - 9)], 1.2, CROWN_GOLD, 1, false);
  d.pen.stroke([pt(orb.x - 2.4, orb.y - 6.6), pt(orb.x + 2.4, orb.y - 6.6)], 1.2, CROWN_GOLD, 1, false);
  d.pen.hair([pt(orb.x - 3, orb.y), pt(orb.x + 3, orb.y)], 0.5, mix(CROWN_GOLD, SHADOW, 0.5), 0.8);
}

function market(d: Draw, rng: Rng): void {
  marketCross(d, rng);
  for (const s of STALLS) stall(d, rng, s);
  marketWares(d, rng);
}

function marketGround(d: Draw, rng: Rng): void {
  groundShadow(d, -6, 4, 108, 8, 0.2);
  earth(d, rng, [P(-114, -6), P(106, -6), P(110, 30), P(70, 52), P(-110, 46)], '#c4ad86', 0.5);
  // Straw and a dropped apple or two about the stalls.
  for (let i = 0; i < 24; i++) {
    const p = P(-100 + rng() * 190, -4 + rng() * 40);
    d.pen.hair([p, pt(p.x + 2 + rng() * 2, p.y + (rng() - 0.5) * 1.5)], 0.45, rng() < 0.5 ? '#c9a860' : '#a5823a', 0.75);
  }
  for (const [x, z] of [[-20, -3], [26, 0]] as const) fruit(d, P(x, z, 1.7), 1.7, APPLE, false);
  for (const s of STALLS) groundShadow(d, (P(s.x0, s.z0).x + P(s.x1, s.z0).x) / 2 + 4, P(0, s.z0 + 5).y, (s.x1 - s.x0) / 2 + 4, 5, 0.18);
}

// ---- The stables ----

const BARN: Box = { x0: -62, x1: 40, z0: 8, z1: 40, h0: 0, h1: 30 };
const LOFT: Box = { x0: -15, x1: 11, z0: 8, z1: 21, h0: 30, h1: 44 };
const BAY = '#8a5232';
const GREY = '#c4c0ba';

/** A horse's head and neck looking out over a half-door, facing right, `c` at the neck's foot on the door's top; `k` scales it. */
function horse(d: Draw, rng: Rng, c: Pt, coat: string, mane: string, k = 1): void {
  const { pen } = d;
  const p = (x: number, y: number): Pt => pt(c.x + x * k, c.y + y * k);
  const neck = [p(-5.5, 0.5), p(-6, -6), p(-4.6, -11), p(-2.6, -13.6), p(0.4, -12.6), p(1.6, -9), p(2.4, -4), p(3.2, 0.5)];
  paint(d, neck, mix(coat, SHADOW, 0.12), { shadow: 0.55, hatch: 0.2, line: 0.7 });
  const head = [p(-2.6, -13.6), p(-0.6, -14.6), p(2.6, -13.2), p(6.6, -9.4), p(10.4, -5.6), p(11.4, -3.6), p(10.8, -1.8), p(8.6, -1.4), p(6.4, -2.4), p(3.4, -4.6), p(1.2, -6.4), p(-0.6, -8.4)];
  paint(d, head, coat, { shadow: 0.45, hatch: 0.15, line: 0.75 });
  // The cheek's round jaw, the muzzle a shade darker.
  pen.clipped(head, () => {
    soft(pen.ctx, 0.8, () => pen.fill(oval(p(2.6, -6.8).x, p(2.6, -6.8).y, 3 * k, 2.6 * k, 12), mix(coat, SHADOW, 0.35), 0.35));
    pen.fill(oval(p(10, -3).x, p(10, -3).y, 2.4 * k, 2 * k, 10), mix(coat, '#4a3a3a', 0.4), 0.6);
    pen.fill([p(1.2, -13.4), p(3, -13), p(9.4, -6), p(9, -4.6), p(7.6, -6.4)], '#f3ead2', 0.85);
  });
  pen.hair(bezier(p(0.8, -6.6), p(3.6, -9.2), p(5.6, -4.2), 6), 0.45, d.ink, 0.6);
  // Ears, forelock, mane.
  for (const [x, y] of [[-1.8, -13.8], [0.2, -14.2]] as const) paint(d, [p(x - 1, y + 0.4), p(x - 0.2, y - 4.2), p(x + 1.4, y + 0.2)], mix(coat, SHADOW, x < -1 ? 0.25 : 0.05), { shadow: 0.3, hatch: 0, line: 0.5 });
  for (let i = 0; i < 4; i++) pen.stroke([p(-0.4 + i * 0.5, -13.6), p(0.8 + i * 0.8, -11.2 + (rng() - 0.5))], 0.8, mane, 0.95, false);
  for (let i = 0; i < 7; i++) pen.stroke([p(-2.4 - i * 0.5, -13 + i * 1.8), p(-5.6 - i * 0.35 - rng(), -11.8 + i * 1.9)], 1.1, mane, 0.95, false);
  // Eye, nostril, mouth, and the blue halter.
  const eye = p(2.6, -10.6);
  pen.dot(eye.x, eye.y, 0.85 * k, '#1e1a22', 1);
  pen.dot(eye.x + 0.3, eye.y - 0.3, 0.3, PAPER_FILL, 0.95);
  pen.hair([p(9.6, -4.6), p(10.6, -4)], 0.5, d.ink, 0.85);
  pen.hair([p(8.8, -1.8), p(10.4, -2.4)], 0.45, d.ink, 0.7);
  pen.stroke([p(-0.2, -12.8), p(1.4, -6.8)], 1, CROWN_BLUE, 0.95, false);
  pen.stroke([p(5.6, -10.4), p(8.4, -5.6), p(6.2, -2.6)], 1, CROWN_BLUE, 0.95, false);
  pen.dot(p(7.6, -5.6).x, p(7.6, -5.6).y, 0.6, '#c99a2e', 1);
}

/** One stall's opening: dark above a half-door with its Z brace, or both leaves shut. */
function stallDoor(d: Draw, at: Surface, u: number, w: number, open: boolean): Pt[] {
  const { pen } = d;
  const hole = crisp(quad(at, u, 13, u + w, 25), 2);
  pen.fill(hole, HOLE, 0.92);
  pen.clipped(hole, () => soft(pen.ctx, 1.5, () => pen.fill(quad(at, u - 1, 20, u + w + 1, 26), SHADOW, 0.5)));
  const leaf = (v0: number, v1: number): void => {
    const s = crisp(quad(at, u + 0.5, v0, u + w - 0.5, v1), 2);
    flat(d, s, mix(PLANK, TIMBER, 0.45), { tone: 0.08, line: 0.6 });
    pen.clipped(s, () => {
      for (let k = u + 3; k < u + w; k += 3) pen.hair([at(k, v0), at(k, v1)], 0.4, TIMBER_DARK, 0.6);
    });
    for (const v of [v0 + 1.4, v1 - 1.4]) beam(d, at(u + 0.8, v), at(u + w - 0.8, v), 1.6, TIMBER_DARK, 0.45);
    beam(d, at(u + 1, v0 + 1.6), at(u + w - 1, v1 - 1.6), 1.5, TIMBER_DARK, 0.45);
  };
  leaf(0, 13);
  if (!open) leaf(13, 25);
  for (const x of [u - 1, u + w + 1]) beam(d, at(x, 0), at(x, 26.5), 2.4, TIMBER_DARK, 0.55);
  beam(d, at(u - 2.4, 26.5), at(u + w + 2.4, 26.5), 2.6, TIMBER_DARK, 0.55);
  return hole;
}

function loft(d: Draw, rng: Rng): void {
  const at = frontOf(LOFT);
  face(d, rng, at, 26, 14, PLANK, 'plank', 0.04);
  face(d, rng, sideOf(LOFT), 1, 14, PLANK, 'none', 0.4);
  roof(d, rng, LOFT, 14, 'z', STRAW, 'thatch', PLANK, {
    o: 3.5,
    end: (_, s) => {
      const hole = crisp(quad(s, 7, -11, 19, 6), 2);
      d.pen.fill(hole, HOLE, 0.92);
      // Hay heaped in the loft door and hanging over its sill.
      const hay = [s(6, -11.5), s(20, -11.5), s(19.5, -8), s(16.5, -5), s(13.5, -4.2), s(10, -5.4), s(7, -7.5)];
      paint(d, hay, '#d9b862', { shadow: 0.45, hatch: 0, line: 0.6 });
      d.pen.clipped(hay, () => {
        for (let i = 0; i < 70; i++) {
          const q = s(6 + rng() * 14, -11.5 + rng() * 7);
          d.pen.hair([q, pt(q.x + (rng() - 0.5) * 3, q.y + 1 + rng() * 2)], 0.4, rng() < 0.5 ? '#a5823a' : '#f2e2a4', 0.8);
        }
      });
      for (let i = 0; i < 8; i++) {
        const q = s(7 + rng() * 12, -11.5);
        d.pen.hair([q, pt(q.x + (rng() - 0.5) * 2, q.y + 2 + rng() * 3)], 0.45, '#c9a050', 0.9);
      }
      d.pen.stroke(closed(hole), 0.7, d.ink, 0.9);
    },
  });
  // The hoist beam out over the loft door, its rope and hook.
  const a = P(-2, LOFT.z0, 55);
  const b = P(-2, LOFT.z0 - 14, 55);
  beam(d, a, b, 2.6, TIMBER, 0.6);
  d.pen.stroke([pt(b.x + 0.4, b.y + 1), pt(b.x + 0.6, b.y + 16)], 0.6, '#8a7a5a', 1, false);
  d.pen.stroke([pt(b.x + 0.6, b.y + 16), pt(b.x + 1.8, b.y + 17.5), pt(b.x + 0.6, b.y + 19)], 0.8, IRON, 1, false);
}

function barn(d: Draw, rng: Rng): void {
  const at = frontOf(BARN);
  const w = BARN.x1 - BARN.x0;
  face(d, rng, sideOf(BARN), BARN.z1 - BARN.z0, 30, PLANK, 'plank', 0.4);
  face(d, rng, at, w, 30, PLANK, 'plank', 0.05);
  // A stone plinth along the foot of the walls.
  face(d, rng, at, w, 5, STONE, 'stone', 0.08);
  face(d, rng, sideOf(BARN), BARN.z1 - BARN.z0, 5, STONE, 'stone', 0.42);
  // Corner posts and the wall plate.
  for (const u of [0, w]) beam(d, at(u, 4), at(u, 30), 3, TIMBER_DARK, 0.6);
  beam(d, at(0, 29), at(w, 29), 2.6, TIMBER_DARK, 0.6);
  roof(d, rng, BARN, 30, 'x', STRAW, 'thatch', PLANK, { o: 4 });
}

function stables(d: Draw, rng: Rng): void {
  barn(d, rng);
  loft(d, rng);
  const at = frontOf(BARN);
  stallDoor(d, at, 9, 18, true);
  stallDoor(d, at, 42, 18, false);
  stallDoor(d, at, 76, 18, true);
  horse(d, rng, at(16, 13.4), BAY, '#3a2418', 1.25);
  horse(d, rng, at(83, 13.4), GREY, '#6a6670', 1.2);
  // Dapples on the grey.
  for (let i = 0; i < 6; i++) {
    const q = at(80 + rng() * 5, 15 + rng() * 7);
    d.pen.dot(q.x, q.y, 0.7, mix(GREY, SHADOW, 0.25), 0.5);
  }
  // A horseshoe over the shut stall, a saddle on its door.
  const hs = at(51, 28.5);
  d.pen.stroke(Array.from({ length: 9 }, (_, i) => pt(hs.x + Math.cos(Math.PI * (0.1 + i * 0.1)) * 2.4, hs.y + 1 - Math.sin(Math.PI * (0.1 + i * 0.1)) * 2.8)), 1, '#b9bcc6', 1, false);
  yard(d, rng);
}

/** The yard before the stables: a water trough, a hay bale, a pitchfork leant on the wall, a bucket. */
function yard(d: Draw, rng: Rng): void {
  const trough: Box = { x0: 18, x1: 42, z0: -5, z1: 1, h0: 0, h1: 7 };
  solid(d, rng, trough, mix(PLANK, SHADOW, 0.05), 'plank', false);
  const water = crisp([P(trough.x0 + 1, trough.z0 + 1, 6.4), P(trough.x1 - 1, trough.z0 + 1, 6.4), P(trough.x1 - 1, trough.z1 - 0.6, 6.4), P(trough.x0 + 1, trough.z1 - 0.6, 6.4)], 2);
  const rimTop = crisp([P(trough.x0, trough.z0, 7), P(trough.x1, trough.z0, 7), P(trough.x1, trough.z1, 7), P(trough.x0, trough.z1, 7)], 2);
  flat(d, rimTop, PLANK, { tone: -0.2, line: 0.6 });
  paint(d, water, '#6f8fb0', { shadow: 0.25, hatch: 0, line: 0.5, gloss: true });
  gleam(d, [P(trough.x0 + 4, trough.z0 + 2.4, 6.4), P(trough.x0 + 14, trough.z0 + 2.8, 6.4)], 0.7, 0.8);
  for (const x of [20, 40]) beam(d, P(x, -5, 0), P(x, -5, 7.5), 1.8, TIMBER_DARK, 0.5);
  // A hay bale, tied.
  const bale: Box = { x0: -70, x1: -54, z0: -2, z1: 8, h0: 0, h1: 9 };
  for (const [surf, w, tone] of [[sideOf(bale), 10, 0.35], [frontOf(bale), 16, 0.05]] as const) {
    const s = crisp(quad(surf, 0, 0, w, 9), 2);
    flat(d, s, '#d9b862', { tone, line: 0.6 });
    straw(d, rng, surf, w, 9, s, '#d9b862');
  }
  const top = crisp([P(bale.x0, bale.z0, 9), P(bale.x1, bale.z0, 9), P(bale.x1, bale.z1, 9), P(bale.x0, bale.z1, 9)], 2);
  flat(d, top, '#e4c878', { tone: -0.2, line: 0.6 });
  for (const x of [-66, -58]) d.pen.stroke([P(x, -2, 0), P(x, -2, 9), P(x, 8, 9)], 0.7, '#7a5a30', 1, false);
  // The pitchfork against the wall.
  d.pen.stroke([P(-44, 6, 0), P(-40, 7, 28)], 1, TIMBER, 1, false);
  const f = P(-44, 6, 0);
  for (let k = -1; k <= 1; k++) d.pen.stroke([pt(f.x + k * 1.2, f.y - 1), pt(f.x + k * 1.6, f.y + 2.5)], 0.6, IRON, 1, false);
  // A bucket.
  barrel(d, P(48, -2), 3.2, 5, mix(OAK, PLANK, 0.3));
  d.pen.stroke(bezier(P(44.8, -2, 5), pt(P(48, -2, 9).x, P(48, -2, 9).y), P(51.2, -2, 5), 6), 0.5, IRON, 1, false);
}

function stablesGround(d: Draw, rng: Rng): void {
  groundShadow(d, -10, 2, 70, 8, 0.24);
  throwShadow(d, 40, 8, 40, 22);
  earth(d, rng, [P(-76, -10), P(56, -10), P(56, 10), P(-72, 10)], '#b89d74', 0.55);
  dab(d, blob(P(30, -7), 14, 3, rng), '#8a7a6a', 0.2, 2);
  tufts(d, rng, -74, -64, 2, 3);
  tufts(d, rng, 52, 60, -4, 2);
}

export const TRADES_B: Readonly<Record<'marketplace' | 'stables', TownDrawer>> = {
  marketplace: paintIn('marketplace', market, marketGround),
  stables: paintIn('stables', stables, stablesGround),
};
