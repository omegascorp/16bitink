import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, neck, oval, part, pt, quilt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW } from './crownInfantryPaint';
import { carried, carry, footed, idleCarriage, keyed, legOf, mixPt, moved, poseOf, step, strike, TAU, turn, walkCarriage, type Bones, type Carriage, type Leg } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Bowman: a hooded Crown archer with a nocked arrow: a deep blue hood
 * and dagged shoulder-cape with gold edging, its long tail down the back, a
 * laced leather jerkin over a blue tunic, a quiver of blue-fletched arrows
 * on the back, and a tall yew longbow held out in front, the string pulled
 * to the chin. Silhouette: the bow's tall arc at the front, the level arms
 * and the hood's point.
 *
 * Posed: at ease he holds the draw, breathing; he walks with the bow
 * lowered and the string slack; he shoots by drawing fully back to the
 * jaw (the bow bending deeper), loosing at t 0.5 (the string snaps
 * straight, the arrow gone) and following through with the hand flung back.
 */

const YEW = '#c99a5c';
/** The bow, upright in its own frame: tips, grip, and how far the grip stands forward of the tips (drawn, at rest). */
const BOW = { x: 16.6, top: -85, bottom: -13, grip: -49 } as const;
const BEND_REST = 4.4;
const BEND_HELD = 7.6;
const BEND_FULL = 10.4;
/** The stance's nock (under the chin), and the arrow's length nock to tip. */
const NOCK0 = pt(5.4, -49.6);
const ARROW = 29.6;
/** Where the string's drawn to at full draw, against the jaw. */
const NOCK_FULL = pt(0.4, -50.6);

const BACK_LEG: Bones = { a: pt(-2.4, -29), k: pt(-5, -16.5), b: pt(-7, -6) };
const FRONT_LEG: Bones = { a: pt(3, -29), k: pt(7, -16.5), b: pt(9.4, -6) };
const HIPS = pt(0, -27);
const NECK = pt(3.2, -52.4);
/** Shoulders: the bow arm's (far) and the drawing arm's (near). */
const BOW_SHOULDER = pt(7, -48.6);
const DRAW_SHOULDER = pt(-3, -48.6);
/** The stance's bow fist, and its elbow. */
const BOW_HAND0 = pt(BOW.x + BEND_HELD - 0.6, BOW.grip);
const BOW_ELBOW0 = pt(14.4, -48.8);

/** Everything the pose decides, in body units under the carriage (the legs in the frame). */
interface Rig {
  readonly body: Carriage;
  readonly back: Leg;
  readonly front: Leg;
  readonly bowElbow: Pt;
  readonly bowHand: Pt;
  /** The bow's turn from upright (+ top forward), and how deep it bends. */
  readonly bowTurn: number;
  readonly bend: number;
  /** Where the string is drawn to; none when it's slack or loosed. */
  readonly nock: Pt | null;
  readonly drawElbow: Pt;
  readonly drawHand: Pt;
  /** The drawing hand has let go (fingers open). */
  readonly open: boolean;
  /** The loosed string still shivering (0..1), and the arrow's wake ahead of the bow (0..1). */
  readonly shiver: number;
  readonly wake: number;
  readonly head: Pt;
  readonly nod: number;
  /** The hood's tail swung back by this. */
  readonly tail: number;
}

/** The drawing arm's elbow, held up level behind the hand. */
const drawElbowOf = (hand: Pt, lift = 0): Pt => pt(hand.x - 15.6, hand.y - 0.2 - lift);

function rigOf(pose?: Pose): Rig {
  const { kind, t } = poseOf(pose);
  if (kind === 'walk') {
    const body = walkCarriage(t, HIPS, 1.6, 0.04);
    const fs = step(t, 6, 3.8);
    const bs = step(t + 0.5, 6, 3.8);
    const swing = Math.cos(TAU * t);
    const hand = pt(-2.2 - 3.4 * swing, -31.4 + 0.8 * Math.abs(swing));
    const bowHand = pt(15.8 + 1 * swing, -44.6 - 0.4 * Math.sin(TAU * t * 2));
    return {
      body,
      front: legOf(FRONT_LEG, body, -8 + fs.x, fs.lift, fs.tilt),
      back: legOf(BACK_LEG, body, 5.8 + bs.x, bs.lift, bs.tilt),
      bowElbow: pt(10.6 + 0.5 * swing, -43),
      bowHand,
      bowTurn: 0.16 + 0.04 * swing,
      bend: BEND_REST,
      nock: null,
      drawElbow: pt(-5.4 - 1.6 * swing, -39.6),
      drawHand: hand,
      open: false,
      shiver: 0,
      wake: 0,
      head: pt(0.3, 0.3 * Math.sin(TAU * t * 2)),
      nod: 0.03,
      tail: 1.4 + 0.8 * Math.sin(TAU * t * 2),
    };
  }
  if (kind === 'attack') {
    const body: Carriage = { dx: strike(t, -1.2, 0.4, 0.2), dy: strike(t, 0.4, 0.2, 0.3), rot: strike(t, -0.035, 0.01, 0), pivot: HIPS };
    const aim = strike(t, -0.07, -0.05, -0.03);
    const pull = keyed(t, [[0, 0], [0.3, 1], [0.49, 1], [0.5, 1], [1, 0]]);
    const loosed = t >= 0.45 && t < 0.95;
    const held = mixPt(NOCK0, NOCK_FULL, pull);
    const nock = loosed ? null : turn(held, BOW_SHOULDER, aim);
    // The loosed hand flies back past the jaw, then comes forward to nock again.
    const flung = loosed ? (t < 0.6 ? pt(-1.8, -50.6) : pt(-3.6, -49.8)) : held;
    const hand = loosed ? flung : turn(pt(held.x - 0.4, held.y + 0.2), BOW_SHOULDER, aim);
    return {
      body,
      front: legOf(FRONT_LEG, body, 0, 0, 0),
      back: legOf(BACK_LEG, body, strike(t, -0.8, -0.4, -0.2), 0, 0),
      bowElbow: turn(BOW_ELBOW0, BOW_SHOULDER, aim),
      bowHand: turn(pt(BOW_HAND0.x + (loosed ? 0.8 : 0), BOW_HAND0.y), BOW_SHOULDER, aim),
      bowTurn: aim,
      bend: loosed ? BEND_REST + 0.6 : BEND_HELD + (BEND_FULL - BEND_HELD) * pull,
      nock,
      drawElbow: loosed ? pt(hand.x - 12.4, hand.y + 0.6) : drawElbowOf(hand, pull * 1.2),
      drawHand: hand,
      open: loosed,
      shiver: t >= 0.45 && t < 0.6 ? 1 : t >= 0.6 && t < 0.9 ? 0.4 : 0,
      wake: t >= 0.45 && t < 0.6 ? 1 : 0,
      head: pt(strike(t, -0.4, -0.2, 0), strike(t, 0.2, 0, 0)),
      nod: strike(t, -0.02, -0.03, 0),
      tail: strike(t, 0.6, 1.6, 0.8),
    };
  }
  const body = idleCarriage(t, HIPS, 0.9);
  const a = TAU * t;
  // Holding the draw: a slight tremor of the string hand, the bow tip drifting.
  const nock = pt(NOCK0.x + 0.25 * Math.sin(a * 2), NOCK0.y + 0.15 * Math.sin(a));
  const hand = pt(nock.x - 0.4, nock.y + 0.2);
  return {
    body,
    front: legOf(FRONT_LEG, body, 0, 0, 0),
    back: legOf(BACK_LEG, body, 0, 0, 0),
    bowElbow: BOW_ELBOW0,
    bowHand: pt(BOW_HAND0.x, BOW_HAND0.y + 0.2 * Math.sin(a + 0.5)),
    bowTurn: 0.012 * Math.sin(a + 0.5),
    bend: BEND_HELD,
    nock,
    drawElbow: drawElbowOf(hand, 0.2 * Math.sin(a + 1)),
    drawHand: hand,
    open: false,
    shiver: 0,
    wake: 0,
    head: pt(0.25 * Math.sin(a + 1.2), 0.2 * Math.sin(a)),
    nod: 0.015 * Math.sin(a + 0.8),
    tail: 0.5 * Math.sin(a),
  };
}

/** The bow's belly, x at height y, in its own frame. */
const bowX = (y: number, bend: number): number => BOW.x + bend * (1 - ((y - BOW.grip) / ((BOW.bottom - BOW.top) / 2)) ** 2);

/** The bow's own frame: its grip held in the bow hand, turned by the rig. */
interface BowFrame {
  readonly grip: Pt;
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
}

function bowFrame(r: Rig): BowFrame {
  const grip = pt(BOW.x + r.bend, BOW.grip);
  const target = pt(r.bowHand.x + 0.6, r.bowHand.y);
  return { grip, dx: target.x - grip.x, dy: target.y - grip.y, rot: r.bowTurn };
}

/** A point of the bow's frame, in body units. */
const onBow = (b: BowFrame, p: Pt): Pt => {
  const q = turn(p, b.grip, b.rot);
  return pt(q.x + b.dx, q.y + b.dy);
};

const inBow = (d: Draw, b: BowFrame, draw: () => void): void => moved(d, b.dx, b.dy, b.rot, b.grip, draw);

/** The quiver on the back and the arrows' fletchings standing out of it. */
function quiver(d: Draw): void {
  const tube = [pt(-14.4, -58), pt(-9.4, -59.4), pt(-4.6, -31.6), pt(-9, -30.4)];
  part(d, tube, CROWN.leather, { shadow: 0.55, line: 0.6 });
  trim(d, [pt(-14.4, -57.4), pt(-9.4, -58.8)], 1.4, CROWN.leatherDark);
  trim(d, [pt(-9.2, -31.4), pt(-4.8, -32.4)], 1.2, CROWN.gold);
  for (const [x, y, k] of [[-14.6, -62.6, 0], [-12.4, -63.6, 1], [-10.6, -62.2, 0], [-13.4, -61, 1]] as const) {
    const vane = [pt(x + 1, y + 3.6), pt(x - 0.6, y + 0.8), pt(x - 0.2, y - 1.4), pt(x + 1.2, y - 0.4), pt(x + 2, y + 2.8)];
    part(d, vane, k ? CROWN.blueLight : CROWN.linen, { shadow: 0.4, hatch: 0, line: 0.45 });
    d.pen.hair([pt(x + 1.6, y + 4.8), pt(x + 0.3, y - 0.6)], 0.4, d.ink, 0.8);
  }
}

function legs(d: Draw, r: Rig): void {
  const { back: b, front: f } = r;
  const back = limb(b.hip, b.knee, b.ankle, 6, 4.8, 3.8);
  part(d, back, far(CROWN.hose), { shadow: 0.55 });
  footed(d, b, BACK_LEG.b.x, BACK_LEG.b.y, () => boot(d, -7, -15, 6.8, far(CROWN.leather)));
  const front = limb(f.hip, f.knee, f.ankle, 6.2, 5, 4);
  part(d, front, CROWN.hose, { shadow: 0.5 });
  footed(d, f, FRONT_LEG.b.x, FRONT_LEG.b.y, () => boot(d, 9.4, -15, 7.2, CROWN.leather));
  const skirt = [pt(-14, -26), pt(14, -26), pt(14, -22), pt(-14, -22)].map((p) => pt(p.x + r.body.dx, p.y + r.body.dy));
  for (const leg of [back, front]) cast(d, leg, skirt, 1.4, 0.4);
}

/** The blue tunic's skirt, the laced jerkin over it, the belt and the quiver's strap. */
function body(d: Draw, r: Rig): void {
  const skirt = [pt(-7.6, -36), pt(8.4, -36), pt(10.4, -22.6), pt(2, -21.4), pt(-9.8, -22.2)];
  part(d, skirt, CROWN.blue, { shadow: 0.55, line: 0.65 });
  quilt(d, skirt, [[pt(-3, -34), pt(-3.6, -22)], [pt(3, -34), pt(3.6, -22)]], CROWN.blue);
  trim(d, [pt(-9.6, -22.6), pt(2, -21.8), pt(10.2, -23)], 1.4);
  const jerkin = [pt(-4, -51.6), pt(-8.2, -49), pt(-8.8, -42), pt(-7.4, -34), pt(-8, -29.6), pt(0, -28.4), pt(9.2, -29.8), pt(8.4, -35), pt(9.6, -42), pt(8.6, -48), pt(5.4, -51)];
  part(d, jerkin, CROWN.hide, { shadow: 0.6, hatch: 0.22, line: 0.7 });
  // Seams down the panels, the lacing at the front.
  for (const x of [-3.8, 1.8]) d.pen.hair([pt(x, -48), pt(x - 0.4, -40), pt(x + 0.2, -30)], 0.35, mix(CROWN.hide, SHADOW, 0.5), 0.8);
  for (let y = -46; y < -32; y += 2.4) d.pen.hair([pt(6.2, y), pt(8, y + 1.2)], 0.35, CROWN.leatherDark, 0.9);
  cast(d, jerkin, upperArm(r), 2, 0.3);
  // The strap across the chest to the quiver, and the belt with its pouch.
  const strap = ribbonOf([pt(-8.4, -33), pt(0, -41), pt(7.6, -49.4)], 1.8);
  part(d, strap, CROWN.leatherDark, { shadow: 0.3, hatch: 0, line: 0.45 });
  const belt = [pt(-8, -33.4), pt(0, -32.6), pt(9, -33.6), pt(9, -31.2), pt(0, -30.2), pt(-8, -31)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.55 });
  steel(d, [pt(1.6, -33.2), pt(3.6, -33.2), pt(3.6, -30.6), pt(1.6, -30.6)], CROWN.gold, { hatch: 0, line: 0.45 });
  part(d, [pt(-6.8, -31.4), pt(-2.6, -31), pt(-2.8, -26.4), pt(-4.8, -25.2), pt(-6.8, -26.4)], CROWN.leather, { shadow: 0.5, hatch: 0, line: 0.5 });
}

/** A leather bracer along a forearm, from u0 to u1 of the way elbow → wrist. */
function bracer(d: Draw, elbow: Pt, wrist: Pt, u0: number, u1: number, w: number): void {
  part(d, ribbonOf([mixPt(elbow, wrist, u0), mixPt(elbow, wrist, u1)], w), CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.5 });
}

/** The arrow on the string: shaft, steel head, blue fletchings at the nock. */
function arrow(d: Draw, nock: Pt, rest: Pt): void {
  const len = Math.hypot(rest.x - nock.x, rest.y - nock.y) || 1;
  const ux = (rest.x - nock.x) / len;
  const uy = (rest.y - nock.y) / len;
  const at = (s: number, n: number): Pt => pt(nock.x + ux * s - uy * n, nock.y + uy * s + ux * n);
  part(d, ribbonOf([nock, at(ARROW, 0)], 0.9), CROWN.linen, { shadow: 0.3, hatch: 0, line: 0.4 });
  steel(d, [at(ARROW - 0.6, -1.4), at(ARROW + 3.2, 0), at(ARROW - 0.6, 1.4)], CROWN.steel, { hatch: 0, line: 0.45 });
  for (const s of [-1, 1]) part(d, [at(1.6, 0), at(7, 0.2), at(6, s * 1.8), at(2.6, s * 1.6)], CROWN.blueLight, { shadow: 0.3, hatch: 0, line: 0.4 });
}

/** The bow arm and its leather bracer, the longbow in its fist, and the arrow on the string. */
function bowArm(d: Draw, r: Rig): void {
  const wrist = pt(r.bowHand.x - 2, r.bowHand.y + 0.2);
  const arm = limb(BOW_SHOULDER, r.bowElbow, wrist, 5.6, 4.6, 3.8);
  part(d, arm, far(CROWN.blue), { shadow: 0.5 });
  bracer(d, r.bowElbow, wrist, 0.14, 0.9, 4.2);
  const b = bowFrame(r);
  const bx = (y: number): number => bowX(y, r.bend);
  inBow(d, b, () => {
    const spine = Array.from({ length: 25 }, (_, i) => {
      const y = BOW.top + ((BOW.bottom - BOW.top) * i) / 24;
      return pt(bx(y), y);
    });
    const limbShape = ribbonOf(spine, 0, (u) => 0.9 + 1.3 * (1 - Math.abs(u - 0.5) * 2));
    part(d, limbShape, YEW, { shadow: 0.45, hatch: 0, line: 0.6 });
    gleam(d, spine.slice(2, 11).map((p) => pt(p.x - 0.3, p.y)), 0.4, 0.6);
    // Horn nocks at the tips.
    for (const y of [BOW.top, BOW.bottom]) part(d, oval(bx(y), y, 0.9, 1.3, 8), CROWN.linen, { shadow: 0.3, hatch: 0, line: 0.45 });
  });
  // The arrow along the string's line (the string goes on after the finish: see `string`).
  if (r.nock) arrow(d, r.nock, onBow(b, pt(bx(BOW.grip), BOW.grip)));
  inBow(d, b, () => {
    const g = bx(BOW.grip);
    part(d, [pt(g - 2.6, -52.6), pt(g + 2.6, -52.4), pt(g + 2.6, -45.6), pt(g - 2.6, -45.4)], CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.5 });
    fist(d, pt(g - 0.6, BOW.grip), 2.2, CROWN.skin, 0);
  });
}

/** The head under a hood that runs into a dagged cape over the shoulders, its long tail down the back. */
function hood(d: Draw, r: Rig): void {
  const sw = r.tail;
  const tail = ribbonOf([pt(-6.6, -65.4), pt(-9.8 - sw * 0.4, -60), pt(-11.4 - sw * 0.8, -52), pt(-11 - sw * 1.2, -45 - sw * 0.2)], 0, (u) => 2.8 - u * 1.4);
  part(d, tail, far(CROWN.blue), { shadow: 0.5, line: 0.55 });
  neck(d, NECK);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.6, -57.2);
    head(d, c, { stubble: false, scale: 1.1 });
  });
  const hx = r.head.x * 0.5;
  const hy = r.head.y * 0.5;
  moved(d, hx, hy, 0, NECK, () => {
    const cape = [pt(8.4, -62), pt(5.6, -65.4), pt(1.4, -66.6), pt(-3, -66.6), pt(-8, -67.2), pt(-6, -62.6), pt(-5.4, -57), pt(-4.8, -55), pt(-6, -52.4), pt(-10.4, -48.6), pt(-11.4, -44.4), pt(-9, -42.6), pt(-7, -44), pt(-5, -42), pt(-3, -43.6), pt(-1, -41.8), pt(1, -43.4), pt(3, -41.8), pt(5, -43.4), pt(7, -42), pt(9.6, -43.6), pt(10.8, -45.4), pt(10, -49.4), pt(8, -51.4), pt(5.8, -51.6), pt(4.4, -53.2), pt(4.6, -57.4), pt(5.8, -59.8)];
    part(d, cape, CROWN.blue, { shadow: 0.6, hatch: 0.2, line: 0.75 });
    trim(d, [pt(-11.2, -44.6), pt(-9, -42.9), pt(-7, -44.2), pt(-5, -42.3), pt(-3, -43.8), pt(-1, -42.1), pt(1, -43.6), pt(3, -42.1), pt(5, -43.6), pt(7, -42.3), pt(9.6, -43.8)], 0.9);
    trim(d, [pt(8.2, -61.8), pt(5.8, -59.6), pt(4.7, -57.2), pt(4.5, -53.2), pt(5.8, -51.8)], 0.8);
    // The folds of the cowl, and the hood's shade over the brow.
    for (const [a, b] of [[pt(-2, -63), pt(-1, -55)], [pt(1.4, -64.6), pt(2, -59.4)], [pt(-6.6, -50), pt(-5.4, -44)], [pt(6.6, -50.6), pt(6.8, -44.4)]] as const) d.pen.hair([a, b], 0.4, mix(CROWN.blue, SHADOW, 0.6), 0.75);
    d.pen.clipped(cape, () => gleam(d, [pt(-3.4, -62), pt(-1.6, -65), pt(2, -66)], 0.8, 0.5));
    dab(d, [pt(4.6, -62), pt(9.2, -61.6), pt(9, -59.2), pt(5, -57.6)], SHADOW, 0.34, 0.7);
  });
}

/**
 * The bowstring, laid over the finished figure so it stays a fine line:
 * drawn back to the nock, or straight between the tips when slack or
 * loosed (shivering just after the loose), with the arrow's wake ahead.
 */
function string(d: Draw, r: Rig): void {
  carried(d, r.body, () => {
    const b = bowFrame(r);
    const top = onBow(b, pt(BOW.x, BOW.top));
    const bottom = onBow(b, pt(BOW.x, BOW.bottom));
    if (r.nock) {
      const hand = r.drawHand;
      for (const tip of [top, bottom]) {
        const k = 2.2 / Math.hypot(tip.x - hand.x, tip.y - hand.y);
        d.pen.hair([tip, pt(hand.x + (tip.x - hand.x) * k, hand.y + (tip.y - hand.y) * k)], 0.55, d.ink, 0.95);
      }
    } else {
      d.pen.hair([top, bottom], 0.55, d.ink, 0.95);
      if (r.shiver > 0) {
        const mid = mixPt(top, bottom, 0.5);
        for (const s of [-1, 1]) d.pen.hair([top, pt(mid.x + s * 1.6 * r.shiver, mid.y), bottom], 0.35, d.ink, 0.35 * r.shiver);
      }
    }
    if (r.wake > 0) {
      const rest = onBow(b, pt(bowX(BOW.grip, r.bend), BOW.grip));
      for (const [y, x0, x1] of [[-1.6, 6, 18], [0, 4, 26], [1.6, 7, 16]] as const) {
        d.pen.hair([pt(rest.x + x0, rest.y + y - x0 * 0.06), pt(rest.x + x1, rest.y + y - x1 * 0.06)], 0.5, d.ink, 0.55 * r.wake);
      }
    }
  });
}

function upperArm(r: Rig): Pt[] {
  return limb(DRAW_SHOULDER, mixPt(DRAW_SHOULDER, r.drawElbow, 0.5), r.drawElbow, 6.2, 5.6, 5.2);
}

/** The drawing arm: the elbow up level behind and the fingers hooked on the string under the chin (or let go, or swinging). */
function drawArm(d: Draw, r: Rig): void {
  const e = r.drawElbow;
  const hand = r.drawHand;
  const wrist = pt(hand.x - (hand.x - e.x) * 0.07, hand.y - (hand.y - e.y) * 0.07);
  const fore = limb(e, mixPt(e, wrist, 0.52), wrist, 5.2, 4.6, 3.8);
  part(d, upperArm(r), CROWN.blue, { shadow: 0.5 });
  part(d, oval(e.x, e.y, 2.8, 2.8, 12), CROWN.blue, { shadow: 0.5, hatch: 0, line: 0.55 });
  part(d, fore, CROWN.blue, { shadow: 0.5 });
  bracer(d, e, wrist, 0.42, 0.84, 4.4);
  rivets(d, [mixPt(e, wrist, 0.54), mixPt(e, wrist, 0.72)], 0.4, CROWN.gold);
  const dir = Math.atan2(hand.y - e.y, hand.x - e.x);
  fist(d, hand, 2.1, CROWN.skin, r.open ? dir : 0);
  if (r.open) {
    // The fingers sprung open off the string.
    for (const a of [-0.5, 0, 0.5]) d.pen.hair([pt(hand.x + Math.cos(dir + a) * 1.6, hand.y + Math.sin(dir + a) * 1.6), pt(hand.x + Math.cos(dir + a * 1.3) * 3.4, hand.y + Math.sin(dir + a * 1.3) * 3.4)], 0.7, CROWN.skinShade, 0.9);
  }
}

/**
 * Where the arrow leaves the bow at the loose (t 0.5), in frame units: its head as it stood at full
 * draw, the projectile's start (it flies on along the aim, a few degrees up).
 */
export const BOWMAN_ARROW_FROM: Pt = (() => {
  const r = rigOf({ kind: 'attack', t: 0.3 });
  const nock = r.nock ?? NOCK_FULL;
  const rest = onBow(bowFrame(r), pt(bowX(BOW.grip, r.bend), BOW.grip));
  const len = Math.hypot(rest.x - nock.x, rest.y - nock.y) || 1;
  return carry(r.body, pt(nock.x + ((rest.x - nock.x) / len) * (ARROW + 3.2), nock.y + ((rest.y - nock.y) / len) * (ARROW + 3.2)));
})();

export const drawBowman: CreatureDrawer = (ctx, seed, f, pose) => {
  const r = rigOf(pose);
  infantryFigure(ctx, seed, f, { shadowRx: 19, after: (d) => string(d, r) }, (d) => {
    carried(d, r.body, () => quiver(d));
    legs(d, r);
    carried(d, r.body, () => {
      body(d, r);
      bowArm(d, r);
      hood(d, r);
      drawArm(d, r);
    });
  });
};
