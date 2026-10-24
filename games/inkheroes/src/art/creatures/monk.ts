import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { cast, CROWN, far, head, limb, neck, oval, part, pt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, glow, infantryFigure, SHADOW } from './crownInfantryPaint';
import { carried, carry, idleCarriage, keyed, moved, poseOf, step, strike, TAU, turn, walkCarriage, type Carriage, type Step } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Monk: a bearded, tonsured battle-monk of the Crown in a long cream
 * robe with a deep blue scapular and cowl edged in gold, a knotted rope
 * belt and sandals. He holds a tall staff crowned with a gold sun-ring
 * round a burning orb of holy light, and raises his other hand with a mote
 * of the same light ready to throw. Silhouette: the bell of the robe, the
 * upright staff and its glowing head.
 *
 * Posed: at ease the hem stirs and the light breathes; he walks with the
 * staff rocking in his fist and his feet stepping out under the swinging
 * hem; he casts by drawing the hand back to gather the light (the staff
 * raised), then thrusting the palm out to loose it as a bright orb at t 0.5.
 */

const ROBE = '#ddd0b0';
const BEARD = '#a39684';
const STAFF_X = 15;
const ORB0 = pt(15.8, -85.6);
const PALM0 = pt(21.4, -53.4);
/** Where the far sleeve ends (the wrist), and where the staff fist grips. */
const WRIST0 = pt(16.4, -49.6);
const GRIP0 = pt(14.6, -40.6);
const HIPS = pt(0, -30);
const NECK = pt(2.4, -52.4);

/** Everything the pose decides, in body units under the carriage. */
interface Rig {
  readonly body: Carriage;
  /** The feet: the back and front sandals' steps. */
  readonly feet: readonly [Step, Step];
  /** The hem swung forward by this (at the bottom). */
  readonly hem: number;
  /** The staff moved by (x, y) and turned by `rot` about its grip. */
  readonly staff: Pt;
  readonly staffRot: number;
  /** The raised hand: the palm, its turn, and the wrist. */
  readonly palm: Pt;
  readonly palmRot: number;
  readonly wrist: Pt;
  /** The light: the staff's orb's strength, the mote on the palm (size), and the burst as it's loosed. */
  readonly orb: number;
  readonly mote: number;
  readonly burst: number;
  readonly head: Pt;
  readonly nod: number;
}

const still: Step = { x: 0, lift: 0, tilt: 0 };

function rigOf(pose?: Pose): Rig {
  const { kind, t } = poseOf(pose);
  const a = TAU * t;
  if (kind === 'walk') {
    const body = walkCarriage(t, HIPS, 1.4, 0.03, 0.6);
    const front = step(t, 4.2, 3.2);
    const back = step(t + 0.5, 4.2, 3.2);
    const swing = Math.cos(a);
    return {
      body,
      feet: [back, front],
      hem: 0.6 * front.x - 0.35 * back.x,
      staff: pt(1.6 * swing, -3.4 + 0.6 * Math.abs(swing)),
      staffRot: 0.07 * swing,
      palm: pt(PALM0.x - 1.2 - 1.4 * swing, PALM0.y + 3 + 0.5 * Math.sin(a * 2)),
      palmRot: 0.1,
      wrist: pt(WRIST0.x - 1.2 - 1.2 * swing, WRIST0.y + 2.4),
      orb: 0.85 + 0.15 * Math.sin(a * 2),
      mote: 0.8,
      burst: 0,
      head: pt(0.3, 0.3 * Math.sin(a * 2)),
      nod: 0.03,
    };
  }
  if (kind === 'attack') {
    const body: Carriage = { dx: strike(t, -1.4, 2, 1.4), dy: strike(t, 0.4, 1, 0.8), rot: strike(t, -0.05, 0.08, 0.05), pivot: HIPS };
    const keys = (v: number, w: number, h: number, f: number): number => keyed(t, [[0, v], [0.3, w], [0.5, h], [0.75, f], [1, v]]);
    const palm = pt(keys(PALM0.x, 12.2, 29.6, 27), keys(PALM0.y, -56.4, -55.4, -54.6));
    return {
      body,
      feet: [{ x: strike(t, -0.8, 0, 0), lift: 0, tilt: 0 }, { x: Math.max(0, strike(t, 0, 3, 3)), lift: 0, tilt: 0 }],
      hem: strike(t, -1, 1.6, 1.2),
      staff: pt(strike(t, -1, 1.4, 1), strike(t, -3.4, -3.6, -3)),
      staffRot: strike(t, -0.06, 0.09, 0.06),
      palm,
      palmRot: keys(0, -0.5, 0.15, 0.1),
      wrist: pt(palm.x - 5, palm.y + keys(3.8, 4.6, 1.6, 1.4)),
      orb: keys(1, 1.25, 1.5, 1.1),
      mote: keys(1, 2.2, 0, 0),
      burst: keys(0, 0, 1, 0.35),
      head: pt(strike(t, -0.5, 0.6, 0.4), 0),
      nod: strike(t, -0.04, 0.04, 0.03),
    };
  }
  const body = idleCarriage(t, HIPS, 0.9);
  return {
    body,
    feet: [still, still],
    hem: 0.5 * Math.sin(a + 0.8),
    staff: pt(0, 0),
    staffRot: 0.012 * Math.sin(a + 0.4),
    palm: pt(PALM0.x + 0.3 * Math.sin(a + 1), PALM0.y - 0.5 * Math.sin(a)),
    palmRot: 0,
    wrist: pt(WRIST0.x + 0.15 * Math.sin(a + 1), WRIST0.y - 0.3 * Math.sin(a)),
    orb: 1 + 0.18 * Math.sin(a),
    mote: 1 + 0.25 * Math.sin(a + 1.6),
    burst: 0,
    head: pt(0.25 * Math.sin(a + 1.2), 0.2 * Math.sin(a)),
    nod: 0.015 * Math.sin(a + 0.8),
  };
}

/** A point of the staff (drawn upright at STAFF_X) as the rig holds it. */
const onStaff = (r: Rig, p: Pt): Pt => {
  const q = turn(p, GRIP0, r.staffRot);
  return pt(q.x + r.staff.x, q.y + r.staff.y);
};

/** How far down the robe a point is, for the hem's swing: 0 at the belt, 1 at the hem. */
const below = (y: number): number => Math.max(0, Math.min(1, (y + 34) / 32)) ** 1.3;

/** A robe point, its lower part swung by the hem. */
const hemmed = (r: Rig, p: Pt): Pt => pt(p.x + r.hem * below(p.y), p.y);

/** The sandalled feet peeping out under the hem (in the frame: they stay on the ground). */
function feet(d: Draw, r: Rig): void {
  for (const [x0, back, s] of [[-5, true, r.feet[0]], [8.6, false, r.feet[1]]] as const) {
    moved(d, s.x, -s.lift, s.tilt, pt(x0 + 1, -1.6), () => {
      const x = x0;
      const foot = [pt(x - 1.6, -3.2), pt(x + 2.6, -3), pt(x + 5.4, -1.6), pt(x + 5.6, 0), pt(x - 2, 0)];
      part(d, foot, back ? far(CROWN.skin) : CROWN.skin, { shadow: 0.45, hatch: 0, line: 0.55 });
      d.pen.hair([pt(x + 0.4, -3), pt(x + 2.8, -0.6)], 0.5, CROWN.leatherDark, 0.9);
      d.pen.stroke([pt(x - 2, -0.3), pt(x + 5.6, -0.3)], 0.9, CROWN.leatherDark, 0.95, false);
    });
  }
}

/** The robe: a long bell of cream wool, folded, with the blue scapular down its front and a rope belt. */
function robe(d: Draw, r: Rig): void {
  const h = (pts: readonly Pt[]): Pt[] => pts.map((p) => hemmed(r, p));
  const body = h([pt(-4, -52.6), pt(-9.4, -50), pt(-10.4, -42), pt(-9.4, -34), pt(-11.6, -20), pt(-14.2, -6), pt(-13.4, -2.6), pt(-8, -1.6), pt(-3, -2.8), pt(2, -1.4), pt(7, -2.6), pt(12.6, -1.4), pt(13.6, -4), pt(11.4, -18), pt(9.4, -34), pt(10.4, -42), pt(9.8, -48), pt(7, -51.4), pt(3.4, -52.8)]);
  part(d, body, ROBE, { shadow: 0.6, hatch: 0.22, line: 0.75 });
  // The folds falling from the belt: a shaded trough beside each lit ridge.
  d.pen.clipped(body, () => {
    for (const x of [-9, -4.4, 0.2]) {
      const fold = h([pt(x * 0.5, -32), pt(x * 0.9, -18), pt(x * 1.15, -2)]);
      dab(d, ribbonOf(fold.map((p) => pt(p.x + 1, p.y)), 1.8), SHADOW, 0.22, 0.7);
      d.pen.hair(fold, 0.4, mix(ROBE, SHADOW, 0.5), 0.8);
      gleam(d, fold.map((p) => pt(p.x - 0.9, p.y)), 0.6, 0.4);
    }
  });
  cast(d, body, nearSleeve(r), 2.4, 0.3);
  // The scapular: a blue panel down the front, gold-edged, a gold sun on the breast.
  const scap = h([pt(2.4, -51.6), pt(7.6, -50.8), pt(9.4, -34), pt(11.2, -3.4), pt(5.4, -2.4), pt(3, -34)]);
  part(d, scap, CROWN.blue, { shadow: 0.55, hatch: 0.18, line: 0.6 });
  trim(d, h([pt(3, -50.8), pt(3.4, -34), pt(5.8, -3)]), 0.9);
  trim(d, h([pt(5.6, -3), pt(10.8, -3.8)]), 1.2);
  const sun = pt(6, -44);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    d.pen.hair([pt(sun.x + Math.cos(a) * 1.6, sun.y + Math.sin(a) * 1.9), pt(sun.x + Math.cos(a) * 2.8, sun.y + Math.sin(a) * 3.2)], 0.4, CROWN.goldLight, 1);
  }
  steel(d, oval(sun.x, sun.y, 1.4, 1.6, 10), CROWN.gold, { hatch: 0, line: 0.4, shadow: 0.3 });
  // The rope belt, its knotted end hanging down the front (swinging a little behind the hem).
  const rope = [pt(-9.4, -35.4), pt(0, -33.6), pt(9.6, -35.4)];
  d.pen.stroke(rope, 1.6, mix(CROWN.hide, SHADOW, 0.15), 1, false);
  for (let i = 0; i < 7; i++) d.pen.hair([pt(-8 + i * 2.6, -35.6 + Math.abs(i - 3.5) * 0.3), pt(-7 + i * 2.6, -33.8 + Math.abs(i - 3.5) * 0.3)], 0.3, CROWN.leatherDark, 0.8);
  const tail = h([pt(8.4, -34.2), pt(8.8 - r.hem * 0.3, -27), pt(8.2 - r.hem * 0.5, -20)]);
  d.pen.stroke(tail, 1.2, mix(CROWN.hide, SHADOW, 0.15), 1, false);
  for (const [i, y] of [[1, -29], [2, -22]] as const) {
    const k = tail[i]!;
    part(d, oval(k.x + 0.2, y, 1.3, 1, 8), CROWN.hide, { shadow: 0.4, hatch: 0, line: 0.4 });
  }
}

/** The blue cowl lying back on the shoulders, then the tonsured, bearded head. */
function cowlAndHead(d: Draw, r: Rig): void {
  const cowl = [pt(-6.2, -57.4), pt(-9.8, -52.4), pt(-9.4, -48.4), pt(-3, -47.6), pt(4.4, -49), pt(7.4, -51.6), pt(2.4, -53.2), pt(-2.4, -53.6)];
  part(d, cowl, CROWN.blue, { shadow: 0.55, hatch: 0.18, line: 0.65 });
  trim(d, [pt(-9.2, -48.8), pt(-3, -48), pt(4.4, -49.4), pt(7.2, -51.6)], 1);
  neck(d, NECK);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.6, -57.6);
    head(d, c, { beard: BEARD, hair: mix(BEARD, CROWN.hair, 0.4), scale: 1.1 });
    // The shaven crown catching the light.
    gleam(d, [pt(-0.6, -63.4), pt(2.2, -64.2)], 0.8, 0.7);
    d.pen.hair([pt(-1.6, -60.2), pt(2.6, -61.6), pt(6.6, -61)], 0.35, mix(CROWN.skinShade, SHADOW, 0.3), 0.6);
  });
}

/** The raised hand, palm out, its sleeve fallen back: a mote of light gathering on it (see `light`). */
function raisedArm(d: Draw, r: Rig): void {
  // The sleeve hangs from the shoulder; its cuff follows the wrist.
  const dw = pt(r.wrist.x - WRIST0.x, r.wrist.y - WRIST0.y);
  const cuff = (p: Pt): Pt => {
    const k = Math.max(0, Math.min(1, (p.x - 5) / 11.4));
    return pt(p.x + dw.x * k, p.y + dw.y * k);
  };
  const sleeve = [pt(5, -50.6), pt(10.4, -51.4), pt(15.6, -52.6), pt(17.4, -48.4), pt(15.4, -46.2), pt(9.8, -44.8), pt(5.6, -44)].map(cuff);
  part(d, sleeve, far(ROBE), { shadow: 0.55, line: 0.6 });
  const P = PALM0;
  const heel = turn(pt(P.x - 1, P.y + 1.2), P, r.palmRot);
  const end = pt(heel.x + r.palm.x - P.x, heel.y + r.palm.y - P.y);
  const from = cuff(pt(15.4, -50.4));
  part(d, limb(from, pt((from.x + end.x) / 2 + 0.6, (from.y + end.y) / 2 - 0.6), end, 3.8, 3.4, 3), far(CROWN.skin), { shadow: 0.4, hatch: 0 });
  moved(d, r.palm.x - P.x, r.palm.y - P.y, r.palmRot, P, () => {
    const palm = [pt(P.x - 1.6, P.y + 2.6), pt(P.x - 1.8, P.y - 1), pt(P.x - 0.6, P.y - 3.6), pt(P.x + 0.6, P.y - 3.8), pt(P.x + 1.6, P.y - 1.2), pt(P.x + 2.6, P.y - 0.4), pt(P.x + 1.6, P.y + 2.4)];
    part(d, palm, CROWN.skin, { shadow: 0.35, hatch: 0, line: 0.5 });
    d.pen.hair([pt(P.x - 0.2, P.y - 3.2), pt(P.x - 0.1, P.y - 0.6)], 0.25, CROWN.skinShade, 0.8);
    d.pen.hair([pt(P.x + 0.9, P.y - 2.8), pt(P.x + 0.7, P.y - 0.4)], 0.25, CROWN.skinShade, 0.8);
  });
}

/** The staff: dark wood, iron-shod, a gold sun-ring at its head round the orb. */
function staff(d: Draw, r: Rig): void {
  moved(d, r.staff.x, r.staff.y, r.staffRot, GRIP0, () => {
    const shaft = ribbonOf([pt(STAFF_X - 0.4, 0.4), pt(STAFF_X + 0.2, -40), pt(STAFF_X + 0.8, -80.6)], 0, (u) => 2.2 - u * 0.4);
    part(d, shaft, CROWN.woodDark, { shadow: 0.5, hatch: 0, line: 0.55 });
    gleam(d, [pt(STAFF_X - 0.6, -4), pt(STAFF_X + 0.1, -40), pt(STAFF_X + 0.4, -78)], 0.4, 0.45);
    steel(d, [pt(STAFF_X - 1.6, -3), pt(STAFF_X + 1, -3), pt(STAFF_X + 0.8, 0.4), pt(STAFF_X - 1.6, 0.4)], CROWN.iron, { hatch: 0, line: 0.45 });
    for (const y of [-62, -79.4]) steel(d, [pt(STAFF_X - 0.8 + (y + 40) * -0.015, y - 1.2), pt(STAFF_X + 2.4 + (y + 40) * -0.015, y - 1.2), pt(STAFF_X + 2.4 + (y + 40) * -0.015, y + 1.2), pt(STAFF_X - 0.8 + (y + 40) * -0.015, y + 1.2)], CROWN.gold, { hatch: 0, line: 0.45, shadow: 0.3 });
    // The orb, white-hot at its heart.
    const O = ORB0;
    part(d, oval(O.x, O.y, 2.8, 2.8, 16), CROWN.holy, { shadow: 0, hatch: 0, line: 0.4, lineAlpha: 0.5 });
    d.pen.dot(O.x - 0.4, O.y - 0.4, 1.4, '#ffffff', 0.95);
    const ring = Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return pt(O.x + Math.cos(a) * 4.8, O.y + Math.sin(a) * 5.2);
    });
    d.pen.stroke(ring, 1.5, mix(CROWN.gold, SHADOW, 0.25), 1, false);
    d.pen.stroke(ring.slice(14, 26), 0.6, CROWN.goldLight, 0.9, false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const tip = pt(O.x + Math.cos(a) * 7.4, O.y + Math.sin(a) * 7.8);
      steel(d, [pt(O.x + Math.cos(a - 0.16) * 5, O.y + Math.sin(a - 0.16) * 5.4), tip, pt(O.x + Math.cos(a + 0.16) * 5, O.y + Math.sin(a + 0.16) * 5.4)], CROWN.gold, { hatch: 0, line: 0.35, shadow: 0.3 });
    }
    rivets(d, [pt(O.x, O.y + 5.2)], 0.5, CROWN.gold);
  });
}

/** The near sleeve, its cuff and hand carried with the staff's grip. */
function nearSleeve(r: Rig): Pt[] {
  const g = pt(onStaff(r, GRIP0).x - GRIP0.x, onStaff(r, GRIP0).y - GRIP0.y);
  return [pt(-4.6, -50), pt(-9, -47.6), pt(-8.6, -40), pt(-3.6, -35.6), pt(5.6, -36.6), pt(10.4, -37.4), pt(10, -43.8), pt(3.6, -42.6), pt(-1.6, -44)].map((p) => {
    const k = Math.max(0, Math.min(1, (p.x + 2) / 12.4));
    return pt(p.x + g.x * k, p.y + g.y * k);
  });
}

/** The near arm in its wide sleeve, the hand round the staff. */
function staffArm(d: Draw, r: Rig): void {
  const sleeve = nearSleeve(r);
  part(d, sleeve, ROBE, { shadow: 0.55, line: 0.65 });
  const g = pt(onStaff(r, GRIP0).x - GRIP0.x, onStaff(r, GRIP0).y - GRIP0.y);
  d.pen.hair([pt(-6, -46), pt(-4.6, -40.4), pt(0 + g.x * 0.15, -38.6 + g.y * 0.15)], 0.4, mix(ROBE, SHADOW, 0.5), 0.8);
  trim(d, [pt(10 + g.x, -44.2 + g.y), pt(10.6 + g.x, -37 + g.y)], 1.1);
  moved(d, g.x, g.y, r.staffRot, GRIP0, () => {
    const hand = [pt(11.2, -43.2), pt(13.6, -44.4), pt(16.8, -43.4), pt(17.4, -39.6), pt(14.6, -37.2), pt(11.2, -38)];
    part(d, hand, CROWN.skin, { shadow: 0.45, hatch: 0, line: 0.55 });
    for (const y of [-42, -40.2, -38.6]) d.pen.hair([pt(15.6, y), pt(17, y + 0.3)], 0.3, CROWN.skinShade, 0.9);
  });
}

/** Where the light leaves the hand: just off the palm's fingertips. */
const motePoint = (r: Rig): Pt => {
  const q = turn(pt(PALM0.x + 0.6, PALM0.y - 5.6), PALM0, r.palmRot);
  return pt(q.x + r.palm.x - PALM0.x, q.y + r.palm.y - PALM0.y);
};

/** The holy light's halo, laid over the finished figure so it glows past the ink; the burst as the orb is loosed. */
function light(d: Draw, r: Rig): void {
  const ctx = d.pen.ctx;
  carried(d, r.body, () => {
    const orb = onStaff(r, ORB0);
    glow(ctx, orb, 16 * Math.min(1.12, r.orb), '#fff3c4', 0.6 * Math.min(1, r.orb));
    glow(ctx, orb, 6 * r.orb, '#ffffff', Math.min(0.95, 0.8 * r.orb));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3 + r.staffRot;
      const k = Math.min(1.06, r.orb);
      d.pen.hair([pt(orb.x + Math.cos(a) * 9.4, orb.y + Math.sin(a) * 9.4), pt(orb.x + Math.cos(a) * 12.6 * k, orb.y + Math.sin(a) * 12.6 * k)], 0.5, CROWN.goldLight, 0.8);
    }
    const m = motePoint(r);
    if (r.mote > 0) {
      glow(ctx, m, 6 * r.mote, '#fff3c4', 0.75);
      d.pen.dot(m.x, m.y, 1.1 * Math.sqrt(r.mote), '#ffffff', 0.95);
    }
    if (r.burst > 0) burst(d, pt(m.x + 3, m.y + 1.5), r.burst);
  });
}

/** The orb leaving the palm: a white-hot ball in a wide halo, rays flaring round it. */
function burst(d: Draw, c: Pt, k: number): void {
  const ctx = d.pen.ctx;
  glow(ctx, c, 19 * k, '#fff3c4', 0.85);
  glow(ctx, c, 8.5 * k, '#ffffff', 0.95);
  d.pen.dot(c.x, c.y, 3.6 * k, '#ffffff', 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = 5.4 * k;
    const r1 = (i % 2 ? 11 : 15.6) * k;
    d.pen.hair([pt(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0), pt(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1)], 0.55, CROWN.goldLight, 0.85);
  }
}

/** Where the cast orb leaves the palm at the strike frame (t 0.5), in frame units: the projectile's start. */
export const MONK_ORB_FROM: Pt = (() => {
  const r = rigOf({ kind: 'attack', t: 0.5 });
  const m = motePoint(r);
  return carry(r.body, pt(m.x + 3, m.y + 1.5));
})();

export const drawMonk: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = rigOf(pose);
  infantryFigure(ctx, seed, f, { shadowRx: 18, after: (d) => light(d, r) }, (d) => {
    feet(d, r);
    carried(d, r.body, () => {
      robe(d, r);
      cowlAndHead(d, r);
      raisedArm(d, r);
      staff(d, r);
      staffArm(d, r);
    });
  });
};
