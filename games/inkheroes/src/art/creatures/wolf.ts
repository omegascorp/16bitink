import { closed, makeDraw, oval, pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { chain, fur, limb, locks, tufted } from './beastFur';
import { dab, finished, groundShadow, paint, SHADOW } from './beastPaint';
import { compose, place, posed, reach, translate, turn, turnAt } from './beastRig';
import type { CreatureDrawer } from './types';
import { WOLF, wolfHead } from './wolfHead';
import { bodyWarp, LEGS, wolfPose, type LegId, type WolfPose } from './wolfRig';

/**
 * The Wolf: a lean dire wolf stalking forward, shoulders and head carried
 * low and level with the back, snarling, hackles up in a thick ruff. A
 * near-black saddle over a dark brindled grey-umber coat, dusky legs and a
 * dull pale throat, the fur laid in with directional pen strokes and lit
 * warm along the back; near fore reaching, near hind driving back. About 95 long and
 * 50 at the raised ruff, origin on the ground under its middle.
 *
 * Every part is painted in its rest place and carried into the pose (see
 * wolfRig): the body by a warp that flexes the back, the legs by IK from
 * their sockets to the paws, the head and tail turned at their roots.
 */
const SEED = 4000;
const LEG = '#5e5040';

type Warp = (p: Pt) => Pt;

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

const TORSO = torso();

/** Hair flow over the torso: back and a little down on the saddle, down the flanks, straight down the chest. */
function coatFlow(x: number, y: number): number {
  if (x > 16) return Math.PI / 2 + 0.35;
  return y < -43 ? Math.PI - 0.2 : Math.PI - 0.75;
}

function paintTorso(d: Draw, m: Warp): Part {
  const M = (pts: readonly Pt[]): Pt[] => pts.map(m);
  const body = M(TORSO);
  paint(d, body, WOLF.grey, { shadow: 0.45, hatch: 0, line: 0 });
  d.pen.clipped(body, () => {
    // The saddle: dark along the back, darkest at the hackles and loin.
    dab(d, M([pt(-42, -51), pt(10, -59), pt(30, -55), pt(30, -47), pt(16, -45), pt(-6, -43.6), pt(-30, -41), pt(-42, -41)]), WOLF.saddle, 0.85, 2.4);
    dab(d, M([pt(-6, -43), pt(14, -45), pt(24, -41), pt(18, -35), pt(-2, -35)]), WOLF.tan, 0.3, 2.4);
    // A cream chest and pale belly.
    dab(d, M([pt(36, -41), pt(26, -37), pt(18, -30), pt(6, -27), pt(-12, -30), pt(-12, -23), pt(30, -19), pt(38, -27)]), WOLF.cream, 0.85, 2);
    fur(d, TORSO, { map: m, flow: coatFlow, count: 300, len: 2.6, width: 0.32, color: WOLF.saddle, alpha: 0.8, seed: SEED + 10, keep: (x, y) => (y < -42 ? 0.95 : x > 16 ? 0.12 : 0.4) });
    fur(d, TORSO, { map: m, flow: coatFlow, count: 130, len: 2.4, width: 0.3, color: mix(WOLF.grey, WOLF.umber, 0.5), alpha: 0.7, seed: SEED + 11, keep: (_, y) => (y > -43 ? 0.8 : 0.2) });
    fur(d, TORSO, { map: m, flow: coatFlow, count: 110, len: 2.2, width: 0.32, color: WOLF.lit, alpha: 0.55, seed: SEED + 12, keep: (x, y) => (y < -45 && x < 20 ? 0.15 : x > 18 ? 0.5 : 0.04) });
    // Brindling: dark streaks raked down the flanks, tawny between them.
    const streak = (x: number, y: number): number => 0.5 + 0.5 * Math.sin(x * 0.62 + y * 0.34);
    const flank = (x: number, y: number): boolean => y > -48 && x < 20 && x > -40;
    fur(d, TORSO, { map: m, flow: coatFlow, count: 160, len: 3, width: 0.36, color: WOLF.saddle, alpha: 0.8, seed: SEED + 15, keep: (x, y) => (flank(x, y) && streak(x, y) > 0.6 ? 0.95 : 0) });
    fur(d, TORSO, { map: m, flow: coatFlow, count: 90, len: 2.4, width: 0.3, color: WOLF.tan, alpha: 0.55, seed: SEED + 16, keep: (x, y) => (flank(x, y) && streak(x, y) < 0.3 ? 0.9 : 0) });
    // Core shadow under the barrel.
    dab(d, M([pt(-24, -36), pt(0, -33), pt(20, -30), pt(24, -19), pt(-24, -21)]), SHADOW, 0.28, 2.2);
  });
  locks(d, chain(pt(15, -54), [pt(21, -56), pt(27, -54.6), pt(31.6, -50)]), { map: m, every: 2, len: 3, rake: pt(-0.8, 0.1), side: 1, width: 0.35, color: WOLF.saddle, alpha: 0.85, seed: SEED + 13 });
  locks(d, chain(pt(34.4, -37.5), [pt(34, -32), pt(30, -26.6), pt(21, -24)]), { map: m, every: 2, len: 2.6, rake: pt(-0.3, 0.7), side: 1, width: 0.3, color: WOLF.umber, alpha: 0.6, seed: SEED + 14 });
  d.pen.stroke(closed(body), 0.8, d.ink, 0.95);
  return [TORSO, m];
}

/** A paw at its joint, curled by `tilt`: a heel pad behind, the toes bunched forward, short dark claws. */
function paw(d: Draw, at: Pt, tilt: number, color: string): void {
  const m = (q: Pt): Pt => {
    const r = turn(q, pt(0, -3), tilt);
    return pt(r.x + at.x, r.y + at.y + 3);
  };
  const M = (pts: readonly Pt[]): Pt[] => pts.map(m);
  const p = chain(pt(-2.2, -3.6), [pt(-0.5, -4.4), pt(2.4, -3.8), pt(3.8, -1.8)], [pt(4.6, -0.5), pt(3.4, 0.3), pt(1, 0.3)], [pt(-1.4, 0.3), pt(-2.9, -0.6), pt(-2.2, -3.6)]);
  paint(d, M(p), color, { shadow: 0.55, hatch: 0, line: 0.5 });
  for (const k of [0.7, 1.9, 3]) d.pen.hair(M([pt(k - 0.6, -2.8), pt(k, -0.5)]), 0.28, d.ink, 0.7);
  for (const k of [1.6, 2.8, 3.9]) d.pen.hair(M([pt(k, -0.5), pt(k + 0.7, 0.2)]), 0.4, WOLF.nose, 0.9);
}

/** Lengths of the IK bones: a shade longer than at rest, so the joints keep a little bend. */
const BONE = 1.06;

/** A leg posed from its socket to its paw: the wrist or hock set off the paw by the curl, the elbow or knee by IK. */
function legJoints(id: LegId, top: Pt, p: WolfPose): Pt[] {
  const [t0, m0, w0, f0] = LEGS[id].joints as [Pt, Pt, Pt, Pt];
  const { x, y, tilt } = p.paws[id];
  const pastern = turn(pt(w0.x - f0.x, w0.y - f0.y), pt(0, 0), tilt);
  const l1 = Math.hypot(m0.x - t0.x, m0.y - t0.y) * BONE;
  const l2 = Math.hypot(w0.x - m0.x, w0.y - m0.y) * BONE;
  const r = reach(top, pt(x + pastern.x, y + pastern.y), l1, l2, LEGS[id].bow);
  return [top, r.mid, r.end, pt(r.end.x - pastern.x, r.end.y - pastern.y)];
}

/** A leg from its top joint to the ground: one tapered shape, grey above and tan below, a dark stripe down its front, feathered behind. */
function leg(d: Draw, id: LegId, joints: readonly Pt[], tilt: number): void {
  const { widths, far, fore, seed } = LEGS[id];
  const dim = (c: string): string => (far ? mix(c, SHADOW, 0.32) : c);
  const shape = limb(joints, widths);
  paint(d, shape, dim(LEG), { shadow: 0.85, hatch: far ? 0.1 : 0.22, line: 0 });
  const top = joints[0]!;
  const down = Math.atan2(joints[1]!.y - top.y, joints[1]!.x - top.x);
  // Hair runs down each bone.
  const along = (x: number, y: number): number => {
    let best = 0;
    for (let i = 1; i < joints.length - 1; i++) if (Math.hypot(joints[i]!.x - x, joints[i]!.y - y) < Math.hypot(joints[best]!.x - x, joints[best]!.y - y)) best = i;
    const a = joints[best]!;
    const b = joints[best + 1]!;
    return Math.atan2(b.y - a.y, b.x - a.x) + 0.15;
  };
  d.pen.clipped(shape, () => {
    const upper = oval(0, 0, 9, widths[0]! * 0.8, 12).map((q) => {
      const r = turn(q, pt(0, 0), down);
      return pt(r.x + top.x - 1 + Math.cos(down) * 5, r.y + top.y + Math.sin(down) * 5);
    });
    dab(d, upper, dim(WOLF.grey), 0.85, 2);
    fur(d, shape, { flow: along, count: 60, len: 1.8, width: 0.28, color: WOLF.saddle, alpha: 0.7, seed: SEED + seed, keep: (x, y) => (Math.hypot(x - top.x, y - top.y) < 12 ? 0.9 : 0.3) });
  });
  if (fore) {
    // The dark stripe down the front of the foreleg, off to the leading side of each joint.
    const stripe = joints.slice(1, -1).map((q, i) => {
      const a = joints[i]!;
      const b = joints[i + 2]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const k = widths[i + 1]! * 0.32;
      return pt(q.x - ((b.y - a.y) / l) * k, q.y + ((b.x - a.x) / l) * k);
    });
    d.pen.stroke(stripe, 0.9, dim(WOLF.saddle), 0.7, false);
  }
  d.pen.stroke(closed(shape), 0.6, d.ink, 0.9);
  paw(d, joints[joints.length - 1]!, tilt, dim(mix(LEG, WOLF.buff, 0.2)));
}

/** The near hind's thigh: muscled, over the flank, its back edge furred into the silhouette. */
function nearThigh(d: Draw, m: Warp): Part {
  const M = (pts: readonly Pt[]): Pt[] => pts.map(m);
  const top = chain(pt(-33, -47), [pt(-26, -46.6), pt(-18, -41), pt(-17.6, -33)]);
  const rest = tufted(chain(pt(-17.6, -33), [pt(-17.4, -27), pt(-22, -21.6), pt(-28, -22)], [pt(-34, -23), pt(-41, -26), pt(-43, -32)], [pt(-44, -38), pt(-41, -44), pt(-33, -47)]), {
    len: 1.7, every: 2.6, rake: pt(-0.4, 0.5), side: 1, seed: SEED + 30, skip: 0.35,
  });
  const shape = [...top, ...rest.slice(1, -1)];
  const thigh = M(shape);
  paint(d, thigh, mix(WOLF.grey, WOLF.saddle, 0.15), { shadow: 0.5, hatch: 0.12, line: 0 });
  d.pen.clipped(thigh, () => {
    dab(d, M([pt(-24, -31), pt(-16, -31), pt(-18, -19), pt(-28, -19)]), WOLF.buff, 0.45, 1.8);
    dab(d, M([pt(-44, -34), pt(-30, -26), pt(-20, -22), pt(-30, -18), pt(-46, -24)]), SHADOW, 0.22, 2);
  });
  // Only its front and lower edges are drawn: the rest melts into the coat.
  d.pen.stroke(M(chain(pt(-22, -44.6), [pt(-17.4, -40), pt(-17, -31), pt(-18.6, -26)], [pt(-20, -23), pt(-24, -21.6), pt(-28, -22)])), 0.5, d.ink, 0.45, false);
  return [shape, m];
}

/** The near shoulder over the chest, covering the foreleg's top; its lower edge a fringe of fur. */
function nearShoulder(d: Draw, m: Warp): Part {
  const M = (pts: readonly Pt[]): Pt[] => pts.map(m);
  const front = chain(pt(13, -49), [pt(20, -50), pt(27, -44), pt(28.4, -37)]);
  const rest = tufted(chain(pt(28.4, -37), [pt(29, -31), pt(26, -27), pt(21, -25.6)], [pt(16, -26), pt(11.4, -32), pt(10.6, -38)], [pt(10.2, -43), pt(11, -47), pt(13, -49)]), {
    len: 2, every: 2.2, rake: pt(-0.4, 0.7), side: 1, seed: SEED + 41, skip: 0.2,
  });
  const shape = [...front, ...rest.slice(1, -1)];
  const shoulder = M(shape);
  paint(d, shoulder, mix(WOLF.grey, WOLF.buff, 0.35), { shadow: 0.5, hatch: 0.1, line: 0 });
  d.pen.clipped(shoulder, () => dab(d, M([pt(8, -40), pt(30, -40), pt(30, -22), pt(8, -22)]), WOLF.cream, 0.35, 2.4));
  d.pen.stroke(M(chain(pt(21, -48), [pt(26, -45), pt(28.6, -40), pt(28.4, -35)])), 0.55, d.ink, 0.7, false);
  locks(d, chain(pt(28.4, -37), [pt(29, -31), pt(26, -27), pt(21, -25.6)], [pt(16, -26), pt(11.4, -32), pt(10.6, -38)]), { map: m, every: 2.2, len: 2, rake: pt(-0.3, 0.6), side: 1, width: 0.32, color: WOLF.umber, alpha: 0.7, seed: SEED + 40 });
  return [shape, m];
}

/** A part as painted at rest, and the warp that carries it into the pose. */
type Part = readonly [readonly Pt[], Warp];

/** One coat over torso, thigh and shoulder: the saddle and the hair laid across their seams, so they read as one animal. */
function coat(d: Draw, body: Warp, parts: readonly Part[]): void {
  const saddle = [pt(-46, -52), pt(10, -60), pt(30, -56), pt(30, -46), pt(16, -44), pt(-6, -42.6), pt(-30, -39), pt(-46, -38)].map(body);
  for (const [i, [rest, m]] of parts.entries()) {
    d.pen.clipped(rest.map(m), () => {
      dab(d, saddle, WOLF.saddle, 0.75, 2.6);
      // The sun on the round of the shoulder and the haunch.
      for (const [x, y, rx, ry] of [[18, -47, 8, 4], [-30, -43, 9, 4.4]] as const) dab(d, oval(x, y, rx, ry, 14).map(body), mix(WOLF.grey, WOLF.lit, 0.45), 0.35, 2.6);
      fur(d, rest, { map: m, flow: (x, y) => (x > 18 ? Math.PI / 2 + 0.4 : y < -42 ? Math.PI - 0.2 : Math.PI - 0.9), count: i === 0 ? 120 : 70, len: 2.4, width: 0.3, color: WOLF.saddle, alpha: 0.7, seed: SEED + 60 + i, keep: (_, y) => (y < -40 ? 0.9 : 0.35) });
      fur(d, rest, { map: m, flow: () => Math.PI - 0.35, count: 50, len: 2, width: 0.32, color: WOLF.lit, alpha: 0.5, seed: SEED + 70 + i, keep: (x, y) => (y < -47 && x < 20 ? 0.25 : 0.02) });
    });
  }
}

const TAIL_ROOT = pt(-34, -45.6);
const TAIL_LEN = 34;

/** The tail: a full brush hanging low behind, dark-tipped; raised or tucked at the root and curling along its length. */
function tail(d: Draw, body: Warp, p: WolfPose): void {
  const m = (q: Pt): Pt => {
    const u = Math.min(1, Math.hypot(q.x - TAIL_ROOT.x, q.y - TAIL_ROOT.y) / TAIL_LEN);
    return body(turn(q, TAIL_ROOT, p.tailLift + p.tailCurl * u * u));
  };
  const M = (pts: readonly Pt[]): Pt[] => pts.map(m);
  const spine = chain(TAIL_ROOT, [pt(-42, -43.6), pt(-48, -37), pt(-49.6, -29)], [pt(-50.4, -24), pt(-50.6, -19), pt(-49.6, -15)]);
  const rest = tufted(closed(ribbon(spine, (u) => 3.6 + 8.6 * Math.sin(Math.PI * Math.min(1, u * 1.15))).shape), { len: 1.9, every: 2.4, rake: pt(-0.2, 0.7), side: 1, seed: SEED + 50, skip: 0.2 });
  const brush = M(rest);
  paint(d, brush, WOLF.grey, { shadow: 0.6, hatch: 0.12, line: 0 });
  d.pen.clipped(brush, () => {
    dab(d, M([pt(-36, -51), pt(-46, -45), pt(-48, -37), pt(-44, -37), pt(-34, -41)]), WOLF.saddle, 0.7, 1.6);
    dab(d, M(oval(-49.6, -16, 5, 5, 14)), WOLF.nose, 0.85, 1.4);
    dab(d, M([pt(-46, -35), pt(-44, -27), pt(-46, -23), pt(-48, -31)]), WOLF.buff, 0.6, 1.2);
    fur(d, rest, { map: m, flow: (x, y) => Math.atan2(y > -37 ? 1 : 0.4, x > -44 ? -1 : -0.25), count: 120, len: 2.6, width: 0.3, color: WOLF.saddle, alpha: 0.75, seed: SEED + 51 });
  });
  d.pen.stroke(closed(brush), 0.75, d.ink, 0.9);
}

/** A part hinged at `pivot` that follows its leg's swing by `share`: the thigh over the hind, the shoulder over the fore. */
function hinged(body: Warp, id: LegId, pivot: Pt, share: number, p: WolfPose): Warp {
  const top = LEGS[id].joints[0]!;
  const rest = LEGS[id].joints[3]!;
  const at = body(top);
  const paw = p.paws[id];
  const swing = Math.atan2(paw.y - at.y, paw.x - at.x) - turnAt(body, top) - Math.atan2(rest.y - top.y, rest.x - top.x);
  return (q) => body(turn(q, pivot, swing * share));
}

const NECK = pt(33, -44);
/** The head carried nose-down, ready to strike. */
const HEAD_DROP = 0.08;

/** The wolf, back to front: far legs, tail, torso, near legs, head. */
function wolf(d: Draw, p: WolfPose): void {
  const body = bodyWarp(p);
  const thighM = hinged(body, 'nearHind', pt(-30, -40), 0.45, p);
  const shoulderM = hinged(body, 'nearFore', pt(19, -45), 0.45, p);
  const sockets: Record<LegId, Pt> = {
    farFore: hinged(body, 'farFore', pt(12, -45), 0.45, p)(LEGS.farFore.joints[0]!),
    farHind: hinged(body, 'farHind', pt(-22, -40), 0.45, p)(LEGS.farHind.joints[0]!),
    nearHind: thighM(LEGS.nearHind.joints[0]!),
    nearFore: shoulderM(LEGS.nearFore.joints[0]!),
  };
  const drawLeg = (id: LegId): void => leg(d, id, legJoints(id, sockets[id], p), p.paws[id].tilt);
  drawLeg('farFore');
  drawLeg('farHind');
  tail(d, body, p);
  const torsoPart = paintTorso(d, body);
  drawLeg('nearHind');
  const thigh = nearThigh(d, thighM);
  drawLeg('nearFore');
  const shoulder = nearShoulder(d, shoulderM);
  coat(d, body, [torsoPart, thigh, shoulder]);
  // Carried low, level with the back: the hunting stance.
  const head = compose(place(NECK, body(NECK), turnAt(body, NECK) + p.tilt + HEAD_DROP), translate(0, -2.5));
  posed(d, head, () => wolfHead(d, { gape: p.gape, ear: p.ear - 0.22 }));
}

export const drawWolf: CreatureDrawer = (ctx, seed, f, pose) => {
  const p = wolfPose(pose);
  const ground = makeDraw(ctx, seed + f, f, 0);
  finished(ctx, { line: 0.58, rim: 0.65 }, () => groundShadow(ground, -4 + p.bx, 48, 3.2), (layer) => wolf(makeDraw(layer, seed + f, f, 0), p));
};
