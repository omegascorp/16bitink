import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, type Draw, pt, TAU } from '../kit';
import { INK } from '../palette';
import type { SpriteArt } from '../types';
import { onLayer } from '../critters/tomcatKit';
import { paintJagHead } from './floodedBossHead';
import { type Jag, jaguar, JAG_POSES, type JagPose } from './floodedBossParts';
import { JAG, paintBody, paintLeg, paintTail } from './floodedBossPaint';
import { bubble, film, rings, wake, WATER } from './floodedCrittersKit';

/**
 * The Jaguar, chapter 10's boss, from above facing +x: a heavy golden cat
 * covered in rosettes, with a big broad head. It prowls the banks ('walk0',
 * 'walk1'), sinks low at the edge with its tail-tip twitching ('crouch'),
 * stretches out in the air as it leaps into the water ('leap'), swims with
 * its head up, paddling ('swim0', 'swim1'), shakes itself off ('shake'),
 * bends its head down to lap at the water (the open moment: 'drink'), lifts
 * its head with its ears pricked ('look') and springs back with its ears
 * flat ('startle').
 */
const FRAME = 180;

function shadow(d: Draw, c: Jag): void {
  if (c.swim) return;
  const air = c.pose === 'leap';
  const off = air ? pt(8, 12) : pt(2.6, 3.8);
  const parts = [c.tail.shape, ...c.legs.map((l) => l.limb), c.trunk, c.head];
  onLayer(d, (l) => parts.forEach((s) => l.pen.fill(s.map((q) => pt(q.x + off.x, q.y + off.y)), INK, 1)), air ? 0.09 : 0.17, air ? 2.6 : 1.3);
}

/** Air rushing past the flanks in the leap. */
function whoosh(d: Draw): void {
  for (const side of [-1, 1]) {
    for (const [y, x0, len, a] of [[22, -10, 30, 0.55], [26, -30, 22, 0.4], [14, -50, 18, 0.35]] as const) {
      const p = pt(x0, side * y);
      d.pen.hair(bezier(p, pt(p.x - len * 0.5, p.y + side * 0.8), pt(p.x - len, p.y + side * 2), 6), 0.8, d.ink, a);
    }
  }
}

/** The tail's tip twitching: little ticks either side of it. */
function twitch(d: Draw, c: Jag): void {
  const e = c.tail.spine[c.tail.spine.length - 1]!;
  const p = c.tail.spine[c.tail.spine.length - 3]!;
  const a = Math.atan2(e.y - p.y, e.x - p.x);
  for (const s of [-1, 1]) {
    for (const [r, al] of [[7, 0.75], [10.5, 0.5]] as const) {
      const arc = Array.from({ length: 6 }, (_, i) => polar(e, a + s * (0.9 + (i / 5) * 0.9), r));
      d.pen.hair(arc, 0.7, d.ink, al);
    }
  }
}

/** Little arcs by each ear: listening. */
function listening(d: Draw, c: Jag): void {
  for (const s of [-1, 1]) {
    const tip = polar(c.C, s * 2.1, 15);
    const out = s * 2.1;
    for (const [r, al] of [[4, 0.7], [7, 0.45]] as const) {
      d.pen.hair(Array.from({ length: 7 }, (_, i) => polar(tip, out - 0.8 + (i / 6) * 1.6, r)), 0.65, d.ink, al);
    }
  }
}

/** Fright jolts bursting out round the startled cat. */
function jolts(d: Draw): void {
  for (const [a, r] of [[-2.5, 52], [-1.7, 40], [-0.8, 44], [0.8, 45], [1.7, 41], [2.5, 52]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-3.5, 0, 3.5]) {
      const b = pt(u.x * (r - Math.abs(o) * 0.6) * 1.15 + v.x * o, u.y * (r - Math.abs(o) * 0.6) + v.y * o);
      const len = o === 0 ? 8 : 5;
      d.pen.stroke([b, pt(b.x + (u.x + v.x * o * 0.05) * len, b.y + (u.y + v.y * o * 0.05) * len)], 0.9, d.ink, 0.8, false);
    }
  }
}

/** Shaking off: drops flung out all round, arcs of motion by the head and the haunches. */
function spray(d: Draw, c: Jag): void {
  const rng = createRng(1120 + d.f * 17);
  for (let i = 0; i < 34; i++) {
    const a = rng() * TAU;
    const r = 26 + rng() * 34;
    const q = pt(-6 + Math.cos(a) * r * 1.25, Math.sin(a) * r);
    const l = 2 + rng() * 4;
    d.pen.hair([polar(q, a + Math.PI, l), q], 0.6, WATER.lit, 0.7);
    d.pen.dot(q.x, q.y, 0.7 + rng() * 0.9, WATER.lit, 0.95);
    d.pen.dot(q.x + 0.4, q.y + 0.6, 0.5, WATER.deep, 0.25);
  }
  for (const [cx, cy, r] of [[c.C.x + 2, c.C.y, 17], [-30, 0, 22]] as const) {
    for (const s of [-1, 1]) d.pen.hair(Array.from({ length: 8 }, (_, i) => polar(pt(cx, cy), s * (1.1 + (i / 7) * 0.9), r)), 0.8, d.ink, 0.55);
  }
}

/** Swimming: the legs paddle dimly under the surface, the water laps along the flanks, rings and a wake. */
function swimming(d: Draw, c: Jag, paint: () => void): void {
  rings(d, pt(4, 0), 46, 26, 2, 1130, 0.5);
  wake(d, pt(c.C.x + c.snout * 1.2 + 2, c.C.y), 46, 34, 0.5);
  onLayer(d, (l) => {
    c.legs.forEach((g, i) => paintLeg(l, g, i));
    l.pen.ctx.globalCompositeOperation = 'source-atop';
    c.legs.forEach((g) => l.pen.fill(g.limb, WATER.murk, 0.55));
  }, 0.55, 0.8);
  paint();
  // The water over the flanks: only a strip of the back stays dry.
  d.pen.clipped(c.trunk, () => {
    for (const s of [-1, 1]) d.pen.fill([pt(34, s * 7), pt(34, s * 30), pt(-44, s * 30), pt(-44, s * 7)], WATER.murk, 0.42);
  });
  film(d, c.tail.shape, 0.4, 1131);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const x = 24 - i * 9;
      const y = s * (12 + (i % 2) * 2);
      d.pen.hair([pt(x, y), pt(x - 6, y + s * 1.5)], 0.8, WATER.lit, 0.7);
    }
  }
  bubble(d, pt(-44, 9), 1.2);
}

function draw(d: Draw, pose: JagPose): void {
  const c = jaguar(pose);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.shift.x, c.shift.y);
  shadow(d, c);
  if (pose === 'leap') whoosh(d);
  const body = (): void => {
    paintTail(d, c);
    if (!c.swim) c.legs.forEach((l, i) => paintLeg(d, l, i));
    // The body's shadow over the legs beneath it.
    if (!c.swim) c.legs.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(c.trunk.map((q) => pt(q.x + 1.6, q.y + 2.4)), JAG.deep, 0.4)));
    paintBody(d, c);
    d.pen.clipped(c.trunk, () => d.pen.fill(c.head.map((q) => pt(q.x + 1.6, q.y + 2.4)), JAG.deep, 0.35));
  };
  if (c.swim) swimming(d, c, body);
  else body();
  paintJagHead(d, c);
  if (pose === 'crouch') twitch(d, c);
  if (pose === 'look') listening(d, c);
  if (pose === 'startle') jolts(d);
  if (pose === 'shake') spray(d, c);
  ctx.restore();
}

const ART: SpriteArt<JagPose> = { frame: FRAME, res: 2, poses: JAG_POSES, draw };

/** The Jaguar, chapter 10's boss (poses listed in flooded.ts). */
export const JAGUAR_ART: SpriteArt | undefined = ART;
