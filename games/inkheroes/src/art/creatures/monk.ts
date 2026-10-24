import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { cast, CROWN, far, head, headShape, limb, mail, neck, oval, part, pt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, glow, infantryFigure, SHADOW } from './crownInfantryPaint';
import { carried, carry, idleCarriage, keyed, moved, poseOf, step, strike, TAU, turn, walkCarriage, type Carriage, type Step } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Monk: a grave battle-priest of the Crown, seven heads tall, grey-
 * bearded, his deep hood drawn up so his eyes sit in its shadow; a long
 * robe of dark umber wool, a deep blue scapular edged in brass with a brass
 * sun on the breast, mail glinting at the wrists, a broad studded belt and
 * heavy boots. He holds a tall iron-shod staff crowned with a brass
 * sun-ring round a burning orb of holy light, and raises his other hand
 * with a mote of the same light ready to throw. Silhouette: the hooded
 * head, the long fall of the robe, the upright staff and its glowing head.
 *
 * Posed: at ease the hem stirs and the light breathes; he walks with the
 * staff rocking in his fist and his feet stepping out under the swinging
 * hem; he casts by drawing the hand back to gather the light (the staff
 * raised), then thrusting the palm out to loose it as a bright orb at t 0.5.
 */

const ROBE = '#4a3a2c';
const HOOD = '#3e3024';
const BEARD = '#6a6358';
const STAFF_X = 17;
const ORB0 = pt(17.8, -91.6);
const PALM0 = pt(25, -69.4);
/** Where the far sleeve ends (the wrist), and where the staff fist grips. */
const WRIST0 = pt(20, -65.6);
const GRIP0 = pt(16.6, -52);
const HIPS = pt(0, -40);
const NECK = pt(2.6, -67);
/** The glow's colours: warm, never white. */
const GLOW = '#f6e2a8';
const HOT = '#fbf0d2';

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
    const body = walkCarriage(t, HIPS, 1.8, 0.03, 0.8);
    const front = step(t, 5.2, 3.6);
    const back = step(t + 0.5, 5.2, 3.6);
    const swing = Math.cos(a);
    return {
      body,
      feet: [back, front],
      hem: 0.6 * front.x - 0.35 * back.x,
      staff: pt(1.6 * swing, -3.4 + 0.6 * Math.abs(swing)),
      staffRot: 0.07 * swing,
      palm: pt(PALM0.x - 1.4 - 1.6 * swing, PALM0.y + 3.4 + 0.5 * Math.sin(a * 2)),
      palmRot: 0.1,
      wrist: pt(WRIST0.x - 1.4 - 1.4 * swing, WRIST0.y + 2.8),
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
    const palm = pt(keys(PALM0.x, 14.6, 32.6, 30), keys(PALM0.y, -72.6, -71.4, -70.6));
    return {
      body,
      feet: [{ x: strike(t, -0.8, 0, 0), lift: 0, tilt: 0 }, { x: Math.max(0, strike(t, 0, 3, 3)), lift: 0, tilt: 0 }],
      hem: strike(t, -1, 1.6, 1.2),
      staff: pt(strike(t, -1, 1.4, 1), strike(t, -2.6, -3, -2.4)),
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
const below = (y: number): number => Math.max(0, Math.min(1, (y + 48) / 46)) ** 1.3;

/** A robe point, its lower part swung by the hem. */
const hemmed = (r: Rig, p: Pt): Pt => pt(p.x + r.hem * below(p.y), p.y);

/** The booted feet showing under the hem (in the frame: they stay on the ground). */
function feet(d: Draw, r: Rig): void {
  for (const [x0, back, st] of [[-5.4, true, r.feet[0]], [8.4, false, r.feet[1]]] as const) {
    moved(d, st.x, -st.lift, st.tilt, pt(x0 + 1, -2), () => {
      const x = x0;
      const foot = [pt(x - 2, -4.6), pt(x + 2.6, -4.6), pt(x + 3.2, -3.2), pt(x + 6.2, -2), pt(x + 6.6, 0), pt(x - 2.6, 0)];
      part(d, foot, back ? far(CROWN.boot) : CROWN.boot, { shadow: 0.6, hatch: 0, line: 0.55 });
      d.pen.stroke([pt(x - 2.6, -0.4), pt(x + 6.6, -0.4)], 0.7, mix(d.ink, SHADOW, 0.4), 0.95, false);
      gleam(d, [pt(x + 3, -3), pt(x + 5.6, -2)], 0.3, 0.4);
    });
  }
}

/** The robe: a long fall of dark wool, deeply folded, the blue scapular down its front and a broad studded belt. */
function robe(d: Draw, r: Rig): void {
  const h = (pts: readonly Pt[]): Pt[] => pts.map((p) => hemmed(r, p));
  const body = h([pt(-4, -67.4), pt(-9.8, -64.6), pt(-11, -55), pt(-9.8, -47), pt(-12.2, -28), pt(-15, -8), pt(-14.4, -3), pt(-8, -2), pt(-3, -3.2), pt(2, -1.8), pt(7, -3), pt(13.4, -1.8), pt(14.4, -4.4), pt(12, -26), pt(9.8, -47), pt(10.8, -55), pt(10.2, -62), pt(7.4, -66), pt(3.4, -67.4)]);
  part(d, body, ROBE, { shadow: 0.7, hatch: 0.22, line: 0.7 });
  // The folds falling from the belt: a deep trough beside each lit ridge, the far side in shade.
  d.pen.clipped(body, () => {
    dab(d, h([pt(3, -68), pt(16, -68), pt(16, 0), pt(6, 0)]), SHADOW, 0.32, 1.8);
    for (const x of [-10, -5.4, -0.6]) {
      const fold = h([pt(x * 0.5, -44), pt(x * 0.9, -24), pt(x * 1.15, -3)]);
      dab(d, ribbonOf(fold.map((p) => pt(p.x + 1.1, p.y)), 2), SHADOW, 0.38, 0.8);
      d.pen.hair(fold, 0.3, mix(ROBE, SHADOW, 0.6), 0.85);
      dab(d, ribbonOf(fold.map((p) => pt(p.x - 1, p.y)), 1), mix(ROBE, '#f3d6a2', 0.35), 0.3, 0.5);
    }
  });
  cast(d, body, nearSleeve(r), 2.4, 0.42);
  // The scapular: a blue panel down the front, brass-edged, a brass sun on the breast.
  const scap = h([pt(2.4, -66.2), pt(7.8, -65.4), pt(9.6, -47), pt(11.4, -3.8), pt(5.4, -3), pt(3, -47)]);
  part(d, scap, CROWN.blue, { shadow: 0.65, hatch: 0.18, line: 0.6 });
  trim(d, h([pt(3, -65.4), pt(3.4, -47), pt(5.8, -3.6)]), 0.8);
  trim(d, h([pt(5.6, -3.6), pt(11, -4.2)]), 1);
  const sun = pt(6.2, -58);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    d.pen.hair([pt(sun.x + Math.cos(a) * 1.5, sun.y + Math.sin(a) * 1.8), pt(sun.x + Math.cos(a) * 2.6, sun.y + Math.sin(a) * 3)], 0.32, CROWN.goldLight, 0.95);
  }
  steel(d, oval(sun.x, sun.y, 1.3, 1.5, 10), CROWN.gold, { hatch: 0, line: 0.4, shadow: 0.4 });
  // The broad belt, brass-studded, its end hanging down the front (swinging a little behind the hem).
  const belt = [pt(-10, -49.8), pt(0, -48.4), pt(10.2, -49.8), pt(10.2, -46.6), pt(0, -45.2), pt(-10, -46.6)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.5, hatch: 0, line: 0.5 });
  rivets(d, [pt(-7, -47.6), pt(-3.4, -47), pt(0.2, -46.8)], 0.36, CROWN.gold);
  steel(d, [pt(5.6, -49.6), pt(8.2, -49.8), pt(8.2, -46.4), pt(5.6, -46.2)], CROWN.gold, { hatch: 0, line: 0.45 });
  const tail = h([pt(8.6, -46.4), pt(9 - r.hem * 0.3, -40), pt(8.6 - r.hem * 0.5, -33)]);
  d.pen.stroke(tail, 1.4, CROWN.leatherDark, 1, false);
}

/** The hood drawn up over the head, its rim shadowing the eyes, its cape over the shoulders; a grey beard below. */
function cowlAndHead(d: Draw, r: Rig): void {
  neck(d, NECK);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.8, -75.6);
    // The back of the hood, behind the head, and its cape on the shoulders.
    const back = [pt(-6.4, -84.6), pt(-1, -88), pt(4.6, -87.6), pt(8.8, -84), pt(9.8, -78), pt(8.4, -70), pt(10.6, -64.6), pt(4, -61.4), pt(-5, -62), pt(-11, -64), pt(-9.6, -72), pt(-8.4, -80)];
    part(d, back, HOOD, { shadow: 0.7, hatch: 0.2, line: 0.65 });
    head(d, c, { beard: BEARD });
    // The hood's opening: its rim round the face, deep shadow inside it over the brow and eyes.
    d.pen.clipped(headShape(c), () => dab(d, [pt(-2, -84), pt(10, -84), pt(10, -75.4), pt(6, -74.6), pt(-2, -75.6)], SHADOW, 0.62, 0.9));
    const rim = [pt(-1.4, -86.2), pt(3.6, -86.4), pt(7.6, -84), pt(9.4, -79.6), pt(9.6, -77.6), pt(7.4, -79.6), pt(4.6, -81.4), pt(1.2, -81.2), pt(-0.4, -78), pt(-0.6, -72), pt(1.4, -67), pt(-2.6, -67.4), pt(-3.4, -74), pt(-3.2, -82)];
    part(d, rim, HOOD, { shadow: 0.55, hatch: 0.16, line: 0.6 });
    d.pen.hair([pt(-1.4, -84.6), pt(3.6, -85), pt(7.4, -82.8)], 0.3, mix(HOOD, SHADOW, 0.6), 0.85);
    d.pen.clipped(rim, () => gleam(d, [pt(-2.4, -80), pt(-1.4, -84.6), pt(2.6, -86)], 0.5, 0.35));
  });
  // The hood's cape over the shoulders, its edge trimmed in blue.
  const cape = [pt(-9.6, -66.4), pt(-4, -68.6), pt(3, -68.4), pt(9.4, -66.6), pt(11, -61.4), pt(6, -59.4), pt(0, -59.8), pt(-6.4, -59.4), pt(-11, -61.6)];
  part(d, cape, HOOD, { shadow: 0.65, hatch: 0.18, line: 0.6 });
  trim(d, [pt(-11, -61.6), pt(-6.4, -59.6), pt(0, -60), pt(6, -59.6), pt(11, -61.4)], 0.9, CROWN.blueDeep);
}

/** The raised hand, palm out, its sleeve fallen back to show mail at the wrist: a mote of light gathering on it (see `light`). */
function raisedArm(d: Draw, r: Rig): void {
  // The sleeve hangs from the shoulder; its cuff follows the wrist.
  const dw = pt(r.wrist.x - WRIST0.x, r.wrist.y - WRIST0.y);
  const cuff = (p: Pt): Pt => {
    const k = Math.max(0, Math.min(1, (p.x - 5) / 14));
    return pt(p.x + dw.x * k, p.y + dw.y * k);
  };
  const sleeve = [pt(5, -65), pt(11, -66.4), pt(18.6, -68.6), pt(21, -64), pt(18.8, -61.4), pt(11, -59.4), pt(5.6, -58)].map(cuff);
  part(d, sleeve, far(ROBE), { shadow: 0.65, line: 0.6 });
  const P = PALM0;
  const heel = turn(pt(P.x - 1, P.y + 1.2), P, r.palmRot);
  const end = pt(heel.x + r.palm.x - P.x, heel.y + r.palm.y - P.y);
  const from = cuff(pt(18.6, -66));
  const wrist = limb(from, pt((from.x + end.x) / 2 + 0.6, (from.y + end.y) / 2 - 0.6), end, 3.6, 3.2, 2.8);
  part(d, wrist, far(CROWN.steelDark), { shadow: 0.55, hatch: 0 });
  mail(d, wrist, Math.min(from.x, end.x) - 3, Math.max(from.x, end.x) + 3, Math.min(from.y, end.y) - 3, Math.max(from.y, end.y) + 3);
  moved(d, r.palm.x - P.x, r.palm.y - P.y, r.palmRot, P, () => {
    const palm = [pt(P.x - 1.5, P.y + 2.4), pt(P.x - 1.7, P.y - 1), pt(P.x - 0.6, P.y - 3.6), pt(P.x + 0.6, P.y - 3.8), pt(P.x + 1.5, P.y - 1.2), pt(P.x + 2.4, P.y - 0.4), pt(P.x + 1.5, P.y + 2.2)];
    part(d, palm, CROWN.skin, { shadow: 0.45, hatch: 0, line: 0.5 });
    d.pen.hair([pt(P.x - 0.2, P.y - 3.2), pt(P.x - 0.1, P.y - 0.6)], 0.2, CROWN.skinShade, 0.8);
    d.pen.hair([pt(P.x + 0.9, P.y - 2.8), pt(P.x + 0.7, P.y - 0.4)], 0.2, CROWN.skinShade, 0.8);
  });
}

/** The staff: dark walnut, iron-shod and iron-banded, a brass sun-ring at its head round the orb. */
function staff(d: Draw, r: Rig): void {
  moved(d, r.staff.x, r.staff.y, r.staffRot, GRIP0, () => {
    const shaft = ribbonOf([pt(STAFF_X - 0.4, 0.4), pt(STAFF_X + 0.2, -48), pt(STAFF_X + 0.8, -86.4)], 0, (u) => 2 - u * 0.4);
    part(d, shaft, CROWN.woodDark, { shadow: 0.6, hatch: 0, line: 0.5 });
    gleam(d, [pt(STAFF_X - 0.6, -4), pt(STAFF_X + 0.1, -48), pt(STAFF_X + 0.4, -84)], 0.3, 0.35);
    steel(d, [pt(STAFF_X - 1.5, -3.4), pt(STAFF_X + 1, -3.4), pt(STAFF_X + 0.8, 0.4), pt(STAFF_X - 1.5, 0.4)], CROWN.iron, { hatch: 0, line: 0.45 });
    for (const y of [-70, -85.2]) {
      const x = STAFF_X - 0.8 + (y + 48) * -0.016;
      steel(d, [pt(x, y - 1.1), pt(x + 3, y - 1.1), pt(x + 3, y + 1.1), pt(x, y + 1.1)], CROWN.gold, { hatch: 0, line: 0.4, shadow: 0.4 });
    }
    // The orb, burning at its heart.
    const O = ORB0;
    part(d, oval(O.x, O.y, 2.6, 2.6, 16), CROWN.holy, { shadow: 0, hatch: 0, line: 0.35, lineAlpha: 0.5 });
    d.pen.dot(O.x - 0.4, O.y - 0.4, 1.3, HOT, 0.95);
    const ring = Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return pt(O.x + Math.cos(a) * 4.6, O.y + Math.sin(a) * 5);
    });
    d.pen.stroke(ring, 1.3, mix(CROWN.gold, SHADOW, 0.3), 1, false);
    d.pen.stroke(ring.slice(14, 26), 0.5, CROWN.glint, 0.9, false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const tip = pt(O.x + Math.cos(a) * 7, O.y + Math.sin(a) * 7.4);
      steel(d, [pt(O.x + Math.cos(a - 0.16) * 4.8, O.y + Math.sin(a - 0.16) * 5.2), tip, pt(O.x + Math.cos(a + 0.16) * 4.8, O.y + Math.sin(a + 0.16) * 5.2)], CROWN.gold, { hatch: 0, line: 0.35, shadow: 0.4 });
    }
    rivets(d, [pt(O.x, O.y + 5)], 0.45, CROWN.gold);
  });
}

/** The near sleeve, its cuff and hand carried with the staff's grip. */
function nearSleeve(r: Rig): Pt[] {
  const g = pt(onStaff(r, GRIP0).x - GRIP0.x, onStaff(r, GRIP0).y - GRIP0.y);
  return [pt(-4.6, -65), pt(-9.6, -62), pt(-9.8, -52), pt(-5, -46.4), pt(5, -47.8), pt(12.4, -49), pt(12.2, -55.8), pt(4, -54.6), pt(-2, -56.4)].map((p) => {
    const k = Math.max(0, Math.min(1, (p.x + 2) / 14.4));
    return pt(p.x + g.x * k, p.y + g.y * k);
  });
}

/** The near arm in its wide sleeve, mail at the wrist, the gloved hand round the staff. */
function staffArm(d: Draw, r: Rig): void {
  const sleeve = nearSleeve(r);
  part(d, sleeve, ROBE, { shadow: 0.65, line: 0.6 });
  const g = pt(onStaff(r, GRIP0).x - GRIP0.x, onStaff(r, GRIP0).y - GRIP0.y);
  d.pen.hair([pt(-6.4, -60), pt(-5, -52.6), pt(0 + g.x * 0.15, -50.6 + g.y * 0.15)], 0.3, mix(ROBE, SHADOW, 0.6), 0.85);
  part(d, [pt(12.2 + g.x, -55.8 + g.y), pt(13.6 + g.x, -56 + g.y), pt(13.8 + g.x, -48.8 + g.y), pt(12.4 + g.x, -49 + g.y)], CROWN.steelDark, { shadow: 0.5, hatch: 0, line: 0.4 });
  trim(d, [pt(12 + g.x, -55.8 + g.y), pt(12.4 + g.x, -49 + g.y)], 0.9, CROWN.blueDeep);
  moved(d, g.x, g.y, r.staffRot, GRIP0, () => {
    const hand = [pt(13.4, -54.6), pt(15.6, -55.8), pt(18.8, -54.8), pt(19.4, -51), pt(16.6, -48.6), pt(13.4, -49.4)];
    part(d, hand, CROWN.leather, { shadow: 0.55, hatch: 0, line: 0.5 });
    for (const y of [-53.4, -51.6, -50]) d.pen.hair([pt(17.6, y), pt(19, y + 0.3)], 0.22, d.ink, 0.7);
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
    glow(ctx, orb, 15 * Math.min(1.12, r.orb), GLOW, 0.55 * Math.min(1, r.orb));
    glow(ctx, orb, 5.6 * r.orb, HOT, Math.min(0.9, 0.75 * r.orb));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3 + r.staffRot;
      const k = Math.min(1.06, r.orb);
      d.pen.hair([pt(orb.x + Math.cos(a) * 9, orb.y + Math.sin(a) * 9), pt(orb.x + Math.cos(a) * 11.8 * k, orb.y + Math.sin(a) * 11.8 * k)], 0.4, CROWN.glint, 0.8);
    }
    const m = motePoint(r);
    if (r.mote > 0) {
      glow(ctx, m, 6 * r.mote, GLOW, 0.7);
      d.pen.dot(m.x, m.y, 1 * Math.sqrt(r.mote), HOT, 0.95);
    }
    if (r.burst > 0) burst(d, pt(m.x + 3, m.y + 1.5), r.burst);
  });
}

/** The orb leaving the palm: a white-hot ball in a wide halo, rays flaring round it. */
function burst(d: Draw, c: Pt, k: number): void {
  const ctx = d.pen.ctx;
  glow(ctx, c, 18 * k, GLOW, 0.8);
  glow(ctx, c, 8 * k, HOT, 0.92);
  d.pen.dot(c.x, c.y, 3.4 * k, HOT, 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = 5.4 * k;
    const r1 = (i % 2 ? 11 : 15.6) * k;
    d.pen.hair([pt(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0), pt(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1)], 0.45, CROWN.glint, 0.85);
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
  infantryFigure(ctx, seed, f, { shadowRx: 17, after: (d) => light(d, r) }, (d) => {
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
