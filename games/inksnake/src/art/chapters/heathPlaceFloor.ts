import type { Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { distTo, keepsOf, perArea } from '../places/farmKit';
import { frond } from './barrensPlaceFrond';
import type { Board } from './heathPlaceGround';
import {
  BIRCH_LEAF, BIRCH_LEAF_LIT, BIRCH_YELLOW, dots, GRASS, GRASS_DEEP, GRASS_LIT, H, LICHEN, LICHEN_DEEP, LICHEN_YELLOW, type Mark, markShadows, MOSS, MOSS_LIT, SHADE,
  strokeMarks, W,
} from './heathPlaceKit';

/**
 * The small things on the Heath's floor: tussocks of wavy hair-grass round
 * the clearings, grey-green cushions of reindeer lichen on the bare sand,
 * moss in the heather's gaps, tormentil's little yellow flowers, bracken
 * fronds reaching in from the board's edges (last year's rust in spring,
 * green later), and in a corner the birch scrub: its dappled shade from
 * out of the picture, its fallen leaves, a seedling or two.
 */

/** A grass tussock at p: fine blades fanning out from a tight base, their shadows. */
function tussock(d: Draw, p: Pt, s: number, rng: Rng): void {
  const dark: Mark[] = [];
  const mid: Mark[] = [];
  const lit: Mark[] = [];
  const lean = rng() * TAU;
  for (let i = 0; i < 16 + s * 2; i++) {
    const a = rng() < 0.5 ? lean + (rng() - 0.5) * 2 : rng() * TAU;
    const m: Mark = [p.x + (rng() - 0.5) * 2.5, p.y + (rng() - 0.5) * 2.5, a, s * (0.5 + rng() * 0.7), (rng() - 0.5) * s * 0.5];
    (rng() < 0.3 ? dark : rng() < 0.6 ? mid : lit).push(m);
  }
  markShadows(d, [...dark, ...mid, ...lit], 0.2, 0.9, 1.6);
  strokeMarks(d, dark, GRASS_DEEP, 0.85, 0.6);
  strokeMarks(d, mid, GRASS, 0.85, 0.55);
  strokeMarks(d, lit, GRASS_LIT, 0.85, 0.5);
}

/** A cushion of reindeer lichen: a pale grey-green knot of fine branches, shaded on its far side, stippled. */
function lichen(d: Draw, p: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(p, s, s * 0.85, rng, 0.3, 14, rng() * TAU);
  pen.fill(shape.map((q) => pt(q.x + SHADOW.x * s * 0.4, q.y + SHADOW.y * s * 0.4)), d.ink, 0.16);
  pen.fill(shape, PAPER_FILL, 0.8);
  pen.fill(shape, LICHEN, 0.85);
  pen.crescent(shape, pt(-SHADOW.x * s * 0.5, -SHADOW.y * s * 0.5), () => pen.fill(shape, LICHEN_DEEP, 0.5));
  pen.stipple(shape, Math.round(s * s * 1.6), () => 0.8, 0.35, rng() < 0.2 ? LICHEN_YELLOW : LICHEN_DEEP);
  pen.stipple(shape, Math.round(s * s), (x, y) => (x + y < p.x + p.y ? 0.9 : 0.2), 0.3, PAPER_FILL);
  pen.hair(closed(shape), 0.35, d.ink, 0.4);
}

/** A cushion of moss: a soft green wash, its lit crown, a stipple of capsules. */
function moss(d: Draw, p: Pt, s: number, rng: Rng): void {
  const shape = blob(p, s, s * 0.8, rng, 0.35, 14, rng() * TAU);
  d.pen.fill(shape, MOSS, 0.6);
  d.pen.crescent(shape, pt(SHADOW.x * s * 0.4, SHADOW.y * s * 0.4), () => d.pen.fill(shape, MOSS_LIT, 0.55));
  d.pen.stipple(shape, Math.round(s * s * 0.8), () => 0.7, 0.3, '#3d5226');
}

/** Tormentil: four small yellow petals on a thread of stem. */
function tormentil(d: Draw, p: Pt, rng: Rng): void {
  const turn = rng() * TAU;
  for (let i = 0; i < 4; i++) {
    const q = polar(p, turn + (i * TAU) / 4, 1.1);
    d.pen.fill(oval(q.x, q.y, 1, 1, 8), '#f0c63a', 0.95);
  }
  d.pen.dot(p.x, p.y, 0.45, '#c0811e', 0.9);
}

/** A fallen birch leaf: small, toothed, yellowing, its shadow. */
function birchLeaf(d: Draw, p: Pt, rng: Rng): void {
  const a = rng() * TAU;
  const l = 4 + rng() * 2;
  const tip = polar(p, a, l);
  const n = pt(-Math.sin(a) * l * 0.42, Math.cos(a) * l * 0.42);
  const mid = polar(p, a, l * 0.4);
  const shape = [p, pt(mid.x + n.x, mid.y + n.y), tip, pt(mid.x - n.x, mid.y - n.y)];
  d.pen.fill(shape.map((q) => pt(q.x + 0.8, q.y + 1.1)), d.ink, 0.14);
  d.pen.fill(shape, rng() < 0.6 ? BIRCH_YELLOW : BIRCH_LEAF, 0.9);
  d.pen.hair([p, tip], 0.3, '#7a5a2a', 0.6);
  d.pen.hair(closed(shape), 0.3, d.ink, 0.45);
}

/** A birch seedling: a red-brown twig with a few small leaves, fresh green. */
function seedling(d: Draw, p: Pt, rng: Rng): void {
  const a = rng() * TAU;
  const end = polar(p, a, 10 + rng() * 6);
  d.pen.hair([p, pt((p.x + end.x) / 2 + 1, (p.y + end.y) / 2), end], 0.7, '#6e3a26', 0.9);
  for (let i = 0; i < 5; i++) {
    const at = polar(p, a, 3 + i * 2.6);
    const la = a + (i % 2 ? 1 : -1) * (0.9 + rng() * 0.4);
    const l = 4.5 + rng() * 2;
    const tip = polar(at, la, l);
    const n = pt(-Math.sin(la) * l * 0.4, Math.cos(la) * l * 0.4);
    const mid = polar(at, la, l * 0.42);
    const leaf = [at, pt(mid.x + n.x, mid.y + n.y), tip, pt(mid.x - n.x, mid.y - n.y)];
    d.pen.fill(leaf.map((q) => pt(q.x + 1.3, q.y + 1.9)), d.ink, 0.16);
    d.pen.fill(leaf, i % 3 === 0 ? BIRCH_LEAF_LIT : BIRCH_LEAF, 0.92);
    d.pen.hair(closed(leaf), 0.32, d.ink, 0.55);
  }
}

/** The birch scrub off the corner `k` (0: top left, clockwise): its dappled shade, leaves fallen, a seedling or two. */
function birchCorner(d: Draw, k: number, ok: (p: Pt) => boolean, rng: Rng): void {
  const c = [pt(-20, -20), pt(W + 20, -20), pt(W + 20, H + 20), pt(-20, H + 20)][k]!;
  for (let i = 0; i < 26; i++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * 150);
    d.pen.fill(blob(p, 16 + rng() * 26, 12 + rng() * 18, rng, 0.5, 14, rng() * TAU), SHADE, 0.045);
  }
  for (let i = 0; i < 40; i++) {
    const p = polar(c, rng() * TAU, 30 + rng() * 170);
    if (p.x > 4 && p.y > 4 && p.x < W - 4 && p.y < H - 4 && ok(p)) birchLeaf(d, p, rng);
  }
  for (let i = 0; i < 3; i++) {
    const p = polar(c, rng() * TAU, 50 + rng() * 60);
    if (p.x > 8 && p.y > 8 && p.x < W - 8 && p.y < H - 8 && ok(p)) seedling(d, p, rng);
  }
}

/** Bracken fronds reaching in from the edges, rooted just off the board. */
function bracken(d: Draw, bronze: number, ok: (p: Pt) => boolean, rng: Rng): void {
  let made = 0;
  for (let k = 0; k < 60 && made < 7; k++) {
    const side = Math.floor(rng() * 4);
    const t = rng();
    const base = [pt(t * W, -6), pt(W + 6, t * H), pt(t * W, H + 6), pt(-6, t * H)][side]!;
    const inward = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side]! + (rng() - 0.5) * 0.9;
    const len = 50 + rng() * 40;
    if (!ok(polar(base, inward, len * 0.8))) continue;
    for (let j = 0; j < 2 + Math.floor(rng() * 2); j++) {
      frond(d, polar(base, inward + Math.PI / 2, (rng() - 0.5) * 50), inward + (rng() - 0.5) * 0.6, len * (0.7 + rng() * 0.4), rng, { bronze: Math.min(1, bronze + (rng() - 0.5) * 0.3), lift: 4, keep: ok });
    }
    made++;
  }
}

export function paintHeathFloor(d: Draw, level: LevelDef, board: Board, rng: Rng): void {
  const keeps = keepsOf(level);
  const ok = (p: Pt, room = 4): boolean => keeps.every((k) => distTo(k, p.x, p.y) > room);
  const { busy, field } = board;
  const wet = board.pool;
  // Open sand, but not the pool.
  const open = (x: number, y: number): number => (wet && Math.hypot(x - wet.c.x, y - wet.c.y) < wet.r + 20 ? 0 : board.open(x, y));
  for (let k = 0; k < perArea(900); k++) {
    const p = pt(rng() * W, rng() * H);
    const o = open(p.x, p.y);
    // Grass where the heather gives way to the sand, lichen out on the sand, moss among the heather.
    if (o > 0.15 && o < 0.75 && rng() < 0.07 + busy(p.x, p.y) * 0.4 && ok(p, 8)) tussock(d, p, 5 + rng() * 5, rng);
    else if (o > 0.5 && rng() < 0.03 + busy(p.x, p.y) * 0.12 && ok(p, 6)) lichen(d, p, 2.5 + rng() * 4, rng);
    else if (field(p.x, p.y) > 0.5 && rng() < 0.04 && ok(p, 2)) moss(d, p, 3 + rng() * 5, rng);
    else if (field(p.x, p.y) > 0.25 && rng() < 0.05) tormentil(d, p, rng);
  }
  const grit = Array.from({ length: perArea(1500) }, () => [rng() * W, rng() * H, 0.6 + rng() * 0.9] as const).filter(([x, y]) => open(x, y) > 0.5);
  dots(d, grit.map(([x, y, r]) => [x + 0.5, y + 0.7, r] as const), d.ink, 0.18);
  dots(d, grit, '#e9e4d8', 0.9);
  bracken(d, 1 - board.look.green, (p) => ok(p, 10), rng);
  for (const k of board.look.birch) birchCorner(d, k, (p) => ok(p, 6), rng);
}
