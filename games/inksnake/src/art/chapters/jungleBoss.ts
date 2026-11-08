import { bezier, closed, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze, hairs } from '../critters/preyKit';
import { tube, tufted } from '../critters/tomcatParts';
import { along, clumps, fingers, grizzle, type Leg, makeLeg, paintFur, type Pelt, resample, softShadow, trunkShape } from './barrensCrittersBeast';
import { mongooseHead, paintMongooseHead } from './jungleBossHead';
import { MONGOOSE, MONGOOSE_POSES, type MongoosePose, type Spec, SPECS, TRUNK } from './jungleBossParts';

/**
 * The Grey Mongoose (Herpestes edwardsii), chapter 9's boss, seen from
 * above facing +x: a slim, long, low mongoose in a coarse coat finely
 * grizzled grey and buff, a pointed head with red-brown eyes, short dark
 * legs, and a long bushy tail tapering to a pale tip (poses as listed in
 * jungle.ts): it bounds round the snake, tail streaming ('run0', 'run1'),
 * feints in low and wheels away ('feint'), staggers off balance ('wobble'),
 * crouches bristling ('crouch'), lunges with its jaws wide ('dart'), sits
 * up on its haunches to stare at a spread hood ('stare'), and springs back
 * bottle-brushed when struck ('startle').
 */
const M = MONGOOSE;
const FRAME = 150;

const PELT: Pelt = { base: M.base, deep: M.deep, light: M.light, hair: (_p, r) => grizzle(M.dark, M.base, M.pale, M.warm, 0.32)(r) };
const LEG_PELT: Pelt = { base: M.leg, deep: M.legDark, light: M.base, hair: (_p, r) => (r < 0.45 ? M.legDark : r < 0.8 ? M.leg : M.rufous) };

/** The tail's width along it: bushy from a thick root, tapering to a point. */
const tailWidth = (s: Spec) => (u: number): number => s.tailW * (0.78 + 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.3))) * (1 - 0.8 * u ** 1.5) + 0.8;

/** The long bushy tail: grizzled grey, its fur lying back, the last fifth pale; bottle-brushed when it bristles. */
function paintTail(d: Draw, s: Spec): Pt[] {
  const spine = s.tail as Pt[];
  const n = spine.length - 1;
  const shape = tufted(resample(tube(spine, tailWidth(s)), 1.3), 0.45 + s.puff * 1.8, 2);
  paintFur(d, PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI + (s.puff > 0.5 ? (along(spine, p).i % 2 ? 0.5 : -0.5) * s.puff : 0),
    wet: () => {
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const p = spine[i]!;
        glaze(d, p.x, p.y, 3.2, 2.2, along(spine, p).ang, u > 0.72 ? M.tip : u < 0.5 ? M.deep : M.base, u > 0.72 ? 0.95 : 0.3);
      }
    },
    hair: (p, r) => (along(spine, p).i / n > 0.72 ? (r < 0.7 ? M.tip : M.pale) : PELT.hair(p, r)),
    n: 520 + Math.round(s.puff * 300), len: 2.8 + s.puff * 1.6, seed: 9501, tuft: 1.8 + s.puff * 1.4, line: 0.7,
  });
  return shape;
}

/** A small dark paw with short claws; held up to the chest only the paw shows. */
function paw(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x, l.c.y + u.y, l.front ? 1.8 : 2.4, 1.6, l.ang, 14);
  d.pen.fill(sole, M.legDark, 1);
  d.pen.stroke(closed(sole), 0.4, d.ink, 0.9, false);
  fingers(d, pt(l.c.x + u.x * 2.2, l.c.y + u.y * 2.2), l.ang, 1.4, [1.1, 1.4, 1.5, 1.4, 1.1], 0.8, M.legDark, M.claw);
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 110, len: 1.7, seed: 9520 + k, tuft: 0.8, line: 0.6 });
  paw(d, l);
}

/** The coat: grizzled grey-buff, darker down the spine, paler low on the flanks; bristling, it breaks into locks. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 16) * (1 + s.puff * 0.6) + Math.PI;
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -6 * s.sx, s.bend * 0.3, 24 * s.sx, 4.5 * s.sy, 0, M.deep, 0.45);
      for (const side of [-1, 1]) glaze(d, -4 * s.sx, side * 7.5 * s.sy + s.bend * 0.3, 20 * s.sx, 2.6, 0, M.pale, 0.5);
      glaze(d, 12 * s.sx, 0, 8 * s.sx, 5 * s.sy, 0, M.warm, 0.25);
    },
    hair: (p, r) => {
      const v = Math.max(0, 1 - Math.abs(p.y - s.bend * 0.3) / (7 * s.sy));
      const dark = 0.12 + 0.3 * v;
      return r < dark ? M.dark : r < dark + 0.3 * (1 - v * 0.5) ? M.pale : r < 0.92 ? M.base : M.warm;
    },
    over: () => clumps(d, shape, lie, 160 + Math.round(s.puff * 160), 9503, 3 + s.puff * 1.5, M.dark, M.pale, () => 0.5),
    n: 1100, len: 2.6 + s.puff, seed: 9502, tuft: 1.2 + s.puff * 1.2, line: 0.8,
  });
}

/** The coat running on over the nape: grizzled hairs laid across the join of head and neck. */
function nape(d: Draw, s: Spec): void {
  const C = s.head;
  const patch = ellipseAt(C.x - 6, C.y, 2.6, 4.4, 0, 16);
  d.pen.fill(patch, M.base, 0.7);
  hairs(d, ellipseAt(C.x - 6, C.y, 3.4, 4.8, 0, 16), { dir: (p) => Math.PI + (p.y - C.y) * 0.1, color: (p, r) => PELT.hair(p, r) }, 70, 9510, 2.2, 0.35, 0.8);
}

/** Speed lines streaming off behind it. */
function streaks(d: Draw, s: Spec, len: number): void {
  for (const [y, x0, l, a] of [[-9, -24, 1, 0.5], [9, -22, 0.8, 0.45], [-4, -32, 0.6, 0.35], [4, -34, 0.7, 0.35]] as const) {
    const p = pt(x0 * s.sx, y * s.sy + s.bend);
    d.pen.hair([p, pt(p.x - len * l * 0.5, p.y), pt(p.x - len * l, p.y + Math.sign(y) * 0.5)], 0.6, d.ink, a);
  }
}

/** Off balance: little sway arcs either side of it, and a curl of dizziness over its head. */
function sway(d: Draw, s: Spec): void {
  for (const side of [-1, 1]) {
    for (const [x, r] of [[2, 15], [-14, 16]] as const) {
      const c = pt(x, s.bend * 0.3);
      d.pen.hair(Array.from({ length: 6 }, (_, i) => {
        const a = side * (Math.PI / 2) - 0.45 + (i / 5) * 0.9;
        return pt(c.x + Math.cos(a) * r * 0.8, c.y + Math.sin(a) * r);
      }), 0.6, d.ink, 0.55);
    }
  }
  const C = s.head;
  d.pen.hair(Array.from({ length: 14 }, (_, i) => {
    const a = (i / 13) * Math.PI * 3.2;
    const r = 1 + i * 0.32;
    return pt(C.x - 1 + Math.cos(a) * r, C.y - 11 + Math.sin(a) * r * 0.7);
  }), 0.5, d.ink, 0.7);
}

/** Fright jolts bursting out round it. */
function jolts(d: Draw): void {
  for (const [a, r] of [[-2.3, 26], [-1.6, 22], [-0.7, 27], [0.7, 28], [1.6, 23], [2.35, 26]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-2.4, 0, 2.4]) {
      const b = pt(u.x * (r - Math.abs(o) * 0.6) * 1.2 + v.x * o, u.y * (r - Math.abs(o) * 0.6) + v.y * o);
      const len = o === 0 ? 5.5 : 3.6;
      d.pen.stroke([b, pt(b.x + u.x * len, b.y + u.y * len)], 0.75, d.ink, 0.8, false);
    }
  }
}

/** The forepaws held to its chest as it sits up: two small dark paws under the chin. */
function heldPaws(d: Draw, s: Spec): void {
  for (const side of [-1, 1]) {
    const c = pt(s.head.x - 1.6, s.head.y + side * 5.6);
    const p = ellipseAt(c.x, c.y, 1.8, 1.4, side * 0.4, 12);
    d.pen.fill(p.map((q) => pt(q.x + 0.5, q.y + 0.8)), d.ink, 0.25);
    d.pen.fill(p, M.legDark, 1);
    d.pen.hair(bezier(pt(c.x + 1.2, c.y - side * 0.9), pt(c.x + 1.9, c.y), pt(c.x + 1.2, c.y + side * 0.9), 4), 0.35, M.claw, 0.9);
    d.pen.stroke(closed(p), 0.4, d.ink, 0.9, false);
  }
}

function draw(d: Draw, pose: MongoosePose): void {
  const s = SPECS[pose];
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.4 + s.puff * 1.2);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 3.8 : 4.8, i >= 2 ? 2.2 : 2.6));
  const shown = s.tucked ? legs.slice(0, 2) : legs;
  const head = mongooseHead(s.head, s.snout, s.gape);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(s.shift.x, s.shift.y);
  softShadow(d, [tube(s.tail as Pt[], tailWidth(s)), trunk, head, ...shown.map((l) => l.limb)], pt(2.2, 3.2), pose === 'startle' ? 0.12 : 0.17, 1.3);
  if (pose === 'run1' || pose === 'dart' || pose === 'feint') streaks(d, s, pose === 'dart' ? 16 : 11);
  paintTail(d, s);
  shown.forEach((l, i) => paintLeg(d, l, i));
  shown.forEach((l) => d.pen.clipped(l.limb, () => d.pen.fill(trunk.map((q) => pt(q.x + 1.2, q.y + 2)), M.deep, 0.35)));
  paintBody(d, s, trunk);
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.3, q.y + 2)), M.deep, 0.32));
  paintMongooseHead(d, s.head, s.snout, s.gape, s.eyes, pose === 'crouch' || pose === 'dart' || pose === 'startle');
  nape(d, s);
  if (s.tucked) heldPaws(d, s);
  if (pose === 'wobble') sway(d, s);
  if (pose === 'startle') jolts(d);
  ctx.restore();
}

const ART: SpriteArt<MongoosePose> = { frame: FRAME, res: 2, poses: MONGOOSE_POSES, draw };

/** The Grey Mongoose's drawings. */
export const MONGOOSE_ART: SpriteArt | undefined = ART;
