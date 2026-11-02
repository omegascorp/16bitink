import { INK, Pen, type Pt } from '../../../src/art/pen';
import { DIVER_SCALE, type DiverArms, type DiverFace, type DiverPose } from './story';

/**
 * The lobster diver, in pen: a navy wetsuit with orange piping, a silver
 * tank and a regulator, a yellow pair of long fins, a mask on a hooded
 * head, a mesh bag with two red lobsters in it. Drawn upright (head up,
 * facing +x, the hip at the origin); the pose turns and places him.
 */

const SUIT = '#20323e';
const SUIT_LIGHT = '#385266';
const PIPING = '#e0662a';
const TANK = '#c9cfcb';
const TANK_SHADE = '#8d9694';
const BRASS = '#c79a3a';
const FIN = '#f2c230';
const FIN_SHADE = '#b88a14';
const FIN_LIGHT = '#fde6a0';
const SKIN = '#ecc6a0';
const GLASS = '#a9dde4';
const BAG = '#d9742a';
const LOBSTER = '#b8321f';

const SHOULDER: Pt = { x: 1, y: -58 };
const HEAD: Pt = { x: 5, y: -82 };
const HEAD_R = 17;

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 71 + boil * 977, 0.9);

/** A point `len` from `from`, at `angle` from straight down (towards +x positive). */
const along = (from: Pt, angle: number, len: number): Pt => ({ x: from.x + Math.sin(angle) * len, y: from.y + Math.cos(angle) * len });

function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 4;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function shape(pen: Pen, pts: readonly Pt[], fill: string, width = 2.4): void {
  pen.fill(pts, fill, 1);
  pen.closed(pts, width, INK);
}

interface Legs {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly tip: Pt;
}

/** A leg and its fin: thigh, shin, then the blade, angles from straight down. */
function legOf(hip: Pt, a1: number, a2: number, a3: number): Legs {
  const knee = along(hip, a1, 44);
  const ankle = along(knee, a2, 44);
  return { hip, knee, ankle, tip: along(ankle, a3, 66) };
}

function drawFin(pen: Pen, l: Legs, a3: number): void {
  const d = { x: Math.sin(a3), y: Math.cos(a3) };
  const n = { x: d.y, y: -d.x };
  const p = (u: number, w: number): Pt => ({ x: l.ankle.x + d.x * 66 * u + n.x * w, y: l.ankle.y + d.y * 66 * u + n.y * w });
  const blade = [p(0, -5), p(0.35, -9), p(0.8, -17), p(1, -15), p(1.04, 0), p(1, 15), p(0.8, 17), p(0.35, 9), p(0, 5)];
  pen.fill(blade, FIN, 1);
  pen.hatch(blade, 6, Math.atan2(d.y, d.x) + 1.2, 1, { color: FIN_SHADE, alpha: 0.4 });
  pen.hair([p(0.05, -2), p(0.5, -4), p(0.95, -8)], 2.2, FIN_LIGHT, 0.9);
  pen.hair([p(0.1, 0), p(0.97, 0)], 1.4, FIN_SHADE, 0.8);
  pen.closed(blade, 2.6, INK);
}

function drawLeg(ctx: CanvasRenderingContext2D, pen: Pen, l: Legs, a3: number): void {
  limb(ctx, [l.hip, l.knee, l.ankle], 17, SUIT);
  pen.hair([{ x: l.hip.x + 4, y: l.hip.y + 6 }, { x: l.knee.x + 4, y: l.knee.y }, { x: l.ankle.x + 3, y: l.ankle.y - 4 }], 2, PIPING, 0.85);
  drawFin(pen, l, a3);
}

interface Hands {
  readonly near: Pt;
  readonly far: Pt;
  readonly elbows: readonly [Pt, Pt];
}

function handsFor(arms: DiverArms, s: number): Hands {
  switch (arms) {
    case 'work':
      return { near: { x: 26, y: -22 }, far: { x: 34, y: -44 }, elbows: [{ x: 10, y: -34 }, { x: 14, y: -46 }] };
    case 'torch':
      return { near: { x: 48, y: -56 }, far: { x: 40, y: -52 }, elbows: [{ x: 22, y: -42 }, { x: 18, y: -46 }] };
    case 'flail':
      return { near: { x: 46 + 8 * s, y: -112 - 6 * s }, far: { x: -30 - 8 * s, y: -108 + 8 * s }, elbows: [{ x: 32, y: -82 }, { x: -22, y: -80 }] };
    case 'cling':
      return { near: { x: 38, y: -92 }, far: { x: 22, y: -100 }, elbows: [{ x: 26, y: -72 }, { x: 14, y: -78 }] };
    case 'rest':
      return { near: { x: 20, y: -20 }, far: { x: -4, y: -22 }, elbows: [{ x: 14, y: -38 }, { x: -2, y: -40 }] };
  }
}

function drawBag(ctx: CanvasRenderingContext2D, pen: Pen, hand: Pt, down: Pt): void {
  const c = { x: hand.x + down.x * 30, y: hand.y + down.y * 30 };
  const side = { x: -down.y, y: down.x };
  const sack = [
    { x: hand.x + side.x * 4, y: hand.y + side.y * 4 }, { x: c.x + side.x * 20, y: c.y + side.y * 20 }, { x: c.x + down.x * 24 + side.x * 14, y: c.y + down.y * 24 + side.y * 14 },
    { x: c.x + down.x * 30, y: c.y + down.y * 30 }, { x: c.x + down.x * 24 - side.x * 14, y: c.y + down.y * 24 - side.y * 14 }, { x: c.x - side.x * 20, y: c.y - side.y * 20 },
    { x: hand.x - side.x * 4, y: hand.y - side.y * 4 },
  ];
  pen.fill(sack, BAG, 0.9);
  pen.hatch(sack, 6, 0.7, 1, { color: '#7a3a12', alpha: 0.5 });
  pen.hatch(sack, 6, -0.7, 1, { color: '#7a3a12', alpha: 0.5 });
  // Two lobsters in it.
  for (const k of [-1, 1]) {
    const at = { x: c.x + down.x * 14 + side.x * 8 * k, y: c.y + down.y * 14 + side.y * 8 * k };
    pen.dot(at.x, at.y, 6, LOBSTER, 1);
    pen.hair([at, { x: at.x + side.x * 12 * k + down.x * 6, y: at.y + side.y * 12 * k + down.y * 6 }], 2.6, LOBSTER, 1);
  }
  pen.closed(sack, 2.4, INK);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hand.x, hand.y);
  ctx.lineTo(hand.x + down.x * 6, hand.y + down.y * 6);
  ctx.stroke();
  ctx.restore();
}

function drawTorch(pen: Pen, hand: Pt): void {
  shape(pen, [{ x: hand.x - 6, y: hand.y - 8 }, { x: hand.x + 24, y: hand.y - 11 }, { x: hand.x + 24, y: hand.y + 11 }, { x: hand.x - 6, y: hand.y + 8 }], '#2a3138', 2);
  shape(pen, [{ x: hand.x + 24, y: hand.y - 15 }, { x: hand.x + 34, y: hand.y - 19 }, { x: hand.x + 34, y: hand.y + 19 }, { x: hand.x + 24, y: hand.y + 15 }], '#fff3b8', 2);
}

/** The head, front on so the face reads even side on. */
function drawHead(ctx: CanvasRenderingContext2D, pen: Pen, face: DiverFace, maskUp: boolean): void {
  const { x, y } = HEAD;
  const r = HEAD_R;
  ctx.save();
  ctx.translate(x, y);
  pen.dot(0, 0, r, SUIT, 1);
  pen.dot(r * 0.2, -r * 0.25, r * 0.55, SUIT_LIGHT, 0.4);
  // The face opening in the hood.
  pen.dot(2, 3, r * 0.74, SKIN, 1);
  pen.circle(0, 0, r, 2.6, INK);
  const ex = 6.2;
  const ey = -1.5;
  if (!maskUp) {
    // The mask: a dark frame round a clear glass, the eyes behind it.
    shape(pen, [{ x: -13, y: -7 }, { x: 13, y: -7 }, { x: 14, y: 2 }, { x: 8, y: 6 }, { x: 0, y: 3 }, { x: -8, y: 6 }, { x: -14, y: 2 }], '#142029', 2.2);
    pen.fill([{ x: -11.5, y: -5.5 }, { x: 11.5, y: -5.5 }, { x: 12, y: 1.5 }, { x: 7.5, y: 4 }, { x: 0, y: 1.5 }, { x: -7.5, y: 4 }, { x: -12, y: 1.5 }], GLASS, 0.8);
    drawEyes(pen, face, ex, ey, true);
    pen.hair([{ x: -10, y: -5 }, { x: -4, y: -5.5 }], 1.6, '#ffffff', 0.9);
    drawMouth(pen, face, true);
  } else {
    // Pushed up on the forehead.
    shape(pen, [{ x: -13, y: -15 }, { x: 13, y: -15 }, { x: 14, y: -9 }, { x: 8, y: -6 }, { x: 0, y: -8 }, { x: -8, y: -6 }, { x: -14, y: -9 }], '#142029', 2.2);
    pen.fill([{ x: -11, y: -13.5 }, { x: 11, y: -13.5 }, { x: 11.5, y: -10 }, { x: 0, y: -10.5 }, { x: -11.5, y: -10 }], GLASS, 0.8);
    drawEyes(pen, face, ex, ey + 2, false);
    drawMouth(pen, face, false);
  }
  ctx.restore();
}

function eyeAt(pen: Pen, x: number, y: number, r: number, look: Pt): void {
  pen.dot(x, y, r, '#fbf8ef', 1);
  pen.circle(x, y, r, 1.1, INK);
  pen.dot(x + look.x * r * 0.4, y + look.y * r * 0.4, r * 0.5, INK, 1);
}

function drawEyes(pen: Pen, face: DiverFace, ex: number, ey: number, masked: boolean): void {
  if (face === 'wide') {
    eyeAt(pen, -ex, ey, 4.2, { x: 0, y: 0 });
    eyeAt(pen, ex, ey, 4.2, { x: 0, y: 0 });
  } else if (face === 'nervous') {
    eyeAt(pen, -ex, ey, 3.9, { x: 0.6, y: 0.8 });
    eyeAt(pen, ex, ey, 3.9, { x: 0.6, y: 0.8 });
  } else if (face === 'sad') {
    pen.hair([{ x: -ex - 3, y: ey - 1 }, { x: -ex, y: ey + 1.5 }, { x: -ex + 3, y: ey - 1 }], 1.8, INK, 1);
    pen.hair([{ x: ex - 3, y: ey - 1 }, { x: ex, y: ey + 1.5 }, { x: ex + 3, y: ey - 1 }], 1.8, INK, 1);
  } else {
    pen.dot(-ex, ey, 2.2, INK);
    pen.dot(ex, ey, 2.2, INK);
  }
  if (!masked) {
    const up = face === 'sad' ? 2 : 0;
    pen.hair([{ x: -ex - 4, y: ey - 5 + up }, { x: -ex + 3, y: ey - 6 - up }], 1.6, INK, 0.8);
    pen.hair([{ x: ex - 3, y: ey - 6 - up }, { x: ex + 4, y: ey - 5 + up }], 1.6, INK, 0.8);
  }
}

/** The regulator in his teeth, or a sad small mouth once the mask is up. */
function drawMouth(pen: Pen, face: DiverFace, masked: boolean): void {
  if (masked) {
    pen.dot(1, 10, 4.6, '#6c747a', 1);
    pen.circle(1, 10, 4.6, 1.6, INK);
    pen.dot(1, 10, 1.8, '#1a1a1a', 1);
  } else {
    pen.hair(face === 'sad' ? [{ x: -4, y: 11 }, { x: 0, y: 9 }, { x: 4, y: 11 }] : [{ x: -4, y: 10 }, { x: 0, y: 11.5 }, { x: 4, y: 10 }], 1.8, INK, 0.95);
  }
}

/** Where the regulator is in the world (for the bubbles), given the pose. */
export function regulatorOf(p: DiverPose): Pt {
  const s = DIVER_SCALE;
  const local = { x: HEAD.x + 1, y: HEAD.y + 10 };
  const c = Math.cos(p.rot);
  const n = Math.sin(p.rot);
  return { x: p.x + (local.x * c - local.y * n) * s, y: p.y + (local.x * n + local.y * c) * s };
}

/** Where the torch's lens is in the world. */
export function torchOf(p: DiverPose): Pt {
  const h = handsFor('torch', 0).near;
  const local = { x: h.x + 36, y: h.y };
  const c = Math.cos(p.rot);
  const n = Math.sin(p.rot);
  return { x: p.x + (local.x * c - local.y * n) * DIVER_SCALE, y: p.y + (local.x * n + local.y * c) * DIVER_SCALE };
}

export function drawDiver(ctx: CanvasRenderingContext2D, p: DiverPose, boil: number, seed = 5): void {
  const pen = penFor(ctx, seed, boil);
  const s = Math.sin(p.kick * 1.4);
  // Legs trail behind (the body's turn is what lays him down in the mouth); the kick swings them.
  const a1 = 0.1 + 0.28 * s;
  const a2 = 0.16 - 0.34 * s;
  const a3 = 0.35 + 0.1 * s;
  const near = legOf({ x: 4, y: 0 }, a1, a2, a3);
  const far = legOf({ x: -4, y: 0 }, a1 - 0.22, a2 - 0.2, a3 - 0.1);
  const h = handsFor(p.arms, s);
  // The world's down, in his own frame, for the bag to hang along.
  const down = { x: Math.sin(p.rot), y: Math.cos(p.rot) };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(DIVER_SCALE, DIVER_SCALE);
  // Far leg and arm, then the tank on his back.
  drawLeg(ctx, pen, far, a3 - 0.1);
  limb(ctx, [SHOULDER, h.elbows[1], h.far], 12, SUIT);
  const tank = [{ x: -38, y: -76 }, { x: -22, y: -78 }, { x: -20, y: -8 }, { x: -36, y: -6 }];
  pen.fill(tank, TANK, 1);
  pen.hatch(tank, 5, 1.2, 1, { color: TANK_SHADE, alpha: 0.5 });
  pen.closed(tank, 2.6, INK);
  pen.hair([{ x: -37, y: -60 }, { x: -21, y: -62 }], 3, '#3c4650', 0.9);
  pen.dot(-30, -82, 5, BRASS, 1);
  pen.circle(-30, -82, 5, 1.8, INK);
  // The torso with its piping, over the tank.
  const torso = [{ x: -18, y: 4 }, { x: -20, y: -34 }, { x: -15, y: -60 }, { x: 15, y: -62 }, { x: 19, y: -34 }, { x: 15, y: 4 }];
  shape(pen, torso, SUIT);
  pen.hatch(torso, 6, -0.9, 0.8, { color: '#0a1218', alpha: 0.3 });
  pen.hair([{ x: -16, y: -50 }, { x: -12, y: -14 }], 2.2, PIPING, 0.9);
  pen.hair([{ x: 13, y: -52 }, { x: 15, y: -14 }], 2.2, PIPING, 0.9);
  pen.hair([{ x: -17, y: -30 }, { x: 18, y: -30 }], 1.6, INK, 0.6);
  // A hose from the regulator over his shoulder to the tank.
  pen.stroke([{ x: HEAD.x + 4, y: HEAD.y + 12 }, { x: -2, y: -64 }, { x: -22, y: -82 }, { x: -30, y: -82 }], 2.4, '#1c2126', 1, false);
  drawLeg(ctx, pen, near, a3);
  drawHead(ctx, pen, p.face, p.maskUp);
  limb(ctx, [SHOULDER, h.elbows[0], h.near], 13, SUIT);
  pen.hair([SHOULDER, h.elbows[0]], 2, PIPING, 0.8);
  pen.dot(h.near.x, h.near.y, 6.5, '#1a2128', 1);
  pen.circle(h.near.x, h.near.y, 6.5, 1.6, INK);
  pen.dot(h.far.x, h.far.y, 6, '#1a2128', 1);
  pen.circle(h.far.x, h.far.y, 6, 1.6, INK);
  if (p.arms === 'torch') drawTorch(pen, h.near);
  // The bag hangs along the world's down, which in his own frame is (sin rot, cos rot).
  if (p.bag) drawBag(ctx, pen, h.near, down);
  ctx.restore();
}
