import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, neck, oval, part, pt, quilt, rivets, shine, steel, trim, wraps } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW } from './crownInfantryPaint';
import { carried, footed, idleCarriage, keyed, legOf, mixPt, moved, poseOf, solve, step, strike, TAU, walkCarriage, type Bones, type Carriage, type Leg } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Spearman: Crown militia in a steel kettle hat and a quilted blue
 * gambeson with gold hems, a round blue shield with a gold cross on the
 * front arm and a long ash spear held low in the other, angled up past the
 * hat with a blue pennon under its leaf blade. Silhouette: the wide-brimmed
 * hat, the round shield and the long diagonal spear.
 *
 * Posed: he breathes and the spear sways at ease; marches with the spear
 * carried and the shield steady; and attacks with a lunging thrust over
 * the shield, the hand sliding up the shaft to drive the spear home.
 */

/** The spear as drawn in the stance: butt to tip. */
const BUTT0 = pt(-9, -3);
const TIP0 = pt(40, -100);
const LENGTH = Math.hypot(TIP0.x - BUTT0.x, TIP0.y - BUTT0.y);
const ANGLE0 = Math.atan2(TIP0.y - BUTT0.y, TIP0.x - BUTT0.x);
/** Where the near hand grips the shaft in the stance, and where the blade starts. */
const GRIP0 = 0.33;
const BLADE = 0.87;
const HAND0 = pt(BUTT0.x + (TIP0.x - BUTT0.x) * GRIP0, BUTT0.y + (TIP0.y - BUTT0.y) * GRIP0);

/** The stance's limbs (body units): hip → knee → ankle, shoulder → elbow → hand. */
const BACK_LEG: Bones = { a: pt(-3, -30), k: pt(-6, -17), b: pt(-8, -6) };
const FRONT_LEG: Bones = { a: pt(3, -30), k: pt(6.5, -17), b: pt(7.4, -6) };
const NEAR_ARM: Bones = { a: pt(-4.6, -48), k: pt(-6.4, -39), b: pt(HAND0.x - 1.4, HAND0.y + 0.4) };
const SHIELD_ARM: Bones = { a: pt(7, -48), k: pt(12, -40), b: pt(17, -40.5) };
const SHIELD = pt(19, -36.5);
const HIPS = pt(0, -28);
const NECK = pt(2.2, -52.6);

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
    const body = walkCarriage(t, HIPS, 1.6, 0.035);
    const fs = step(t, 6, 3.8);
    const bs = step(t + 0.5, 6, 3.8);
    const swing = Math.cos(TAU * t);
    return {
      body,
      front: legOf(FRONT_LEG, body, -6.2 + fs.x, fs.lift, fs.tilt),
      back: legOf(BACK_LEG, body, 6.8 + bs.x, bs.lift, bs.tilt),
      spear: { hand: pt(HAND0.x - 2.4 * swing, HAND0.y - 3.4 + 0.6 * Math.abs(swing)), angle: ANGLE0 + 0.035 * swing, grip: GRIP0 },
      shield: pt(1.2 * swing, -0.4 * Math.sin(TAU * t * 2)),
      head: pt(0.3, 0.3 * Math.sin(TAU * t * 2)),
      nod: 0.03,
      swing: 0.22 * Math.sin(TAU * t * 2),
      ripple: TAU * t * 2,
    };
  }
  if (kind === 'attack') {
    const lunge = strike(t, -0.35, 1, 0.75);
    const body: Carriage = { dx: strike(t, -2, 4, 3), dy: strike(t, 0.6, 2.4, 2), rot: strike(t, -0.06, 0.12, 0.09), pivot: HIPS };
    const keys = (a: number, w: number, h: number, f: number): number => keyed(t, [[0, a], [0.3, w], [0.5, h], [0.75, f], [1, a]]);
    return {
      body,
      front: legOf(FRONT_LEG, body, Math.max(0, lunge) * 6, 0, 0),
      back: legOf(BACK_LEG, body, strike(t, -1.4, 0.6, 0.4), 0, 0),
      spear: {
        hand: pt(keys(HAND0.x, -4.4, 9.6, 8), keys(HAND0.y, -41.4, -46.4, -44.6)),
        angle: keys(ANGLE0, -0.64, -0.53, -0.55),
        grip: keys(GRIP0, 0.5, 0.6, 0.57),
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
  const w = 0.85;
  const shape = [pt(a.x - uy * w, a.y + ux * w), pt(b.x - uy * w, b.y + ux * w), pt(b.x + uy * w, b.y - ux * w), pt(a.x + uy * w, a.y - ux * w)];
  part(d, shape, CROWN.wood, { shadow: 0.5, hatch: 0, line: 0.5 });
  gleam(d, [pt(a.x - uy * 0.3, a.y + ux * 0.3), pt(b.x - uy * 0.3, b.y + ux * 0.3)], 0.35, 0.55);
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
  part(d, pennon, CROWN.blue, { shadow: 0.45, hatch: 0.12, line: 0.6 });
  // The fold: the far panel in shade.
  d.pen.clipped(pennon, () => dab(d, [fl(-6, -2), fl(-16, -1), fl(-16, 9), fl(-9, 8)], SHADOW, 0.3, 0.6));
  d.pen.hair([fl(-5.6, -0.2), fl(-7.4, 3.4), fl(-8.6, 6.4)], 0.35, d.ink, 0.6);
  trim(d, [fl(-0.4, 0.2), fl(-5, -0.4), fl(-10, 1.4), fl(-14.2, 0.7)], 0.8);
  // Socket, then the blade with its midrib.
  steel(d, [at(-2.6, -1.1), at(0.6, -1.25), at(0.6, 1.25), at(-2.6, 1.1)], CROWN.steelDark, { hatch: 0, line: 0.5 });
  const blade = [at(0, -1.2), at(L * 0.3, -2.6), at(L * 0.62, -2.1), at(L, 0), at(L * 0.62, 2.1), at(L * 0.3, 2.6), at(0, 1.2)];
  steel(d, blade, CROWN.steel, { line: 0.6 });
  d.pen.hair([at(0.4, 0), at(L * 0.92, 0)], 0.35, d.ink, 0.7);
  shine(d, [at(L * 0.18, -1.4), at(L * 0.62, -1.3)], 0.55);
}

/** Whether the shaft runs in front of the body (lowered for the thrust) rather than down past the far side of the legs. */
const lowered = (s: Spear): boolean => s.grip > 0.45;

/** Leather wraps round a shin, from just under the knee to above the boot. */
const shinWraps = (d: Draw, l: Leg, w: number): void => wraps(d, mixPt(l.knee, l.ankle, 0.09), mixPt(l.knee, l.ankle, 0.73), w, 4);

function legs(d: Draw, r: Rig): void {
  const { back: b, front: f } = r;
  const back = limb(b.hip, b.knee, b.ankle, 6.6, 5, 4);
  part(d, back, far(CROWN.hose), { shadow: 0.55 });
  shinWraps(d, b, 4.6);
  footed(d, b, BACK_LEG.b.x, BACK_LEG.b.y, () => boot(d, -8, -9.5, 7, far(CROWN.boot)));
  if (!lowered(r.spear)) {
    carried(d, r.body, () => {
      shaft(d, r.spear, 0, r.spear.grip);
      buttCap(d, r.spear);
    });
  }
  const front = limb(f.hip, f.knee, f.ankle, 6.8, 5.2, 4.2);
  part(d, front, CROWN.hose, { shadow: 0.5 });
  shinWraps(d, f, 5);
  footed(d, f, FRONT_LEG.b.x, FRONT_LEG.b.y, () => boot(d, 7.4, -9.5, 7.6));
  // The gambeson's skirt shades the tops of the legs.
  const skirt = [pt(-14, -26), pt(14, -26), pt(14, -22), pt(-14, -22)].map((p) => pt(p.x + r.body.dx, p.y + r.body.dy));
  for (const leg of [back, front]) cast(d, leg, skirt, 1.6, 0.4);
}

/** The quilted gambeson: body and skirt, collar, belt and gold hems. */
function gambeson(d: Draw, r: Rig): void {
  const body = [pt(-3.8, -52.4), pt(-9, -49.8), pt(-10, -44), pt(-8.4, -36), pt(-10, -28), pt(-12, -20.8), pt(-4, -19.8), pt(4, -20.2), pt(11.6, -21.4), pt(10, -28), pt(9, -34), pt(10.8, -41), pt(10.4, -46.8), pt(7.4, -50.8), pt(3.2, -52.6)];
  part(d, body, CROWN.blue, { shadow: 0.55, hatch: 0.2, line: 0.7 });
  const rows = [-5.4, -2, 1.6, 5, 8].map((x) => [pt(x * 0.95, -50.5), pt(x * 0.92, -42), pt(x * 0.9, -35), pt(x * 1.08, -28), pt(x * 1.2, -20)]);
  quilt(d, body, rows, CROWN.blue);
  quilt(d, body, [[pt(-12, -27.4), pt(0, -26.6), pt(12, -27.6)]], CROWN.blue);
  // The near arm's shadow down the side, and the chin's on the collar.
  cast(d, body, nearArm(r), 2.2, 0.34);
  cast(d, body, oval(4, -52.5, 4, 2, 12), 1.2, 0.35);
  trim(d, [pt(-11.2, -21.2), pt(-4, -20.3), pt(4, -20.7), pt(11, -21.8)], 1.6);
  // The padded collar.
  part(d, [pt(-4.2, -52.6), pt(-1, -50.6), pt(3.8, -51.2), pt(4.4, -53.4), pt(0, -53.2), pt(-3.8, -54.4)], CROWN.blueDeep, { shadow: 0.4, hatch: 0, line: 0.5 });
  trim(d, [pt(-4, -52.4), pt(-0.8, -50.6), pt(3.9, -51.1)], 0.8);
  // Belt and buckle.
  const belt = [pt(-8, -35.6), pt(0, -34.4), pt(9.2, -35.4), pt(9.2, -32.8), pt(0, -31.8), pt(-8, -33)];
  part(d, belt, CROWN.leather, { shadow: 0.4, hatch: 0, line: 0.55 });
  steel(d, [pt(5.4, -35.4), pt(8, -35.6), pt(8, -32.4), pt(5.4, -32.3)], CROWN.gold, { hatch: 0, line: 0.5 });
  d.pen.hair([pt(6.7, -35), pt(6.7, -32.8)], 0.3, d.ink, 0.8);
}

/** The shield arm and the round shield on it, at the front. */
function shield(d: Draw, r: Rig): void {
  const hand = pt(SHIELD_ARM.b.x + r.shield.x, SHIELD_ARM.b.y + r.shield.y);
  part(d, limb(SHIELD_ARM.a, solve(SHIELD_ARM, SHIELD_ARM.a, hand), hand, 6, 5, 4), far(CROWN.blue), { shadow: 0.5 });
  const c = pt(SHIELD.x + r.shield.x, SHIELD.y + r.shield.y);
  const disc = oval(c.x, c.y, 7.8, 11.2, 36);
  part(d, disc, CROWN.blue, { shadow: 0.6, hatch: 0.18, line: 0.8 });
  d.pen.clipped(disc, () => {
    // The gold cross, drawn as the board curves away.
    part(d, [pt(c.x - 1.6, c.y - 12), pt(c.x + 1.2, c.y - 12), pt(c.x + 1.2, c.y + 12), pt(c.x - 1.6, c.y + 12)], CROWN.gold, { shadow: 0.35, hatch: 0, line: 0.4, gloss: true });
    part(d, [pt(c.x - 9, c.y - 1.8), pt(c.x + 9, c.y - 1.2), pt(c.x + 9, c.y + 1.4), pt(c.x - 9, c.y + 1.6)], CROWN.gold, { shadow: 0.35, hatch: 0, line: 0.4, gloss: true });
    dab(d, oval(c.x + 4.6, c.y + 3, 4.6, 10, 20), SHADOW, 0.22, 1.2);
  });
  // The iron rim and the boss.
  const rim = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 10.3);
  });
  d.pen.stroke(rim, 1.5, mix(CROWN.steelDark, SHADOW, 0.2), 0.85, false);
  gleam(d, rim.slice(21, 31), 0.5, 0.7);
  rivets(d, [0.6, 1.6, 2.6, 3.6, 4.6, 5.6].map((a) => pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 10.3)), 0.5);
  steel(d, oval(c.x - 0.2, c.y, 2.8, 3.6, 18), CROWN.steel, { line: 0.6 });
  d.pen.dot(c.x - 1.1, c.y - 1.2, 0.6, '#ffffff', 0.9);
}

/** The head under a kettle hat: a steel dome with a wide brim casting its shade on the face. */
function kettleHat(d: Draw, r: Rig): void {
  neck(d, pt(2.2, -52.6));
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.2, -57.4);
    head(d, c, { stubble: true, hair: CROWN.hair, scale: 1.1 });
    d.pen.ctx.save();
    d.pen.ctx.translate(0, -1.2);
    // The brim's shadow across the eyes.
    dab(d, [pt(-1, -61.4), pt(9.6, -61.4), pt(9.4, -58.6), pt(5, -58.2), pt(-1, -59)], SHADOW, 0.32, 0.8);
    const dome = [pt(-3.6, -61.6), pt(-3.6, -65), pt(-1.4, -68.2), pt(3, -69.2), pt(7.4, -68), pt(9.4, -65), pt(9.6, -61.6)];
    steel(d, dome, CROWN.steel, { line: 0.7 });
    // The comb along the crown, and the riveted band.
    d.pen.hair([pt(-1.6, -67.6), pt(3, -69), pt(7.6, -67.6)], 0.45, d.ink, 0.7);
    trim(d, [pt(-3.6, -62.6), pt(3, -62.2), pt(9.6, -62.6)], 1.3, CROWN.steelDark);
    rivets(d, [pt(-1.4, -62.5), pt(3, -62.2), pt(7.4, -62.5)], 0.42);
    const brim = Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2;
      return pt(3 + Math.cos(a) * 10.6, -61.2 + Math.sin(a) * 2.4 + Math.cos(a) * 0.7);
    });
    steel(d, brim, CROWN.steel, { line: 0.75, shadow: 0.7 });
    shine(d, [pt(-5.6, -61.8), pt(-1, -63.2), pt(4, -63.4)], 0.6);
    shine(d, [pt(-1.6, -65.4), pt(0.4, -67.6), pt(2.6, -68.4)], 0.8);
    d.pen.ctx.restore();
  });
}

function nearArm(r: Rig): Pt[] {
  const end = pt(r.spear.hand.x - 1.4, r.spear.hand.y + 0.4);
  return limb(NEAR_ARM.a, solve(NEAR_ARM, NEAR_ARM.a, end), end, 7, 5.4, 4.2);
}

/** The near arm, holding the spear (low at the hip, or lowered for the thrust); the shaft carries on past the hat. */
function spearArm(d: Draw, r: Rig): void {
  const s = r.spear;
  const hand = s.hand;
  const arm = nearArm(r);
  part(d, arm, CROWN.blue, { shadow: 0.5 });
  const elbow = solve(NEAR_ARM, NEAR_ARM.a, pt(hand.x - 1.4, hand.y + 0.4));
  const e = pt(elbow.x - NEAR_ARM.k.x, elbow.y - NEAR_ARM.k.y);
  quilt(d, arm, [[pt(-7.4, -45), pt(-5.6, -44.6), pt(-2, -46)], [pt(-8.6 + e.x, -40.4 + e.y), pt(-6.6 + e.x, -39.4 + e.y), pt(-4.6 + e.x, -40.8 + e.y)]], CROWN.blue);
  trim(d, [pt(hand.x - 3.2, hand.y - 2.3), pt(hand.x - 2.8, hand.y + 2.4)], 1.1);
  if (lowered(s)) {
    shaft(d, s, 0, BLADE + 0.02);
    buttCap(d, s);
  } else shaft(d, s, s.grip - 0.03, BLADE + 0.02);
  fist(d, hand, 2.2, CROWN.leather, s.angle - ANGLE0 - 1.1);
  spearHead(d, s, r);
}

export const drawSpearman: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = rigOf(pose);
  infantryFigure(ctx, seed, f, { shadowRx: 19 }, (d) => {
    legs(d, r);
    carried(d, r.body, () => {
      gambeson(d, r);
      shield(d, r);
      kettleHat(d, r);
      spearArm(d, r);
    });
  });
};
