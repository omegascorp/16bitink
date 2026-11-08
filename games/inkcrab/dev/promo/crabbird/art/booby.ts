import { Pen, type Pt } from '../../../../src/art/pen';
import type { BirdPose } from '../story';
import { blob, bake, type Baked, drawBaked, flecks, inside, MOON_RIM, NIGHT_INK, seeded, soft, spline, trace } from './paint';

/**
 * The red-footed booby in profile, facing right: a white head and breast, a
 * brown back and wing, a long white wedge of tail, the pale blue bill with
 * its pink base and the bright red webbed feet. Local origin: the feet on the
 * branch, y up the screen is negative. Body, wing and head are baked (their
 * ink boils); the eye is drawn live, so it can open.
 */
const WHITE = '#fbf6ec';
const CREAM = '#efe2c6';
const LAVENDER = '#8e8fbd';
const SHADOW = '#454670';
const BROWN = '#7a5a42';
const BROWN_LIT = '#b69474';
const UMBER = '#3f2b26';
const DARK = '#231722';

const BODY: readonly Pt[] = spline([
  { x: 112, y: -268 }, { x: 170, y: -220 }, { x: 196, y: -160 }, { x: 176, y: -102 }, { x: 118, y: -62 }, { x: 30, y: -44 },
  { x: -66, y: -50 }, { x: -150, y: -72 }, { x: -210, y: -82 }, { x: -262, y: -68 }, { x: -318, y: -44 },
  { x: -284, y: -104 }, { x: -240, y: -156 }, { x: -176, y: -214 }, { x: -76, y: -268 }, { x: 28, y: -292 },
], 7, true);

function paintBody(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 8100 + f, 1.1);
  const g = ctx.createLinearGradient(-20, -292, 60, -40);
  g.addColorStop(0, BROWN);
  g.addColorStop(0.38, '#c7ae93');
  g.addColorStop(0.6, WHITE);
  g.addColorStop(1, '#cfcfe2');
  ctx.fillStyle = g;
  trace(ctx, BODY);
  ctx.fill();
  inside(ctx, BODY, () => {
    const rnd = seeded(81);
    // The white wedge of tail, its feathers long and laid together.
    const tail = ctx.createLinearGradient(-190, -130, -318, -44);
    tail.addColorStop(0, `${WHITE}00`);
    tail.addColorStop(0.3, WHITE);
    tail.addColorStop(1, '#e4e2ee');
    ctx.fillStyle = tail;
    ctx.fillRect(-460, -180, 270, 170);
    blob(ctx, 80, -130, 140, WHITE, 0.95, 90, 0.2);
    // Soft breast feathers: rows of small scallops.
    for (let i = 0; i < 300; i++) {
      const x = -120 + rnd() * 320;
      const y = -210 + rnd() * 170;
      const w = 7 + rnd() * 7;
      pen.hair([{ x: x - w, y }, { x: x - w * 0.2, y: y + w * 0.62 }, { x: x + w, y: y + w * 0.1 }], 1.1, LAVENDER, 0.42);
    }
    for (let i = 0; i < 9; i++) {
      const y0 = -150 + i * 11;
      pen.hair(spline([{ x: -200, y: y0 }, { x: -262, y: y0 + 36 + i * 2 }, { x: -316, y: -44 }], 6), 1.5, SHADOW, 0.34);
    }
    flecks(ctx, { x0: -200, y0: -290, x1: 200, y1: -160 }, 150, rnd, [UMBER, BROWN_LIT], 1, 6, 0.3, (_, y) => (y < -190 ? 1 : 0.2));
    // Under the belly, turned from the moon.
    const under = ctx.createLinearGradient(30, -130, 40, -36);
    under.addColorStop(0, `${SHADOW}00`);
    under.addColorStop(1, `${SHADOW}e8`);
    ctx.fillStyle = under;
    ctx.fillRect(-470, -130, 700, 110);
    soft(ctx, spline([{ x: 186, y: -210 }, { x: 196, y: -160 }, { x: 170, y: -104 }], 6), 44, SHADOW, 0.34);
  });
  pen.stroke([...BODY, BODY[0]!], 3.2, NIGHT_INK, 0.9, false);
}

/** One long feather: a leaf from root to tip, its shaft and pale edge. */
function feather(ctx: CanvasRenderingContext2D, pen: Pen, root: Pt, tip: Pt, width: number, base: string, edgeColor: string, dark: string): void {
  const d = Math.hypot(tip.x - root.x, tip.y - root.y) || 1;
  const n = { x: -(tip.y - root.y) / d, y: (tip.x - root.x) / d };
  const at = (u: number, s: number): Pt => ({ x: root.x + (tip.x - root.x) * u + n.x * s, y: root.y + (tip.y - root.y) * u + n.y * s });
  const shape = spline([at(0, -width * 0.24), at(0.4, -width * 0.5), at(0.82, -width * 0.42), at(1, 0), at(0.82, width * 0.42), at(0.4, width * 0.5), at(0, width * 0.24)], 5, true);
  const g = ctx.createLinearGradient(at(0.5, -width * 0.5).x, at(0.5, -width * 0.5).y, at(0.5, width * 0.5).x, at(0.5, width * 0.5).y);
  g.addColorStop(0, edgeColor);
  g.addColorStop(0.42, base);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  pen.hair([at(0.04, 0), at(0.5, 0), at(0.96, 0)], 1.2, dark, 0.6);
  pen.stroke([...shape, shape[0]!], 1.7, NIGHT_INK, 0.72, false);
}

/** The folded wing lies along the body. Its local origin is the shoulder, the tip towards -x. */
function foldedWing(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 8200 + f, 0.8);
  // Long flight feathers first, from the tip inwards.
  for (let i = 0; i < 9; i++) {
    const root = { x: -110 - i * 4, y: 30 + i * 6 };
    const tip = { x: -420 + i * 26, y: 136 - i * 7 };
    feather(ctx, pen, root, tip, 62, UMBER, '#8a6c56', DARK);
  }
  // Secondaries, then rows of coverts getting smaller towards the shoulder.
  for (let i = 0; i < 9; i++) {
    const root = { x: -44 - i * 18, y: 18 + i * 2 };
    feather(ctx, pen, root, { x: root.x - 150, y: root.y + 78 - i * 3 }, 60, BROWN, BROWN_LIT, UMBER);
  }
  for (let row = 0; row < 3; row++) {
    const count = 11 - row * 2;
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const root = { x: 46 - u * (210 - row * 28), y: -18 + row * 2 + 34 * u + row * -16 };
      const len = 84 - row * 16;
      feather(ctx, pen, root, { x: root.x - len, y: root.y + len * 0.48 }, 46 - row * 6, row === 2 ? '#8e6d54' : BROWN, row === 2 ? '#d6b89a' : BROWN_LIT, UMBER);
    }
  }
  soft(ctx, spline([{ x: 54, y: -38 }, { x: -40, y: -46 }, { x: -150, y: -14 }], 8), 30, MOON_RIM, 0.3);
}

/** The opened wing: flight feathers fanned from the arm, small coverts laid like scales over their roots. */
function openWing(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 8300 + f, 0.8);
  // Long hand feathers at the tip, shortening along the arm.
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const root = { x: -270 + u * 250, y: 16 - u * 10 };
    const a = Math.PI * 0.62 - u * 0.84;
    const len = 400 - 150 * u;
    feather(ctx, pen, root, { x: root.x + Math.cos(a) * len, y: root.y + Math.sin(a) * len }, 74, UMBER, '#94775f', DARK);
  }
  const arm = spline([{ x: 40, y: -30 }, { x: -130, y: -44 }, { x: -296, y: -14 }, { x: -270, y: 60 }, { x: -120, y: 80 }, { x: 30, y: 60 }], 8, true);
  const g = ctx.createLinearGradient(0, -40, 0, 80);
  g.addColorStop(0, BROWN_LIT);
  g.addColorStop(1, BROWN);
  ctx.fillStyle = g;
  trace(ctx, arm);
  ctx.fill();
  for (let row = 2; row >= 0; row--) {
    for (let i = 0; i < 15; i++) {
      const u = i / 14;
      const root = { x: 24 - u * 296 + (row % 2) * 9, y: -24 + row * 26 - 12 * Math.sin(u * Math.PI) };
      feather(ctx, pen, root, { x: root.x - 12, y: root.y + 54 + row * 8 }, 38, BROWN, BROWN_LIT, UMBER);
    }
  }
  soft(ctx, spline([{ x: 30, y: -30 }, { x: -130, y: -40 }, { x: -280, y: -12 }], 8), 14, MOON_RIM, 0.3);
}

const HEAD_OUTLINE: readonly Pt[] = spline([
  { x: -66, y: 92 }, { x: -82, y: 26 }, { x: -62, y: -40 }, { x: -6, y: -84 }, { x: 56, y: -84 }, { x: 96, y: -52 }, { x: 104, y: -8 },
  { x: 84, y: 36 }, { x: 70, y: 94 },
], 7, true);

/** Bill, closed: an upper and a lower half turning on the gape. Origin at the gape's corner. */
const UPPER: readonly Pt[] = spline([{ x: -8, y: -44 }, { x: 52, y: -42 }, { x: 110, y: -24 }, { x: 156, y: 2 }, { x: 176, y: 24 }, { x: 154, y: 24 }, { x: 92, y: 8 }, { x: 34, y: 0 }, { x: -10, y: 2 }], 5, true);
const LOWER: readonly Pt[] = spline([{ x: -10, y: 2 }, { x: 34, y: 0 }, { x: 92, y: 8 }, { x: 154, y: 26 }, { x: 126, y: 40 }, { x: 68, y: 42 }, { x: 10, y: 36 }], 5, true);
/** Where the gape sits on the head, and the eye. */
const GAPE: Pt = { x: 84, y: -14 };
const EYE: Pt = { x: 34, y: -30 };

function billHalf(ctx: CanvasRenderingContext2D, pen: Pen, shape: readonly Pt[], dark: boolean): void {
  const g = ctx.createLinearGradient(-10, -44, 176, 40);
  g.addColorStop(0, '#f39fb0');
  g.addColorStop(0.14, '#d9a8d0');
  g.addColorStop(0.3, '#b6def5');
  g.addColorStop(0.72, dark ? '#7fb4d8' : '#a7d6f0');
  g.addColorStop(1, '#55718f');
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  inside(ctx, shape, () => {
    soft(ctx, spline([{ x: 20, y: -30 }, { x: 100, y: -24 }, { x: 170, y: 2 }], 6), 14, '#f6fdff', dark ? 0.15 : 0.8);
    if (dark) soft(ctx, spline([{ x: 0, y: 36 }, { x: 100, y: 44 }, { x: 170, y: 32 }], 6), 22, '#2d3f6a', 0.5);
  });
  pen.stroke([...shape, shape[0]!], 2.4, NIGHT_INK, 0.9, false);
}

/** Head on its neck: origin at the neck's root, facing +x. */
function paintHead(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 8400 + f, 0.9);
  const g = ctx.createRadialGradient(-6, -46, 8, 8, 6, 138);
  g.addColorStop(0, WHITE);
  g.addColorStop(0.6, '#f5ecdd');
  g.addColorStop(1, '#a8a4c4');
  ctx.fillStyle = g;
  trace(ctx, HEAD_OUTLINE);
  ctx.fill();
  inside(ctx, HEAD_OUTLINE, () => {
    const rnd = seeded(84);
    blob(ctx, 10, -70, 96, '#f3d78a', 0.55, 40, 0);
    for (let i = 0; i < 90; i++) {
      const x = -74 + rnd() * 160;
      const y = -76 + rnd() * 160;
      const w = 5 + rnd() * 5;
      pen.hair([{ x: x + w, y }, { x, y: y + w * 0.5 }, { x: x - w, y }], 1, LAVENDER, 0.42);
    }
    soft(ctx, spline([{ x: 70, y: 96 }, { x: 80, y: 40 }, { x: 96, y: 6 }], 6), 36, SHADOW, 0.32);
  });
  // Only the crown and throat are inked: the neck melts into the breast.
  pen.stroke(HEAD_OUTLINE.slice(6, -9), 3, NIGHT_INK, 0.9, false);
  // Bare skin round the bill and eye: blue, then pink at the bill's root.
  const skin = spline([{ x: 8, y: -60 }, { x: 52, y: -66 }, { x: 92, y: -52 }, { x: 96, y: 0 }, { x: 70, y: 18 }, { x: 40, y: 6 }, { x: 8, y: -16 }], 6, true);
  const sg = ctx.createLinearGradient(8, -30, 98, -20);
  sg.addColorStop(0, '#7fb3e6');
  sg.addColorStop(0.62, '#a7a8e6');
  sg.addColorStop(1, '#f39fb0');
  ctx.fillStyle = sg;
  ctx.globalAlpha = 0.92;
  trace(ctx, skin);
  ctx.fill();
  ctx.globalAlpha = 1;
  pen.hair([...skin, skin[0]!], 1.4, NIGHT_INK, 0.5);
  ctx.save();
  ctx.translate(GAPE.x, GAPE.y);
  billHalf(ctx, pen, LOWER, true);
  ctx.restore();
}

/** Upper bill, separate so the bill can open. */
function paintUpperBill(ctx: CanvasRenderingContext2D, f: number): void {
  billHalf(ctx, new Pen(ctx, 8500 + f, 0.7), UPPER, false);
}

function paintFoot(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 8600 + f, 0.7);
  // Short leg down from the belly to the web, spread over the branch.
  const leg = spline([{ x: -16, y: -74 }, { x: 16, y: -74 }, { x: 22, y: -16 }, { x: 18, y: 12 }, { x: -18, y: 12 }, { x: -22, y: -16 }], 5, true);
  const lg = ctx.createLinearGradient(-22, 0, 24, 0);
  lg.addColorStop(0, '#ff5a42');
  lg.addColorStop(0.5, '#ee1f2a');
  lg.addColorStop(1, '#8c0d22');
  ctx.fillStyle = lg;
  trace(ctx, leg);
  ctx.fill();
  pen.stroke([...leg, leg[0]!], 2.4, NIGHT_INK, 0.92, false);
  for (let i = 0; i < 5; i++) pen.hair([{ x: -14, y: -60 + i * 13 }, { x: 15, y: -58 + i * 13 }], 1.2, '#7a0b1e', 0.6);
  const tips: readonly Pt[] = [{ x: -86, y: 62 }, { x: -6, y: 88 }, { x: 80, y: 66 }];
  const web = spline([{ x: -22, y: 0 }, { x: tips[0]!.x, y: tips[0]!.y }, { x: -44, y: 62 }, { x: tips[1]!.x, y: tips[1]!.y }, { x: 40, y: 64 }, { x: tips[2]!.x, y: tips[2]!.y }, { x: 22, y: 0 }], 5, true);
  const wg = ctx.createLinearGradient(0, -6, 10, 92);
  wg.addColorStop(0, '#ff6246');
  wg.addColorStop(0.45, '#f4242d');
  wg.addColorStop(1, '#b21024');
  ctx.fillStyle = wg;
  trace(ctx, web);
  ctx.fill();
  inside(ctx, web, () => {
    soft(ctx, spline([{ x: -40, y: 16 }, { x: 0, y: 12 }, { x: 40, y: 18 }], 5), 16, '#ffc4a8', 0.65);
    flecks(ctx, { x0: -90, y0: 0, x1: 90, y1: 90 }, 50, seeded(86), ['#9a0d20'], 1, 4, 0.5);
  });
  pen.stroke([...web, web[0]!], 2.6, NIGHT_INK, 0.95, false);
  for (const tip of tips) {
    const toe = [{ x: 0, y: 2 }, { x: tip.x * 0.55, y: tip.y * 0.6 }, tip];
    pen.stroke(toe, 7.5, '#a50f22', 0.9, false);
    pen.stroke(toe, 3, '#ff7a5a', 0.8, false);
    pen.dot(tip.x, tip.y + 2, 4, DARK, 1);
  }
}

export interface BoobyArt {
  readonly body: Baked;
  readonly wing: Baked;
  readonly wingOpen: Baked;
  readonly head: Baked;
  readonly bill: Baked;
  readonly foot: Baked;
}

const RES = 2;

export function makeBoobyArt(boils: number): BoobyArt {
  return {
    body: bake({ x: -470, y: -310, w: 690, h: 290 }, RES, boils, paintBody),
    wing: bake({ x: -520, y: -80, w: 640, h: 260 }, RES, boils, foldedWing),
    wingOpen: bake({ x: -640, y: -90, w: 760, h: 580 }, RES, boils, openWing),
    head: bake({ x: -96, y: -100, w: 330, h: 220 }, RES, boils, paintHead),
    bill: bake({ x: -14, y: -50, w: 240, h: 90 }, RES, boils, paintUpperBill),
    foot: bake({ x: -100, y: -84, w: 200, h: 180 }, RES, 1, paintFoot),
  };
}

const NECK: Pt = { x: 96, y: -226 };
const SHOULDER: Pt = { x: 70, y: -226 };
const FEET: readonly Pt[] = [{ x: -44, y: 0 }, { x: 62, y: 0 }];

/** Eye: `open` 0 shut (a soft downward curve), 1 wide with a catchlight. */
function drawEye(ctx: CanvasRenderingContext2D, open: number): void {
  const { x, y } = EYE;
  ctx.save();
  ctx.lineCap = 'round';
  if (open < 0.08) {
    ctx.strokeStyle = NIGHT_INK;
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 4);
    ctx.quadraticCurveTo(x, y + 13, x + 25, y - 4);
    ctx.stroke();
    ctx.lineWidth = 2.8;
    for (const [dx, dy] of [[-16, 4], [-3, 7.5], [11, 6]] as const) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx * 1.26, y + dy + 8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const r = 14 + 16 * open;
  ctx.fillStyle = '#fbf8ef';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 0.72);
  g.addColorStop(0, '#0a0810');
  g.addColorStop(0.55, '#16121e');
  g.addColorStop(0.85, '#5d6d84');
  g.addColorStop(1, '#9fb3c6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 2, y, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.28, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (open < 0.6) {
    // A heavy lid: dazed, barely awake.
    const lid = y - r + 2 * r * (0.6 - open) * 1.4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#7fa6dc';
    ctx.fillRect(x - r - 2, y - r - 2, 2 * r + 4, lid - y + r + 2);
    ctx.restore();
    ctx.strokeStyle = NIGHT_INK;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(x - r, lid);
    ctx.lineTo(x + r, lid);
    ctx.stroke();
  }
  ctx.strokeStyle = NIGHT_INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The whole bird at a pose, its feet (the local origin) at (pose.x, pose.y). */
export function drawBooby(ctx: CanvasRenderingContext2D, art: BoobyArt, pose: BirdPose, boil: number): void {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.rotation);
  ctx.scale(pose.scale, pose.scale);
  if (pose.feetDown) {
    FEET.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawBaked(ctx, art.foot, 0);
      ctx.restore();
    });
  }
  if (pose.wing > 0.02) {
    // The far wing, behind the body.
    ctx.save();
    ctx.translate(SHOULDER.x - 40, SHOULDER.y + 6);
    ctx.rotate(0.3 + pose.wing * 1.3);
    ctx.scale(0.92, Math.max(0.05, pose.wing) * 0.92);
    ctx.globalAlpha = Math.min(1, pose.wing * 3);
    drawBaked(ctx, art.wingOpen, boil);
    ctx.restore();
  }
  const breath = 1 + pose.breath * 0.016;
  ctx.save();
  ctx.translate(0, -160);
  ctx.scale(breath, breath);
  ctx.translate(0, 160);
  drawBaked(ctx, art.body, boil);
  ctx.save();
  ctx.translate(SHOULDER.x, SHOULDER.y);
  ctx.rotate(-pose.droop * 0.4);
  ctx.globalAlpha = 1 - Math.min(1, pose.wing * 2.4);
  if (ctx.globalAlpha > 0) drawBaked(ctx, art.wing, boil);
  ctx.restore();
  if (pose.wing > 0.02) {
    ctx.save();
    ctx.translate(SHOULDER.x + 10, SHOULDER.y + 20);
    ctx.rotate(-0.42 + pose.wing * 1.72);
    ctx.scale(1, Math.max(0.05, pose.wing));
    ctx.globalAlpha = Math.min(1, pose.wing * 2.4);
    drawBaked(ctx, art.wingOpen, boil);
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(NECK.x + pose.neck * 40, NECK.y - pose.neck * 74 + pose.breath * 3);
  ctx.rotate(pose.headTilt);
  drawBaked(ctx, art.head, boil);
  drawEye(ctx, pose.eye);
  ctx.translate(GAPE.x, GAPE.y);
  ctx.rotate(-pose.gape * 0.46);
  drawBaked(ctx, art.bill, boil);
  ctx.restore();
  ctx.restore();
}
