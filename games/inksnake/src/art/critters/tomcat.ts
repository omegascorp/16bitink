import { bezier, type Draw, pt } from '../kit';
import { INK } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { CRITTER_POSES, type CritterPose } from './poses';
import { paintHead } from './tomcatHead';
import { FUR } from './tomcatFur';
import { dizzy, onLayer } from './tomcatKit';
import { paintBody, paintEar, paintLeg, paintTail } from './tomcatPaint';
import { type Tom, type TomPose, tom } from './tomcatParts';

/**
 * The Old Tomcat, chapter 1's boss: a big, battle-scarred farm tom seen
 * from above facing +x, a grey-brown mackerel tabby with a white muzzle,
 * bib and socks, a torn ear, a scarred brow and a thick tail kinked near
 * its tip. He stalks low ('walk0', 'walk1'), flattens to pounce with his
 * tail tip flicking ('crouch'), stretches out full length claws first
 * ('leap'), slumps seeing stars ('dazed'), and puffs up like a bottle
 * brush at a fright ('startle').
 */

/** Board px per cat unit: the geometry is drawn in InkGecko's cat units, scaled up. */
const S = 1.38;
const FRAME = 190;

/** The soft shadow under him: further off and fainter in mid-air. */
function shadow(d: Draw, c: Tom): void {
  const air = c.pose === 'leap';
  const off = air ? pt(7, 10) : pt(2.6, 3.6);
  const parts = [c.tail.shape, ...c.legs.flatMap((l) => [l.limb, l.paw]), c.body, c.head, ...c.ears.map((e) => e.shape)];
  onLayer(d, (l) => parts.forEach((s) => l.pen.fill(s.map((q) => pt(q.x + off.x, q.y + off.y)), INK, 1)), air ? 0.1 : 0.16, air ? 2.4 : 1.2);
}

/** Paints the head and ears, turned about the head's centre by its tilt. */
function headGroup(d: Draw, c: Tom): void {
  const { ctx } = d.pen;
  const C = c.headC;
  ctx.save();
  ctx.translate(C.x, C.y);
  ctx.rotate(c.tilt);
  ctx.translate(-C.x, -C.y);
  c.ears.forEach((e, i) => paintEar(d, e, 9501 + i));
  paintHead(d, c);
  ctx.restore();
}

/** Speed lines streaming back past his flanks in the leap. */
function speedLines(d: Draw): void {
  for (const side of [-1, 1]) {
    for (const [y, x0, len, a] of [[19, -8, 30, 0.6], [23, -16, 26, 0.45], [16, -30, 18, 0.5]] as const) {
      const p = pt(x0, side * y);
      d.pen.hair(bezier(p, pt(p.x - len * 0.5, p.y + side * 0.8), pt(p.x - len, p.y + side * 2.2), 6), 0.8, d.ink, a);
    }
  }
}

/** The tell: the haunches wiggling (little ticks beside them) and the tail tip flicking. */
function wiggle(d: Draw, c: Tom): void {
  for (const side of [-1, 1]) {
    for (const [r, a] of [[0, 0.7], [3, 0.45]] as const) {
      const cx = -30 + side * 0;
      d.pen.hair(bezier(pt(cx - 4 - r, side * (21 + r)), pt(cx - 7 - r, side * (17 + r * 0.4)), pt(cx - 6 - r, side * (12 + r * 0.2)), 6), 0.75, d.ink, a);
    }
  }
  const spine = c.tail.spine;
  const tip = spine[spine.length - 1]!;
  for (const [r, a] of [[4, 0.7], [7, 0.45]] as const) {
    const arc = Array.from({ length: 7 }, (_, i) => {
      const t = -0.9 + (i / 6) * 1.6;
      return pt(tip.x - 1 + Math.cos(t + Math.PI) * r * 0.6, tip.y + Math.sin(t + Math.PI) * r);
    });
    d.pen.hair(arc, 0.7, d.ink, a);
  }
}

/** Fright marks: little jolts bursting out round the puffed-up cat. */
function jolts(d: Draw): void {
  for (const [a, r] of [[-2.35, 40], [-1.75, 34], [-0.75, 40], [0.75, 41], [1.75, 35], [2.4, 40]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-3.2, 0, 3.2]) {
      const b = pt(-4 + u.x * (r + Math.abs(o) * -0.6) + v.x * o, u.y * (r + Math.abs(o) * -0.6) * 0.95 + v.y * o);
      const len = o === 0 ? 7 : 4.6;
      d.pen.stroke([b, pt(b.x + (u.x + v.x * o * 0.06) * len, b.y + (u.y + v.y * o * 0.06) * len)], 0.85, d.ink, 0.8, false);
    }
  }
}

function draw(d: Draw, pose: TomPose): void {
  const c = tom(pose, d.f);
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(S, S);
  ctx.translate(c.shift.x, c.shift.y);
  shadow(d, c);
  if (pose === 'leap') speedLines(d);
  // A tail held up in a fright rises over his back; otherwise it lies behind and under.
  const tailOver = pose === 'startle';
  if (!tailOver) paintTail(d, c);
  c.legs.forEach((l, i) => paintLeg(d, l, i));
  c.legs.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(c.body.map((q) => pt(q.x + 1.6, q.y + 2.4)), FUR.deep, 0.4)));
  paintBody(d, c);
  const C = c.headC;
  const turned = (q: Pt): Pt => {
    const [x, y] = [q.x - C.x, q.y - C.y];
    return pt(C.x + x * Math.cos(c.tilt) - y * Math.sin(c.tilt) + 1.6, C.y + x * Math.sin(c.tilt) + y * Math.cos(c.tilt) + 2.4);
  };
  d.pen.clipped(c.body, () => d.pen.fill(c.head.map(turned), FUR.deep, 0.35));
  if (tailOver) {
    d.pen.clipped(c.body, () => d.pen.fill(c.tail.shape.map((q) => pt(q.x + 3, q.y + 4.4)), FUR.deep, 0.35));
    paintTail(d, c);
  }
  headGroup(d, c);
  if (pose === 'crouch') wiggle(d, c);
  if (pose === 'startle') jolts(d);
  if (pose === 'dazed') dizzy(d, pt(C.x + 2, C.y), 17, 24);
  ctx.restore();
}

export const TOMCAT: SpriteArt<CritterPose<'tomcat'>> = { frame: FRAME, res: 2, poses: CRITTER_POSES.tomcat, draw };

