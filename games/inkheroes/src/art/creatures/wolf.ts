import { closed, makeDraw, oval, pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { chain, fur, limb, locks, tufted } from './beastFur';
import { dab, finished, groundShadow, paint, SHADOW } from './beastPaint';
import type { CreatureDrawer } from './types';
import { WOLF, wolfHead } from './wolfHead';

/**
 * The Wolf: a big grey timber wolf stalking forward, head lowered and
 * snarling, hackles up in a thick ruff. A dark umber saddle over a grey
 * coat, buff legs and a cream chest, the fur laid in with directional pen
 * strokes; near fore reaching, near hind driving back. About 95 long and
 * 50 at the raised ruff, origin on the ground under its middle.
 */
const SEED = 4000;
const LEG = '#a58f6c';

/** The torso from the tail root round the back, ruff, chest and belly, its edges tufted where the coat grows long. */
function torso(): Pt[] {
  const t = (edge: Pt[], len: number, every: number, rake: Pt, seed: number, skip = 0.15): Pt[] => tufted(edge, { len, every, rake, side: 1, seed: SEED + seed, skip });
  const back = t(chain(pt(-36, -46), [pt(-28, -48.6), pt(-16, -50), pt(-4, -50.6)], [pt(4, -51.4), pt(10, -53), pt(15, -54)]), 1.2, 3.4, pt(-0.8, 0), 1, 0.55);
  const ruff = t(chain(pt(15, -54), [pt(21, -56), pt(27, -54.6), pt(31.6, -50)]), 3.4, 2.4, pt(-0.9, -0.1), 2);
  const neck = chain(pt(31.6, -50), [pt(33.5, -46), pt(34.4, -41), pt(34.4, -37.5)]);
  const chest = t(chain(pt(34.4, -37.5), [pt(34, -32), pt(30, -26.6), pt(21, -24)]), 3, 2.3, pt(-0.3, 0.7), 3);
  const belly = t(chain(pt(21, -24), [pt(11, -24.6), pt(0, -27), pt(-12, -31.6)]), 2.4, 2.6, pt(-0.5, 0.5), 4, 0.25);
  const rump = t(chain(pt(-12, -31.6), [pt(-24, -28.6), pt(-38, -28), pt(-41, -36)], [pt(-42, -41), pt(-40, -44.6), pt(-36, -46)]), 1.8, 2.8, pt(-0.5, 0.4), 5, 0.3);
  return [...back, ...ruff.slice(1), ...neck.slice(1), ...chest.slice(1), ...belly.slice(1), ...rump.slice(1, -1)];
}

/** Hair flow over the torso: back and a little down on the saddle, down the flanks, straight down the chest. */
function coatFlow(x: number, y: number): number {
  if (x > 16) return Math.PI / 2 + 0.35;
  return y < -43 ? Math.PI - 0.2 : Math.PI - 0.75;
}

function paintTorso(d: Draw, body: readonly Pt[]): void {
  paint(d, body, WOLF.grey, { shadow: 0.45, hatch: 0, line: 0 });
  d.pen.clipped(body, () => {
    // The saddle: dark along the back, darkest at the hackles and loin.
    dab(d, [pt(-42, -51), pt(10, -59), pt(30, -55), pt(30, -47), pt(16, -45), pt(-6, -43.6), pt(-30, -41), pt(-42, -41)], WOLF.saddle, 0.85, 2.4);
    dab(d, [pt(-6, -43), pt(14, -45), pt(24, -41), pt(18, -35), pt(-2, -35)], WOLF.tan, 0.3, 2.4);
    // A cream chest and pale belly.
    dab(d, [pt(36, -41), pt(26, -37), pt(18, -30), pt(6, -27), pt(-12, -30), pt(-12, -23), pt(30, -19), pt(38, -27)], WOLF.cream, 0.85, 2);
    fur(d, body, { flow: coatFlow, count: 300, len: 2.6, width: 0.32, color: WOLF.saddle, alpha: 0.8, seed: SEED + 10, keep: (x, y) => (y < -42 ? 0.95 : x > 16 ? 0.12 : 0.4) });
    fur(d, body, { flow: coatFlow, count: 130, len: 2.4, width: 0.3, color: mix(WOLF.grey, WOLF.umber, 0.5), alpha: 0.7, seed: SEED + 11, keep: (_, y) => (y > -43 ? 0.8 : 0.2) });
    fur(d, body, { flow: coatFlow, count: 110, len: 2.2, width: 0.32, color: PAPER_FILL, alpha: 0.6, seed: SEED + 12, keep: (x, y) => (y < -45 && x < 20 ? 0.15 : x > 18 ? 0.5 : 0.04) });
    // Core shadow under the barrel.
    dab(d, [pt(-24, -36), pt(0, -33), pt(20, -30), pt(24, -19), pt(-24, -21)], SHADOW, 0.28, 2.2);
  });
  locks(d, chain(pt(15, -54), [pt(21, -56), pt(27, -54.6), pt(31.6, -50)]), { every: 2, len: 3, rake: pt(-0.8, 0.1), side: 1, width: 0.35, color: WOLF.saddle, alpha: 0.85, seed: SEED + 13 });
  locks(d, chain(pt(34.4, -37.5), [pt(34, -32), pt(30, -26.6), pt(21, -24)]), { every: 2, len: 2.6, rake: pt(-0.3, 0.7), side: 1, width: 0.3, color: WOLF.umber, alpha: 0.6, seed: SEED + 14 });
  d.pen.stroke(closed(body), 0.8, d.ink, 0.95);
}

/** A paw at ground x: a heel pad behind, the toes bunched forward, short dark claws. */
function paw(d: Draw, x: number, color: string): void {
  const p = chain(pt(x - 2.2, -3.6), [pt(x - 0.5, -4.4), pt(x + 2.4, -3.8), pt(x + 3.8, -1.8)], [pt(x + 4.6, -0.5), pt(x + 3.4, 0.3), pt(x + 1, 0.3)], [pt(x - 1.4, 0.3), pt(x - 2.9, -0.6), pt(x - 2.2, -3.6)]);
  paint(d, p, color, { shadow: 0.55, hatch: 0, line: 0.5 });
  for (const k of [0.7, 1.9, 3]) d.pen.hair([pt(x + k - 0.6, -2.8), pt(x + k, -0.5)], 0.28, d.ink, 0.7);
  for (const k of [1.6, 2.8, 3.9]) d.pen.hair([pt(x + k, -0.5), pt(x + k + 0.7, 0.2)], 0.4, WOLF.nose, 0.9);
}

/** A leg from its top joint to the ground: one tapered shape, grey above and tan below, a dark stripe down its front, feathered behind. */
function leg(d: Draw, joints: readonly Pt[], widths: readonly number[], far: boolean, seed: number): void {
  const dim = (c: string): string => (far ? mix(c, SHADOW, 0.32) : c);
  const shape = limb(joints, widths);
  paint(d, shape, dim(LEG), { shadow: 0.85, hatch: far ? 0.1 : 0.22, line: 0 });
  const top = joints[0]!;
  const fore = top.x > 0;
  d.pen.clipped(shape, () => {
    dab(d, oval(top.x - 1, top.y + 5, widths[0]! * 0.8, 9, 12), dim(WOLF.grey), 0.85, 2);
    fur(d, shape, { flow: () => Math.PI / 2 + 0.15, count: 60, len: 1.8, width: 0.28, color: WOLF.saddle, alpha: 0.7, seed: SEED + seed, keep: (_, y) => (y < top.y + 12 ? 0.9 : 0.3) });
  });
  if (fore) d.pen.stroke(joints.slice(1, -1).map((p, i) => pt(p.x + widths[i + 1]! * 0.32, p.y)), 0.9, dim(WOLF.saddle), 0.7, false);
  d.pen.stroke(closed(shape), 0.6, d.ink, 0.9);
  const foot = joints[joints.length - 1]!;
  paw(d, foot.x, dim(mix(LEG, WOLF.buff, 0.2)));
}

/** The near hind's thigh: muscled, over the flank, its back edge furred into the silhouette. */
function nearThigh(d: Draw): Pt[] {
  const top = chain(pt(-33, -47), [pt(-26, -46.6), pt(-18, -41), pt(-17.6, -33)]);
  const rest = tufted(chain(pt(-17.6, -33), [pt(-17.4, -27), pt(-22, -21.6), pt(-28, -22)], [pt(-34, -23), pt(-41, -26), pt(-43, -32)], [pt(-44, -38), pt(-41, -44), pt(-33, -47)]), {
    len: 1.7, every: 2.6, rake: pt(-0.4, 0.5), side: 1, seed: SEED + 30, skip: 0.35,
  });
  const thigh = [...top, ...rest.slice(1, -1)];
  paint(d, thigh, mix(WOLF.grey, WOLF.saddle, 0.15), { shadow: 0.5, hatch: 0.12, line: 0 });
  d.pen.clipped(thigh, () => {
    dab(d, [pt(-24, -31), pt(-16, -31), pt(-18, -19), pt(-28, -19)], WOLF.buff, 0.45, 1.8);
    dab(d, [pt(-44, -34), pt(-30, -26), pt(-20, -22), pt(-30, -18), pt(-46, -24)], SHADOW, 0.22, 2);
  });
  // Only its front and lower edges are drawn: the rest melts into the coat.
  d.pen.stroke(chain(pt(-22, -44.6), [pt(-17.4, -40), pt(-17, -31), pt(-18.6, -26)], [pt(-20, -23), pt(-24, -21.6), pt(-28, -22)]), 0.5, d.ink, 0.45, false);
  return thigh;
}

/** The near shoulder over the chest, covering the foreleg's top; its lower edge a fringe of fur. */
function nearShoulder(d: Draw): Pt[] {
  const front = chain(pt(13, -49), [pt(20, -50), pt(27, -44), pt(28.4, -37)]);
  const rest = tufted(chain(pt(28.4, -37), [pt(29, -31), pt(26, -27), pt(21, -25.6)], [pt(16, -26), pt(11.4, -32), pt(10.6, -38)], [pt(10.2, -43), pt(11, -47), pt(13, -49)]), {
    len: 2, every: 2.2, rake: pt(-0.4, 0.7), side: 1, seed: SEED + 41, skip: 0.2,
  });
  const shoulder = [...front, ...rest.slice(1, -1)];
  paint(d, shoulder, mix(WOLF.grey, WOLF.buff, 0.35), { shadow: 0.5, hatch: 0.1, line: 0 });
  d.pen.clipped(shoulder, () => dab(d, [pt(8, -40), pt(30, -40), pt(30, -22), pt(8, -22)], WOLF.cream, 0.35, 2.4));
  d.pen.stroke(chain(pt(21, -48), [pt(26, -45), pt(28.6, -40), pt(28.4, -35)]), 0.55, d.ink, 0.7, false);
  locks(d, chain(pt(28.4, -37), [pt(29, -31), pt(26, -27), pt(21, -25.6)], [pt(16, -26), pt(11.4, -32), pt(10.6, -38)]), { every: 2.2, len: 2, rake: pt(-0.3, 0.6), side: 1, width: 0.32, color: WOLF.umber, alpha: 0.7, seed: SEED + 40 });
  return shoulder;
}

/** One coat over torso, thigh and shoulder: the saddle and the hair laid across their seams, so they read as one animal. */
function coat(d: Draw, parts: readonly (readonly Pt[])[]): void {
  for (const [i, part] of parts.entries()) {
    d.pen.clipped(part, () => {
      dab(d, [pt(-46, -52), pt(10, -60), pt(30, -56), pt(30, -46), pt(16, -44), pt(-6, -42.6), pt(-30, -39), pt(-46, -38)], WOLF.saddle, 0.75, 2.6);
      fur(d, part, { flow: (x, y) => (x > 18 ? Math.PI / 2 + 0.4 : y < -42 ? Math.PI - 0.2 : Math.PI - 0.9), count: i === 0 ? 120 : 70, len: 2.4, width: 0.3, color: WOLF.saddle, alpha: 0.7, seed: SEED + 60 + i, keep: (_, y) => (y < -40 ? 0.9 : 0.35) });
      fur(d, part, { flow: () => Math.PI - 0.35, count: 50, len: 2, width: 0.32, color: PAPER_FILL, alpha: 0.55, seed: SEED + 70 + i, keep: (x, y) => (y < -47 && x < 20 ? 0.25 : 0.02) });
    });
  }
}

/** The tail: a full brush hanging low behind, dark-tipped. */
function tail(d: Draw): void {
  const spine = chain(pt(-34, -45.6), [pt(-42, -43.6), pt(-48, -37), pt(-49.6, -29)], [pt(-50.4, -24), pt(-50.6, -19), pt(-49.6, -15)]);
  const brush = tufted(closed(ribbon(spine, (u) => 3.6 + 8.6 * Math.sin(Math.PI * Math.min(1, u * 1.15))).shape), { len: 1.9, every: 2.4, rake: pt(-0.2, 0.7), side: 1, seed: SEED + 50, skip: 0.2 });
  paint(d, brush, WOLF.grey, { shadow: 0.6, hatch: 0.12, line: 0 });
  d.pen.clipped(brush, () => {
    dab(d, [pt(-36, -51), pt(-46, -45), pt(-48, -37), pt(-44, -37), pt(-34, -41)], WOLF.saddle, 0.7, 1.6);
    dab(d, oval(-49.6, -16, 5, 5, 14), WOLF.nose, 0.85, 1.4);
    dab(d, [pt(-46, -35), pt(-44, -27), pt(-46, -23), pt(-48, -31)], WOLF.buff, 0.6, 1.2);
    fur(d, brush, { flow: (x, y) => Math.atan2(y > -37 ? 1 : 0.4, x > -44 ? -1 : -0.25), count: 120, len: 2.6, width: 0.3, color: WOLF.saddle, alpha: 0.75, seed: SEED + 51 });
  });
  d.pen.stroke(closed(brush), 0.75, d.ink, 0.9);
}

/** The wolf, back to front: far legs, tail, torso, near legs, head. */
function wolf(d: Draw): void {
  leg(d, [pt(12, -31), pt(12, -20), pt(10.6, -9.5), pt(12.6, -3)], [8, 5.6, 3.4, 3.1], true, 20);
  leg(d, [pt(-13, -30), pt(-18, -21), pt(-24.6, -12.6), pt(-20, -3)], [8, 6, 3.4, 3], true, 21);
  tail(d);
  const body = torso();
  paintTorso(d, body);
  leg(d, [pt(-21, -27), pt(-28, -21), pt(-36.5, -13), pt(-40.4, -3)], [9, 7, 3.6, 3.2], false, 22);
  const thigh = nearThigh(d);
  leg(d, [pt(21, -31), pt(23.4, -21), pt(28.6, -10), pt(32.4, -3)], [8.6, 6.2, 3.8, 3.4], false, 23);
  const shoulder = nearShoulder(d);
  coat(d, [body, thigh, shoulder]);
  d.pen.ctx.save();
  d.pen.ctx.translate(0, -5);
  wolfHead(d);
  d.pen.ctx.restore();
}

export const drawWolf: CreatureDrawer = (ctx, seed, f) => {
  const ground = makeDraw(ctx, seed + f, f, 0);
  finished(ctx, { line: 0.85, rim: 0.6 }, () => groundShadow(ground, -4, 48, 3.2), (layer) => wolf(makeDraw(layer, seed + f, f, 0)));
};
