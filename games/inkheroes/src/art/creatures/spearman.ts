import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, mail, neck, oval, part, pt, quilt, rivets, shine, steel, trim, wraps } from './crownInfantryKit';
import { dab, gleam, infantryFigure, IVORY, SHADOW } from './crownInfantryPaint';
import { carried, footed, idleCarriage, keyed, legOf, mixPt, moved, poseOf, solve, step, strike, TAU, walkCarriage, type Bones, type Carriage, type Leg } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Spearman: a seasoned Crown militiaman, seven heads tall, in a dark
 * steel kettle hat and mail collar, a quilted ultramarine gambeson with
 * brass-edged hems, a round deep-blue shield with a brass cross on the
 * front arm and a long ash spear held low in the other, angled up past the
 * hat with a blue pennon under its leaf blade. Silhouette: the brimmed
 * hat, the round shield and the long diagonal spear.
 *
 * Posed: he breathes and the spear sways at ease; marches with the spear
 * carried and the shield steady; and attacks with a lunging thrust over
 * the shield, the hand sliding up the shaft to drive the spear home.
 */

/** The spear as drawn in the stance: butt to tip. */
const BUTT0 = pt(-15, -2);
const TIP0 = pt(36, -103);
const LENGTH = Math.hypot(TIP0.x - BUTT0.x, TIP0.y - BUTT0.y);
const ANGLE0 = Math.atan2(TIP0.y - BUTT0.y, TIP0.x - BUTT0.x);
/** Where the near hand grips the shaft in the stance, and where the blade starts. */
const GRIP0 = 0.41;
const BLADE = 0.87;
const HAND0 = pt(BUTT0.x + (TIP0.x - BUTT0.x) * GRIP0, BUTT0.y + (TIP0.y - BUTT0.y) * GRIP0);

/** The stance's limbs (body units): hip → knee → ankle, shoulder → elbow → hand. */
const BACK_LEG: Bones = { a: pt(-3.4, -40), k: pt(-6.6, -22), b: pt(-9, -4.5) };
const FRONT_LEG: Bones = { a: pt(3.4, -40), k: pt(7.6, -22), b: pt(8.8, -4.5) };
const NEAR_ARM: Bones = { a: pt(-4.6, -63), k: pt(-6.4, -50.5), b: pt(HAND0.x - 1.4, HAND0.y + 0.4) };
const SHIELD_ARM: Bones = { a: pt(7, -63), k: pt(12.4, -52.6), b: pt(17.4, -52.4) };
const SHIELD = pt(19.6, -48.4);
const HIPS = pt(0, -40);
const NECK = pt(2.4, -66.6);

/** The spear in hand: gripped at `grip` (0 butt .. 1 tip) by the hand at `hand`, pointing at `angle`. */
interface Spear {
  readonly hand: Pt;
  readonly angle: number;
  readonly grip: number;
}

/** Everything the pose decides, in body units under the carriage (the legs in the frame). */
interface Rig {
  readonly body: Carriage;
  readonly back: Leg;
  readonly front: Leg;
  readonly spear: Spear;
  /** The shield (and its hand) moved by this. */
  readonly shield: Pt;
  /** The head moved by this, and nodded by `nod`. */
  readonly head: Pt;
  readonly nod: number;
  /** The pennon's extra swing (radians) and its ripple's phase. */
  readonly swing: number;
  readonly ripple: number;
}

function rigOf(pose?: Pose): Rig {
  const { kind, t } = poseOf(pose);
  if (kind === 'walk') {
    const body = walkCarriage(t, HIPS, 2, 0.035, 1.2);
    const fs = step(t, 8, 5);
    const bs = step(t + 0.5, 8, 5);
    const swing = Math.cos(TAU * t);
    return {
      body,
      front: legOf(FRONT_LEG, body, -7.4 + fs.x, fs.lift, fs.tilt),
      back: legOf(BACK_LEG, body, 8 + bs.x, bs.lift, bs.tilt),
      spear: { hand: pt(HAND0.x - 2.8 * swing, HAND0.y - 3.6 + 0.6 * Math.abs(swing)), angle: ANGLE0 + 0.035 * swing, grip: GRIP0 },
      shield: pt(1.2 * swing, -0.4 * Math.sin(TAU * t * 2)),
      head: pt(0.3, 0.3 * Math.sin(TAU * t * 2)),
      nod: 0.03,
      swing: 0.22 * Math.sin(TAU * t * 2),
      ripple: TAU * t * 2,
    };
  }
  if (kind === 'attack') {
    const lunge = strike(t, -0.35, 1, 0.75);
    const body: Carriage = { dx: strike(t, -2, 3.6, 2.8), dy: strike(t, 0.8, 3, 2.4), rot: strike(t, -0.06, 0.1, 0.08), pivot: HIPS };
    const keys = (a: number, w: number, h: number, f: number): number => keyed(t, [[0, a], [0.3, w], [0.5, h], [0.75, f], [1, a]]);
    return {
      body,
      front: legOf(FRONT_LEG, body, Math.max(0, lunge) * 7.5, 0, 0),
      back: legOf(BACK_LEG, body, strike(t, -1.6, 0.8, 0.5), 0, 0),
      spear: {
        hand: pt(keys(HAND0.x, -4.4, 10.6, 9), keys(HAND0.y, -55, -59.4, -57.6)),
        angle: keys(ANGLE0, -0.64, -0.52, -0.55),
        grip: keys(GRIP0, 0.5, 0.67, 0.63),
      },
      shield: pt(strike(t, 1.6, -1.2, -0.6), strike(t, -1.2, 0.6, 0.4)),
      head: pt(strike(t, -0.6, 0.8, 0.6), 0),
      nod: strike(t, -0.04, 0.06, 0.05),
      swing: strike(t, -0.1, 0.12, 0.05),
      ripple: TAU * t,
    };
  }
  const body = idleCarriage(t, HIPS, 1);
  const a = TAU * t;
  return {
    body,
    front: legOf(FRONT_LEG, body, 0, 0, 0),
    back: legOf(BACK_LEG, body, 0, 0, 0),
    spear: { hand: pt(HAND0.x + 0.4 * Math.sin(a), HAND0.y - 0.3 * Math.sin(a)), angle: ANGLE0 + 0.022 * Math.sin(a + 0.6), grip: GRIP0 },
    shield: pt(0, 0.3 * Math.sin(a + 0.4)),
    head: pt(0.3 * Math.sin(a + 1.2), 0.25 * Math.sin(a)),
    nod: 0.02 * Math.sin(a + 0.8),
    swing: 0.06 * Math.sin(a),
    ripple: a,
  };
}

/** A point `t` of the way from the butt to the tip. */
function along(s: Spear, t: number): Pt {
  const k = (t - s.grip) * LENGTH;
  return pt(s.hand.x + Math.cos(s.angle) * k, s.hand.y + Math.sin(s.angle) * k);
}

/** A stretch of the ash shaft, from t0 to t1 of the way from butt to tip. */
function shaft(d: Draw, s: Spear, t0: number, t1: number): void {
  const a = along(s, t0);
  const b = along(s, t1);
  const ux = Math.cos(s.angle);
  const uy = Math.sin(s.angle);
  const w = 0.8;
  const shape = [pt(a.x - uy * w, a.y + ux * w), pt(b.x - uy * w, b.y + ux * w), pt(b.x + uy * w, b.y - ux * w), pt(a.x + uy * w, a.y - ux * w)];
  part(d, shape, CROWN.wood, { shadow: 0.6, hatch: 0, line: 0.5 });
  gleam(d, [pt(a.x - uy * 0.35, a.y + ux * 0.35), pt(b.x - uy * 0.35, b.y + ux * 0.35)], 0.3, 0.45);
}

/** The iron butt-cap. */
function buttCap(d: Draw, s: Spear): void {
  const a = along(s, 0);
  const b = along(s, 0.04);
  const ux = Math.cos(s.angle);
  const uy = Math.sin(s.angle);
  const w = 1.05;
  steel(d, [pt(a.x - uy * w, a.y + ux * w), pt(b.x - uy * w, b.y + ux * w), pt(b.x + uy * w, b.y - ux * w), pt(a.x + uy * w, a.y - ux * w)], CROWN.steelDark, { hatch: 0, line: 0.45 });
}

/** The steel leaf blade, its socket and the pennon tied under it, streaming with the spear's swing. */
function spearHead(d: Draw, s: Spear, r: Rig): void {
  const base = along(s, BLADE);
  const ux = Math.cos(s.angle);
  const uy = Math.sin(s.angle);
  const at = (a: number, n: number): Pt => pt(base.x + ux * a - uy * n, base.y + uy * a + ux * n);
  const L = (1 - BLADE) * LENGTH;
  // The pennon: a swallow-tailed blue streamer, lifting back off the shaft. Drawn for the stance's
  // spear and turned with this one (lagging), its tails rippling.
  const p0 = along(s, 0.79);
  const p1 = along(s, 0.835);
  const rot = (s.angle - ANGLE0) * 0.55 + r.swing;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const fl = (dx: number, dy: number, from: Pt = p1): Pt => {
    const reach = Math.min(1, Math.abs(dx) / 15);
    const wy = dy + reach * 1.1 * Math.sin(r.ripple + reach * 3.4);
    return pt(from.x + dx * cs - wy * sn, from.y + dx * sn + wy * cs);
  };
  const pennon = [p1, fl(-5, -0.8), fl(-10, 1), fl(-15, 0.2), fl(-11.6, 4), fl(-15, 7.6), fl(-8.4, 6.8), fl(-3.4, 1.8, p0), p0];
  part(d, pennon, CROWN.blue, { shadow: 0.55, hatch: 0.14, line: 0.6 });
  // The fold: the far panel in shade.
  d.pen.clipped(pennon, () => dab(d, [fl(-6, -2), fl(-16, -1), fl(-16, 9), fl(-9, 8)], SHADOW, 0.42, 0.6));
  d.pen.hair([fl(-5.6, -0.2), fl(-7.4, 3.4), fl(-8.6, 6.4)], 0.25, d.ink, 0.6);
  trim(d, [fl(-0.4, 0.2), fl(-5, -0.4), fl(-10, 1.4), fl(-14.2, 0.7)], 0.7);
  // Socket, then the blade with its midrib.
  steel(d, [at(-2.6, -1.1), at(0.6, -1.25), at(0.6, 1.25), at(-2.6, 1.1)], CROWN.steelDark, { hatch: 0, line: 0.5 });
  const blade = [at(0, -1.2), at(L * 0.3, -2.6), at(L * 0.62, -2.1), at(L, 0), at(L * 0.62, 2.1), at(L * 0.3, 2.6), at(0, 1.2)];
  steel(d, blade, CROWN.steel, { line: 0.6 });
  d.pen.hair([at(0.4, 0), at(L * 0.92, 0)], 0.25, d.ink, 0.7);
  shine(d, [at(L * 0.18, -1.4), at(L * 0.62, -1.3)], 0.45);
}

/** Whether the shaft runs in front of the body (lowered for the thrust) rather than down past the far side of the legs. */
const lowered = (s: Spear): boolean => s.grip > 0.45;

/** Leather wraps round a shin, from just under the knee to above the boot. */
const shinWraps = (d: Draw, l: Leg, w: number): void => wraps(d, mixPt(l.knee, l.ankle, 0.1), mixPt(l.knee, l.ankle, 0.6), w, 5);

function legs(d: Draw, r: Rig): void {
  const { back: b, front: f } = r;
  const back = limb(b.hip, b.knee, b.ankle, 6.8, 4.6, 3.4, 6.6, 5);
  part(d, back, far(CROWN.hose), { shadow: 0.6 });
  shinWraps(d, b, 4.6);
  footed(d, b, BACK_LEG.b.x, BACK_LEG.b.y, () => boot(d, -9, -12, 7.4, far(CROWN.boot)));
  if (!lowered(r.spear)) {
    carried(d, r.body, () => {
      shaft(d, r.spear, 0, r.spear.grip);
      buttCap(d, r.spear);
    });
  }
  const front = limb(f.hip, f.knee, f.ankle, 7, 4.8, 3.6, 7, 5.2);
  part(d, front, CROWN.hose, { shadow: 0.55 });
  shinWraps(d, f, 5);
  footed(d, f, FRONT_LEG.b.x, FRONT_LEG.b.y, () => boot(d, 8.8, -12, 7.8));
  // The gambeson's skirt shades the tops of the legs.
  const skirt = [pt(-14, -36), pt(14, -36), pt(14, -31), pt(-14, -31)].map((p) => pt(p.x + r.body.dx, p.y + r.body.dy));
  for (const leg of [back, front]) cast(d, leg, skirt, 1.6, 0.4);
}

/** The quilted gambeson: chest, waist and skirt to mid-thigh, collar, belt and brass-edged hems. */
function gambeson(d: Draw, r: Rig): void {
  const body = [pt(-4, -66.8), pt(-9.6, -64.4), pt(-11, -58), pt(-9.4, -50), pt(-10.4, -42), pt(-12.2, -32.6), pt(-4, -31.4), pt(4, -31.8), pt(12, -33), pt(10.2, -42), pt(9.2, -48.6), pt(11.4, -56), pt(10.6, -62), pt(7.4, -65.6), pt(3.2, -67)];
  part(d, body, CROWN.blue, { shadow: 0.65, hatch: 0.22, line: 0.7 });
  const rows = [-6.2, -2.6, 1, 4.6, 8].map((x) => [pt(x * 0.95, -65), pt(x * 0.92, -56), pt(x * 0.86, -48), pt(x * 1.06, -40), pt(x * 1.2, -31.6)]);
  quilt(d, body, rows, CROWN.blue);
  // The chest turning away from the light, the near arm's shadow down the side, and the chin's on the collar.
  d.pen.clipped(body, () => dab(d, [pt(4, -66), pt(14, -66), pt(14, -30), pt(6, -30)], SHADOW, 0.3, 1.6));
  cast(d, body, nearArm(r), 2.2, 0.4);
  cast(d, body, oval(4, -66.6, 4, 2, 12), 1.2, 0.4);
  trim(d, [pt(-11.4, -33), pt(-4, -32), pt(4, -32.4), pt(11.4, -33.4)], 1.3);
  // The padded collar.
  part(d, [pt(-4.4, -66.6), pt(-1, -64.6), pt(3.8, -65.2), pt(4.6, -67.6), pt(0, -67.4), pt(-4, -68.6)], CROWN.blueDeep, { shadow: 0.5, hatch: 0, line: 0.5 });
  trim(d, [pt(-4.2, -66.4), pt(-0.8, -64.6), pt(4, -65.1)], 0.7);
  // Belt, brass studs and buckle.
  const belt = [pt(-8.6, -49.6), pt(0, -48.4), pt(9.4, -49.4), pt(9.4, -46.8), pt(0, -45.8), pt(-8.6, -47)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.5, hatch: 0, line: 0.5 });
  rivets(d, [pt(-6, -47.8), pt(-2.4, -47.3), pt(1.4, -47.2)], 0.38, CROWN.gold);
  steel(d, [pt(5.4, -49.4), pt(8, -49.6), pt(8, -46.4), pt(5.4, -46.3)], CROWN.gold, { hatch: 0, line: 0.45 });
  d.pen.hair([pt(6.7, -49), pt(6.7, -46.8)], 0.25, d.ink, 0.8);
  // A knife at the hip.
  part(d, [pt(-7.6, -46.6), pt(-5.4, -46.4), pt(-5.8, -38), pt(-6.8, -36.6), pt(-7.8, -38)], CROWN.leather, { shadow: 0.55, hatch: 0, line: 0.45 });
}

/** The shield arm and the round shield on it, at the front. */
function shield(d: Draw, r: Rig): void {
  const hand = pt(SHIELD_ARM.b.x + r.shield.x, SHIELD_ARM.b.y + r.shield.y);
  part(d, limb(SHIELD_ARM.a, solve(SHIELD_ARM, SHIELD_ARM.a, hand), hand, 5.4, 4.2, 3.6, 5.6, 4.4), far(CROWN.blue), { shadow: 0.55 });
  const c = pt(SHIELD.x + r.shield.x, SHIELD.y + r.shield.y);
  const disc = oval(c.x, c.y, 8.4, 12.2, 36);
  part(d, disc, CROWN.blueDeep, { shadow: 0.7, hatch: 0.2, line: 0.8 });
  d.pen.clipped(disc, () => {
    // The gold cross, drawn as the board curves away.
    part(d, [pt(c.x - 1.5, c.y - 13), pt(c.x + 1.1, c.y - 13), pt(c.x + 1.1, c.y + 13), pt(c.x - 1.5, c.y + 13)], CROWN.gold, { shadow: 0.45, hatch: 0, line: 0.4, gloss: true });
    part(d, [pt(c.x - 9, c.y - 1.7), pt(c.x + 9, c.y - 1.1), pt(c.x + 9, c.y + 1.3), pt(c.x - 9, c.y + 1.5)], CROWN.gold, { shadow: 0.45, hatch: 0, line: 0.4, gloss: true });
    // The board curves away into shadow; old knocks in the paint.
    dab(d, oval(c.x + 5, c.y + 3, 5, 11, 20), SHADOW, 0.4, 1.2);
    for (const [x, y] of [[-4, -6], [3.4, 5.6], [-2.6, 7.4]] as const) d.pen.hair([pt(c.x + x, c.y + y), pt(c.x + x + 1.2, c.y + y + 0.5)], 0.22, d.ink, 0.5);
  });
  // The iron rim and the boss.
  const rim = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return pt(c.x + Math.cos(a) * 7.7, c.y + Math.sin(a) * 11.4);
  });
  d.pen.stroke(rim, 1.3, mix(CROWN.iron, SHADOW, 0.2), 0.9, false);
  gleam(d, rim.slice(21, 31), 0.4, 0.75);
  rivets(d, [0.6, 1.6, 2.6, 3.6, 4.6, 5.6].map((a) => pt(c.x + Math.cos(a) * 7.7, c.y + Math.sin(a) * 11.4)), 0.42);
  steel(d, oval(c.x - 0.2, c.y, 2.8, 3.8, 18), CROWN.steel, { line: 0.6 });
  d.pen.dot(c.x - 1.1, c.y - 1.3, 0.45, IVORY, 0.9);
}

/** The head under a kettle hat: a mail collar round the throat, a dark steel dome, its wide brim shading the eyes. */
function kettleHat(d: Draw, r: Rig): void {
  neck(d, NECK);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.4, -75.4);
    // A mail collar round the throat, the hair cropped short at the nape.
    const collar = [pt(-4.4, -71), pt(-0.4, -70.2), pt(3, -69.4), pt(7, -69.4), pt(7.6, -66), pt(1, -64.6), pt(-6.2, -65.6)];
    part(d, collar, CROWN.steelDark, { shadow: 0.6, hatch: 0, line: 0.5 });
    mail(d, collar, -8, 9, -72, -64);
    head(d, c, { stubble: true, hair: CROWN.hair });
    // The brim's shadow across the eyes.
    dab(d, [pt(0, -80.8), pt(9.8, -80.8), pt(9.6, -77), pt(5, -76.4), pt(0, -77.6)], SHADOW, 0.5, 0.8);
    const dome = [pt(-3.4, -80.6), pt(-3.2, -83.8), pt(-1.2, -86.4), pt(3, -87.2), pt(7, -86.2), pt(8.8, -83.6), pt(9, -80.6)];
    steel(d, dome, CROWN.steel, { line: 0.7, shadow: 0.7 });
    // The comb along the crown, and the riveted band.
    d.pen.hair([pt(-1.4, -86), pt(3, -87.1), pt(7.2, -86)], 0.35, d.ink, 0.7);
    trim(d, [pt(-3.4, -81.4), pt(3, -81), pt(9, -81.4)], 1.1, CROWN.steelDark);
    rivets(d, [pt(-1.2, -81.3), pt(3, -81), pt(7, -81.3)], 0.36);
    const brim = Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2;
      return pt(2.8 + Math.cos(a) * 9.6, -80.2 + Math.sin(a) * 2 + Math.cos(a) * 0.6);
    });
    steel(d, brim, CROWN.steel, { line: 0.7, shadow: 0.75 });
    shine(d, [pt(-5, -80.8), pt(-0.8, -82), pt(3.6, -82.2)], 0.45);
    shine(d, [pt(-1.4, -84), pt(0.2, -85.8), pt(2.4, -86.5)], 0.6);
  });
}

function nearArm(r: Rig): Pt[] {
  const end = pt(r.spear.hand.x - 1.4, r.spear.hand.y + 0.4);
  return limb(NEAR_ARM.a, solve(NEAR_ARM, NEAR_ARM.a, end), end, 6, 4.6, 3.8, 6.2, 4.8);
}

/** The near arm, holding the spear (low at the hip, or lowered for the thrust); the shaft carries on past the hat. */
function spearArm(d: Draw, r: Rig): void {
  const s = r.spear;
  const hand = s.hand;
  const arm = nearArm(r);
  part(d, arm, CROWN.blue, { shadow: 0.6 });
  const elbow = solve(NEAR_ARM, NEAR_ARM.a, pt(hand.x - 1.4, hand.y + 0.4));
  const e = pt(elbow.x - NEAR_ARM.k.x, elbow.y - NEAR_ARM.k.y);
  quilt(d, arm, [[pt(-7.6, -58), pt(-5.6, -57.4), pt(-2, -58.6)], [pt(-8.4, -54), pt(-6.2, -53.4), pt(-2.6, -54.6)], [pt(-8.6 + e.x, -50 + e.y), pt(-6.6 + e.x, -49 + e.y), pt(-4.6 + e.x, -50.4 + e.y)]], CROWN.blue);
  trim(d, [pt(hand.x - 3.2, hand.y - 2.2), pt(hand.x - 2.8, hand.y + 2.3)], 0.9, CROWN.leatherDark);
  if (lowered(s)) {
    shaft(d, s, 0, BLADE + 0.02);
    buttCap(d, s);
  } else shaft(d, s, s.grip - 0.03, BLADE + 0.02);
  fist(d, hand, 2, CROWN.leather, s.angle - ANGLE0 - 1.1);
  spearHead(d, s, r);
}

export const drawSpearman: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = rigOf(pose);
  infantryFigure(ctx, seed, f, { shadowRx: 18 }, (d) => {
    legs(d, r);
    carried(d, r.body, () => {
      gambeson(d, r);
      shield(d, r);
      kettleHat(d, r);
      spearArm(d, r);
    });
  });
};
