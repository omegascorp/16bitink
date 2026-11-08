import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boot, cast, CROWN, far, fist, head, limb, neck, oval, part, pt, quilt, ribbonOf, rivets, steel, trim } from './crownInfantryKit';
import { dab, gleam, infantryFigure, SHADOW } from './crownInfantryPaint';
import { carried, carry, footed, idleCarriage, keyed, legOf, mixPt, moved, poseOf, step, strike, TAU, turn, walkCarriage, type Bones, type Carriage, type Leg } from './crownInfantryRig';
import type { CreatureDrawer, Pose } from './types';

/**
 * The Bowman: a lean, hooded Crown archer, seven heads tall, with a nocked
 * arrow: a deep blue hood and dagged shoulder-cape edged in brass, its long
 * tail down the back, a laced umber leather jerkin over a blue tunic, a
 * quiver of fletched arrows on the back, and a yew longbow as tall as he is
 * held out in front, the string pulled to the jaw. Silhouette: the bow's tall arc at the front, the level arms
 * and the hood's point.
 *
 * Posed: at ease he holds the draw, breathing; he walks with the bow
 * lowered and the string slack; he shoots by drawing fully back to the
 * jaw (the bow bending deeper), loosing at t 0.5 (the string snaps
 * straight, the arrow gone) and following through with the hand flung back.
 */

const YEW = '#8a6238';
/** The bow, upright in its own frame: tips, grip, and how far the grip stands forward of the tips (drawn, at rest). */
const BOW = { x: 21, top: -100, bottom: -24, grip: -62 } as const;
const BEND_REST = 5;
const BEND_HELD = 9;
const BEND_FULL = 12.4;
/** The stance's nock (under the chin), and the arrow's length nock to tip. */
const NOCK0 = pt(5.6, -66.4);
const ARROW = 30;
/** Where the string's drawn to at full draw, against the jaw. */
const NOCK_FULL = pt(1.4, -68.4);

const BACK_LEG: Bones = { a: pt(-2.6, -40), k: pt(-5.8, -22), b: pt(-7.8, -4.5) };
const FRONT_LEG: Bones = { a: pt(3.2, -40), k: pt(7.8, -22), b: pt(10.4, -4.5) };
const HIPS = pt(0, -40);
/** The hood and head are laid out about OLD_NECK and lifted by LIFT onto the tall body. */
const OLD_NECK = pt(3.2, -52.4);
const LIFT = -18.4;
/** Shoulders: the bow arm's (far) and the drawing arm's (near). */
const BOW_SHOULDER = pt(7, -63.6);
const DRAW_SHOULDER = pt(-3, -63.6);
/** The stance's bow fist, and its elbow. */
const BOW_HAND0 = pt(BOW.x + BEND_HELD - 0.6, BOW.grip);
const BOW_ELBOW0 = pt(18.4, -63.6);

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
const drawElbowOf = (hand: Pt, lift = 0): Pt => pt(hand.x - 14.4, hand.y - 0.6 - lift);

function rigOf(pose?: Pose): Rig {
  const { kind, t } = poseOf(pose);
  if (kind === 'walk') {
    const body = walkCarriage(t, HIPS, 2, 0.04, 1.2);
    const fs = step(t, 8, 5);
    const bs = step(t + 0.5, 8, 5);
    const swing = Math.cos(TAU * t);
    const hand = pt(-2.6 - 4.2 * swing, -42.6 + 0.8 * Math.abs(swing));
    const bowHand = pt(21 + 1.2 * swing, -52 - 0.4 * Math.sin(TAU * t * 2));
    return {
      body,
      front: legOf(FRONT_LEG, body, -9.4 + fs.x, fs.lift, fs.tilt),
      back: legOf(BACK_LEG, body, 7.4 + bs.x, bs.lift, bs.tilt),
      bowElbow: pt(13.4 + 0.5 * swing, -55),
      bowHand,
      bowTurn: 0.16 + 0.04 * swing,
      bend: BEND_REST,
      nock: null,
      drawElbow: pt(-6 - 2 * swing, -52.6),
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
    const flung = loosed ? (t < 0.6 ? pt(-2.4, -68.8) : pt(-4.6, -67.6)) : held;
    const hand = loosed ? flung : turn(pt(held.x - 0.4, held.y + 0.2), BOW_SHOULDER, aim);
    return {
      body,
      front: legOf(FRONT_LEG, body, 0, 0, 0),
      back: legOf(BACK_LEG, body, strike(t, -1, -0.5, -0.2), 0, 0),
      bowElbow: turn(BOW_ELBOW0, BOW_SHOULDER, aim),
      bowHand: turn(pt(BOW_HAND0.x + (loosed ? 0.8 : 0), BOW_HAND0.y), BOW_SHOULDER, aim),
      bowTurn: aim,
      bend: loosed ? BEND_REST + 0.6 : BEND_HELD + (BEND_FULL - BEND_HELD) * pull,
      nock,
      drawElbow: loosed ? pt(hand.x - 12.4, hand.y + 0.8) : drawElbowOf(hand, pull * 1.2),
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
  const tube = [pt(-15.6, -78), pt(-10.4, -79.6), pt(-5, -46), pt(-9.6, -44.6)];
  part(d, tube, CROWN.leather, { shadow: 0.65, line: 0.6 });
  trim(d, [pt(-15.6, -77.4), pt(-10.4, -79)], 1.2, CROWN.leatherDark);
  trim(d, [pt(-9.8, -45.4), pt(-5.2, -46.6)], 1, CROWN.gold);
  for (const [x, y, k] of [[-15.8, -82.6, 0], [-13.6, -83.6, 1], [-11.8, -82.2, 0], [-14.6, -81, 1]] as const) {
    const vane = [pt(x + 1, y + 3.6), pt(x - 0.6, y + 0.8), pt(x - 0.2, y - 1.4), pt(x + 1.2, y - 0.4), pt(x + 2, y + 2.8)];
    part(d, vane, k ? CROWN.blueLight : CROWN.linen, { shadow: 0.5, hatch: 0, line: 0.45 });
    d.pen.hair([pt(x + 1.6, y + 4.8), pt(x + 0.3, y - 0.6)], 0.3, d.ink, 0.8);
  }
}

function legs(d: Draw, r: Rig): void {
  const { back: b, front: f } = r;
  const back = limb(b.hip, b.knee, b.ankle, 6.4, 4.4, 3.4, 6.4, 4.8);
  part(d, back, far(CROWN.hose), { shadow: 0.6 });
  footed(d, b, BACK_LEG.b.x, BACK_LEG.b.y, () => boot(d, -7.8, -17, 7.2, far(CROWN.leather)));
  const front = limb(f.hip, f.knee, f.ankle, 6.6, 4.6, 3.6, 6.6, 5);
  part(d, front, CROWN.hose, { shadow: 0.55 });
  footed(d, f, FRONT_LEG.b.x, FRONT_LEG.b.y, () => boot(d, 10.4, -17, 7.6, CROWN.leather));
  const skirt = [pt(-14, -36), pt(14, -36), pt(14, -31), pt(-14, -31)].map((p) => pt(p.x + r.body.dx, p.y + r.body.dy));
  for (const leg of [back, front]) cast(d, leg, skirt, 1.4, 0.45);
}

/** The blue tunic's skirt, the laced jerkin over it, the belt and the quiver's strap. */
function body(d: Draw, r: Rig): void {
  const skirt = [pt(-7.8, -48), pt(8.6, -48), pt(10.8, -32), pt(2, -30.6), pt(-10.2, -31.6)];
  part(d, skirt, CROWN.blue, { shadow: 0.65, line: 0.6 });
  quilt(d, skirt, [[pt(-3, -46), pt(-3.6, -32)], [pt(3, -46), pt(3.6, -32)]], CROWN.blue);
  trim(d, [pt(-10, -32), pt(2, -31), pt(10.6, -32.4)], 1.1);
  const jerkin = [pt(-4, -67), pt(-8.6, -64.4), pt(-9.4, -57), pt(-7.8, -49), pt(-8.6, -42), pt(0, -40.6), pt(9.4, -42), pt(8.6, -48), pt(10, -57), pt(9, -63.4), pt(5.4, -66.6)];
  part(d, jerkin, CROWN.hide, { shadow: 0.7, hatch: 0.22, line: 0.65 });
  // Seams down the panels, the lacing at the front, wear on the leather.
  for (const x of [-3.8, 1.8]) d.pen.hair([pt(x, -64), pt(x - 0.4, -53), pt(x + 0.2, -42)], 0.28, mix(CROWN.hide, SHADOW, 0.55), 0.85);
  for (let y = -62; y < -45; y += 2.6) d.pen.hair([pt(6.4, y), pt(8.2, y + 1.2)], 0.28, CROWN.leatherDark, 0.9);
  d.pen.clipped(jerkin, () => dab(d, [pt(4, -68), pt(14, -68), pt(14, -40), pt(6, -40)], SHADOW, 0.3, 1.6));
  cast(d, jerkin, upperArm(r), 2, 0.38);
  // The strap across the chest to the quiver, and the belt with its pouch.
  const strap = ribbonOf([pt(-8.6, -45), pt(0, -55), pt(7.8, -65)], 1.6);
  part(d, strap, CROWN.leatherDark, { shadow: 0.4, hatch: 0, line: 0.45 });
  const belt = [pt(-8.2, -46.4), pt(0, -45.6), pt(9.2, -46.6), pt(9.2, -44), pt(0, -43), pt(-8.2, -43.8)];
  part(d, belt, CROWN.leatherDark, { shadow: 0.5, hatch: 0, line: 0.5 });
  steel(d, [pt(1.6, -46.2), pt(3.6, -46.2), pt(3.6, -43.4), pt(1.6, -43.4)], CROWN.gold, { hatch: 0, line: 0.45 });
  part(d, [pt(-6.8, -44.2), pt(-2.6, -43.8), pt(-2.8, -38.6), pt(-4.8, -37.4), pt(-6.8, -38.6)], CROWN.leather, { shadow: 0.6, hatch: 0, line: 0.5 });
}

/** A leather bracer along a forearm, from u0 to u1 of the way elbow → wrist. */
function bracer(d: Draw, elbow: Pt, wrist: Pt, u0: number, u1: number, w: number): void {
  part(d, ribbonOf([mixPt(elbow, wrist, u0), mixPt(elbow, wrist, u1)], w), CROWN.leatherDark, { shadow: 0.5, hatch: 0, line: 0.45 });
}

/** The arrow on the string: shaft, steel head, blue fletchings at the nock. */
function arrow(d: Draw, nock: Pt, rest: Pt): void {
  const len = Math.hypot(rest.x - nock.x, rest.y - nock.y) || 1;
  const ux = (rest.x - nock.x) / len;
  const uy = (rest.y - nock.y) / len;
  const at = (s: number, n: number): Pt => pt(nock.x + ux * s - uy * n, nock.y + uy * s + ux * n);
  part(d, ribbonOf([nock, at(ARROW, 0)], 0.75), CROWN.wood, { shadow: 0.4, hatch: 0, line: 0.4 });
  steel(d, [at(ARROW - 0.6, -1.3), at(ARROW + 3.2, 0), at(ARROW - 0.6, 1.3)], CROWN.steel, { hatch: 0, line: 0.45 });
  for (const s of [-1, 1]) part(d, [at(1.6, 0), at(7, 0.2), at(6, s * 1.7), at(2.6, s * 1.5)], s > 0 ? CROWN.linen : CROWN.blueLight, { shadow: 0.4, hatch: 0, line: 0.4 });
}

/** The bow arm and its leather bracer, the longbow in its fist, and the arrow on the string. */
function bowArm(d: Draw, r: Rig): void {
  const wrist = pt(r.bowHand.x - 2, r.bowHand.y + 0.2);
  const arm = limb(BOW_SHOULDER, r.bowElbow, wrist, 5, 4, 3.4, 5.2, 4.2);
  part(d, arm, far(CROWN.blue), { shadow: 0.6 });
  bracer(d, r.bowElbow, wrist, 0.14, 0.9, 3.8);
  const b = bowFrame(r);
  const bx = (y: number): number => bowX(y, r.bend);
  inBow(d, b, () => {
    const spine = Array.from({ length: 25 }, (_, i) => {
      const y = BOW.top + ((BOW.bottom - BOW.top) * i) / 24;
      return pt(bx(y), y);
    });
    const limbShape = ribbonOf(spine, 0, (u) => 0.8 + 1.2 * (1 - Math.abs(u - 0.5) * 2));
    part(d, limbShape, YEW, { shadow: 0.6, hatch: 0, line: 0.55 });
    gleam(d, spine.slice(2, 11).map((p) => pt(p.x - 0.3, p.y)), 0.3, 0.5);
    // Horn nocks at the tips.
    for (const y of [BOW.top, BOW.bottom]) part(d, oval(bx(y), y, 0.8, 1.2, 8), CROWN.linen, { shadow: 0.4, hatch: 0, line: 0.45 });
  });
  // The arrow along the string's line (the string goes on after the finish: see `string`).
  if (r.nock) arrow(d, r.nock, onBow(b, pt(bx(BOW.grip), BOW.grip)));
  inBow(d, b, () => {
    const g = bx(BOW.grip);
    part(d, [pt(g - 2.2, BOW.grip - 3.6), pt(g + 2.2, BOW.grip - 3.4), pt(g + 2.2, BOW.grip + 3.4), pt(g - 2.2, BOW.grip + 3.6)], CROWN.leatherDark, { shadow: 0.5, hatch: 0, line: 0.45 });
    fist(d, pt(g - 0.6, BOW.grip), 1.9, CROWN.skin, 0);
  });
}

/** The head under a hood that runs into a dagged cape over the shoulders, its long tail down the back. */
function hood(d: Draw, r: Rig): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(0, LIFT);
  const NECK = OLD_NECK;
  const sw = r.tail;
  const tail = ribbonOf([pt(-6.6, -65.4), pt(-9.8 - sw * 0.4, -60), pt(-11.4 - sw * 0.8, -52), pt(-11 - sw * 1.2, -45 - sw * 0.2)], 0, (u) => 2.8 - u * 1.4);
  part(d, tail, far(CROWN.blue), { shadow: 0.5, line: 0.55 });
  neck(d, NECK);
  moved(d, r.head.x, r.head.y, r.nod, NECK, () => {
    const c = pt(3.6, -57.2);
    head(d, pt(c.x, c.y + 0.6), { stubble: true });
  });
  const hx = r.head.x * 0.5;
  const hy = r.head.y * 0.5;
  moved(d, hx, hy, 0, NECK, () => {
    const cape = [pt(8.4, -62), pt(5.6, -65.4), pt(1.4, -66.6), pt(-3, -66.6), pt(-8, -67.2), pt(-6, -62.6), pt(-5.4, -57), pt(-4.8, -55), pt(-6, -52.4), pt(-10.4, -48.6), pt(-11.4, -44.4), pt(-9, -42.6), pt(-7, -44), pt(-5, -42), pt(-3, -43.6), pt(-1, -41.8), pt(1, -43.4), pt(3, -41.8), pt(5, -43.4), pt(7, -42), pt(9.6, -43.6), pt(10.8, -45.4), pt(10, -49.4), pt(8, -51.4), pt(5.8, -51.6), pt(4.4, -53.2), pt(4.6, -57.4), pt(5.8, -59.8)];
    part(d, cape, CROWN.blue, { shadow: 0.7, hatch: 0.22, line: 0.7 });
    trim(d, [pt(-11.2, -44.6), pt(-9, -42.9), pt(-7, -44.2), pt(-5, -42.3), pt(-3, -43.8), pt(-1, -42.1), pt(1, -43.6), pt(3, -42.1), pt(5, -43.6), pt(7, -42.3), pt(9.6, -43.8)], 0.7);
    trim(d, [pt(8.2, -61.8), pt(5.8, -59.6), pt(4.7, -57.2), pt(4.5, -53.2), pt(5.8, -51.8)], 0.65);
    // The folds of the cowl, and the hood's shade over the brow.
    for (const [a, b] of [[pt(-2, -63), pt(-1, -55)], [pt(1.4, -64.6), pt(2, -59.4)], [pt(-6.6, -50), pt(-5.4, -44)], [pt(6.6, -50.6), pt(6.8, -44.4)]] as const) d.pen.hair([a, b], 0.3, mix(CROWN.blue, SHADOW, 0.65), 0.8);
    d.pen.clipped(cape, () => gleam(d, [pt(-3.4, -62), pt(-1.6, -65), pt(2, -66)], 0.6, 0.35));
    dab(d, [pt(4.6, -62), pt(9.2, -61.6), pt(9, -58.6), pt(5, -57)], SHADOW, 0.55, 0.7);
  });
  ctx.restore();
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
        d.pen.hair([tip, pt(hand.x + (tip.x - hand.x) * k, hand.y + (tip.y - hand.y) * k)], 0.4, d.ink, 0.95);
      }
    } else {
      d.pen.hair([top, bottom], 0.4, d.ink, 0.95);
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
  return limb(DRAW_SHOULDER, mixPt(DRAW_SHOULDER, r.drawElbow, 0.5), r.drawElbow, 5.6, 5, 4.6, 5.8);
}

/** The drawing arm: the elbow up level behind and the fingers hooked on the string under the chin (or let go, or swinging). */
function drawArm(d: Draw, r: Rig): void {
  const e = r.drawElbow;
  const hand = r.drawHand;
  const wrist = pt(hand.x - (hand.x - e.x) * 0.07, hand.y - (hand.y - e.y) * 0.07);
  const fore = limb(e, mixPt(e, wrist, 0.52), wrist, 4.6, 4.2, 3.4, 4.8, 4.2);
  part(d, upperArm(r), CROWN.blue, { shadow: 0.6 });
  part(d, oval(e.x, e.y, 2.4, 2.4, 12), CROWN.blue, { shadow: 0.6, hatch: 0, line: 0.5 });
  part(d, fore, CROWN.blue, { shadow: 0.6 });
  bracer(d, e, wrist, 0.42, 0.84, 4);
  rivets(d, [mixPt(e, wrist, 0.54), mixPt(e, wrist, 0.72)], 0.35, CROWN.gold);
  const dir = Math.atan2(hand.y - e.y, hand.x - e.x);
  fist(d, hand, 1.9, CROWN.skin, r.open ? dir : 0);
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
  infantryFigure(ctx, seed, f, { shadowRx: 18, after: (d) => string(d, r) }, (d) => {
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
