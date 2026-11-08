import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { glaze } from '../critters/preyKit';
import { softShadow } from './barrensCrittersBeast';
import { boar, type Boar, BOAR_POSES, type BoarPose } from './mountainsBossParts';
import { BOAR, headPt, mane, paintBody, paintEar, paintHead, paintLeg, paintTail } from './mountainsBossPaint';

/**
 * The Wild Boar, chapter 7's boss, seen from above facing +x: a heavy
 * wedge of bristly dark grizzled coat with a black mane down its spine, a
 * long snout ending in its flat disc, ivory tusks, small mean eyes and
 * black trotters. It potters along ('walk0', 'walk1'), roots with its snout
 * in the soil, turning it over ('root'), gives the tell before it charges
 * (head low, a forefoot scraping back, the mane bristling: 'paw'), charges
 * flat out, head down ('charge0' gathered, 'charge1' stretched), stands
 * dazed after running into rock, its head swaying ('dazed'), and jumps back
 * squealing from a strike ('startle'). No blood: it's only ever stung.
 */
const FRAME = 170;

const SOIL = { loam: '#5e4a38', deep: '#3a2d22', lit: '#8a7258', stone: '#b7ad9a' } as const;

/** Turned-over soil round the snout: dark loam heaved up in clods, pebbles, a few roots. */
function turnedSoil(d: Draw, b: Boar, over: boolean): void {
  const { pen } = d;
  const rng = createRng(over ? 8205 : 8201);
  const tip = headPt(b, 12.5 + b.snout, 0);
  if (!over) {
    glaze(d, tip.x - 2, tip.y, 16, 13, 0, SOIL.loam, 0.75);
    glaze(d, tip.x + 2, tip.y, 9, 8, 0, SOIL.deep, 0.6);
  }
  for (let i = 0; i < (over ? 9 : 16); i++) {
    const a = rng() * TAU;
    const r = (over ? 4 : 6) + rng() * (over ? 9 : 12);
    const c = pt(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r * 0.9);
    const clod = blob(c, 1 + rng() * 2, 0.8 + rng() * 1.5, rng, 0.35, 9, rng() * TAU);
    pen.fill(clod.map((p) => pt(p.x + 0.6, p.y + 0.9)), d.ink, 0.25);
    pen.fill(clod, rng() < 0.5 ? SOIL.loam : SOIL.deep, 0.95);
    pen.dot(c.x - 0.4, c.y - 0.5, 0.5, SOIL.lit, 0.7);
    if (rng() < 0.3) pen.dot(c.x + 2, c.y + 1, 0.6, SOIL.stone, 0.9);
  }
  if (!over) {
    for (let i = 0; i < 4; i++) {
      const p = pt(tip.x - 4 + rng() * 10, tip.y + (rng() - 0.5) * 18);
      pen.hair(bezier(p, pt(p.x + 2, p.y + 2), pt(p.x + 4, p.y + (rng() - 0.5) * 4), 5), 0.4, '#a08a6a', 0.75);
    }
  }
}

/** The scrape: furrows raked back from the pawing forefoot, and a puff of dust off them. */
function scrape(d: Draw, b: Boar): void {
  const { pen } = d;
  const l = b.legs[2]!;
  for (let i = 0; i < 4; i++) {
    const p = pt(l.c.x - 2 - i * 0.6, l.c.y - 2 + i * 1.6);
    pen.hair([p, pt(p.x - 12 - i * 2, p.y + 1 + i * 0.5)], 0.9, SOIL.deep, 0.5);
    pen.hair([pt(p.x, p.y - 0.8), pt(p.x - 11 - i * 2, p.y + 0.2 + i * 0.5)], 0.5, SOIL.lit, 0.4);
  }
  for (let i = 0; i < 5; i++) glaze(d, l.c.x - 16 - i * 4, l.c.y + 1 + i * 1.5, 5 + i, 4 + i * 0.6, 0, '#b8a787', 0.35 - i * 0.05);
}

/** Dust kicked up behind a charge, and speed lines streaming off the flanks. */
function chargeDust(d: Draw, b: Boar): void {
  const { pen } = d;
  const rng = createRng(8210);
  for (let i = 0; i < 10; i++) {
    const c = pt(-44 - rng() * 30, (rng() - 0.5) * 44);
    const r = 5 + rng() * 7;
    glaze(d, c.x, c.y, r * 1.2, r, 0, '#b8a787', 0.35);
    glaze(d, c.x - r * 0.3, c.y - r * 0.3, r * 0.6, r * 0.5, 0, '#e3d8c2', 0.35);
    if (rng() < 0.5) pen.hair(Array.from({ length: 6 }, (_, j) => pt(c.x + Math.cos(2.4 + j * 0.4) * r, c.y + Math.sin(2.4 + j * 0.4) * r * 0.8)), 0.4, d.ink, 0.25);
  }
  for (const s of [-1, 1]) {
    for (const [y, x0, len] of [[24, -10, 26], [20, -30, 20], [26, 10, 16]] as const) {
      const p = pt(x0 * b.sx, s * y * b.sy);
      pen.hair([p, pt(p.x - len, p.y + s * 1.2)], 0.7, d.ink, 0.5);
    }
  }
}

/** Jolts bursting out round it as it jumps back, and the squeal's lines from its open mouth. */
function jolts(d: Draw, b: Boar): void {
  const { pen } = d;
  for (const [a, r] of [[-2.5, 44], [-1.7, 34], [-0.8, 46], [0.8, 46], [1.7, 34], [2.5, 44]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    for (const o of [-3, 0, 3]) {
      const v = pt(-u.y, u.x);
      const p = pt(u.x * r * 1.1 + v.x * o, u.y * r + v.y * o);
      pen.stroke([p, pt(p.x + u.x * (o === 0 ? 7 : 4.5), p.y + u.y * (o === 0 ? 7 : 4.5))], 0.9, d.ink, 0.8, false);
    }
  }
  const tip = headPt(b, 12.5 + b.snout + 3, 0);
  for (const [dy, len] of [[-5, 7], [0, 9], [5, 7]] as const) {
    const p = pt(tip.x + 1, tip.y + dy);
    pen.hair(bezier(p, pt(p.x + len * 0.5, p.y + dy * 0.6 + 1.2), pt(p.x + len, p.y + dy * 1.2 - 0.8), 6), 0.7, d.ink, 0.75);
  }
}

/** A dazed sway: little wobble arcs either side of its head. */
function wobble(d: Draw, b: Boar): void {
  for (const s of [-1, 1]) {
    const c = headPt(b, 6, s * 19);
    const arc = Array.from({ length: 7 }, (_, i) => pt(c.x - 5 + i * 1.7, c.y + s * Math.sin((i / 6) * Math.PI) * 2.2));
    d.pen.hair(arc, 0.6, d.ink, 0.6);
  }
}

function draw(d: Draw, pose: BoarPose): void {
  const b = boar(pose);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(pose === 'charge1' ? -10 : -6, 0);
  const air = pose === 'charge1' || pose === 'startle';
  const parts: Pt[][] = [b.body, b.head, ...b.legs.map((l) => l.limb), ...b.ears.map((e) => e.shape)];
  if (pose === 'root') turnedSoil(d, b, false);
  if (pose === 'paw') scrape(d, b);
  if (pose === 'charge0' || pose === 'charge1') chargeDust(d, b);
  softShadow(d, parts, air ? pt(4, 6) : pt(2.6, 3.8), air ? 0.13 : 0.2, 1.6);
  paintTail(d, b);
  b.legs.forEach((l, i) => paintLeg(d, l, i));
  b.legs.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(b.body.map((q) => pt(q.x + 1.6, q.y + 2.4)), BOAR.deep, 0.45)));
  paintBody(d, b);
  d.pen.clipped(b.body, () => d.pen.fill(b.head.map((q) => pt(q.x + 1.6, q.y + 2.4)), BOAR.deep, 0.4));
  paintHead(d, b);
  mane(d, b);
  b.ears.forEach((e) => d.pen.clipped(b.head, () => d.pen.fill(e.shape.map((q) => pt(q.x + 1.2, q.y + 1.8)), BOAR.deep, 0.35)));
  b.ears.forEach((e, i) => paintEar(d, e, i));
  if (pose === 'root') turnedSoil(d, b, true);
  if (pose === 'dazed') wobble(d, b);
  if (pose === 'startle') jolts(d, b);
  ctx.restore();
}

/** The Wild Boar's drawings. */
const ART: SpriteArt<BoarPose> = { frame: FRAME, res: 2, poses: BOAR_POSES, draw };
export const BOAR_ART: SpriteArt | undefined = ART;
