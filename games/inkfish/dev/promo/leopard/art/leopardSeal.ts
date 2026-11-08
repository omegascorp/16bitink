import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, curve, dab, edgeAt, frames, lazily, mixStops, path, px, screenScale, shade,
  smoothLoop, softLine, step01, taper,
} from '../../seal/art/paint';

/**
 * The leopard seal (Hydrurga leptonyx), painted like the great white
 * (../../foodchain/art/greatWhite.ts) and the Cape fur seal: a long, sinuous
 * body thickest at the chest, a flat reptile-like head with a huge gape, a
 * silver-grey back washed in column by column down to a pale spotted throat
 * and belly, dark leather flippers. Parts are sprites baked once per
 * line-boil frame (body, lower jaw, fore flipper, tail flippers); the eye,
 * the inside of the mouth and the teeth are live, so the mood can change them.
 *
 * Own units: 410 long, the middle at 0,0, nose to the right (+x), belly down.
 */

export const SEAL_UNITS = 410;

export interface Placed {
  readonly x: number;
  readonly y: number;
  /** Length in px (own units are 410 long). */
  readonly len: number;
  /** Radians, positive: nose down. */
  readonly rot: number;
  /** 1: facing right, -1: facing left. */
  readonly face: 1 | -1;
  /** Swimming phase (radians). */
  readonly beat: number;
}

export interface SealLook {
  /** The jaw's opening, 0 .. 1 (1 is a huge gape). */
  readonly gape: number;
  /** Upper lid down, 0 (wide) .. 1 (shut). */
  readonly lid?: number;
  /** Lid slant: positive lowers the front of the lid (a glare). */
  readonly slant?: number;
  /** How far the body undulates, in own units (the head stays put). */
  readonly bend?: number;
  /** Tail beat amplitude multiplier. */
  readonly sad?: number;
}

/** Where a point in own units lands on screen. */
export function onSeal(p: Placed, local: Pt): Pt {
  const k = p.len / SEAL_UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [lx, ly] = [local.x * k, local.y * k];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}

/** Where the Placed must go so that its own-units point `local` lands on `target`. */
export function sealPinned(p: Omit<Placed, 'x' | 'y'>, local: Pt, target: Pt): Placed {
  const at = onSeal({ ...p, x: 0, y: 0 }, local);
  return { ...p, x: target.x - at.x, y: target.y - at.y };
}

// ---------------------------------------------------------------- shape

export const TOP: readonly Pt[] = spline([
  { x: 206, y: 3 }, { x: 204, y: -3 }, { x: 197, y: -10 }, { x: 185, y: -16 }, { x: 168, y: -23 }, { x: 150, y: -29 }, { x: 132, y: -34 },
  { x: 116, y: -37 }, { x: 102, y: -34 }, { x: 88, y: -28 }, { x: 70, y: -29 }, { x: 50, y: -32 }, { x: 25, y: -36 }, { x: -10, y: -39 }, { x: -45, y: -38 },
  { x: -85, y: -33 }, { x: -125, y: -26 }, { x: -160, y: -17 }, { x: -185, y: -9 }, { x: -200, y: -3 }, { x: -206, y: 1 },
], 5);
export const LIP: readonly Pt[] = spline([
  { x: 206, y: 3 }, { x: 205, y: 7 }, { x: 200, y: 11 }, { x: 190, y: 13 }, { x: 175, y: 14.5 }, { x: 155, y: 16 }, { x: 135, y: 17 },
  { x: 118, y: 17.5 }, { x: 108, y: 15.5 }, { x: 101, y: 12 },
], 4);
export const PIVOT: Pt = LIP[LIP.length - 1]!;
const BELLY: readonly Pt[] = spline([
  { x: -206, y: 1 }, { x: -198, y: 5 }, { x: -180, y: 10 }, { x: -150, y: 18 }, { x: -110, y: 27 }, { x: -70, y: 34 }, { x: -30, y: 37 },
  { x: 10, y: 37 }, { x: 45, y: 34 }, { x: 72, y: 30 }, { x: 94, y: 28 }, { x: 103, y: 22 }, { x: 101, y: 12 },
], 5);
const BODY: readonly Pt[] = [...TOP, ...BELLY, ...[...LIP].reverse()];
const BELLY_LOW = BELLY.filter((p) => p.x <= 94);
export const topAt = (x: number): number => edgeAt(TOP, x);
export const underAt = (x: number): number => {
  const u = step01(x, 60, 125);
  return edgeAt(BELLY_LOW, Math.min(x, 94)) * (1 - u) + edgeAt(LIP, Math.max(x, 101)) * u;
};

const JAW_TOP: readonly Pt[] = LIP.filter((p) => p.x >= 101 && p.x <= 200).reverse().map((p) => ({ x: p.x, y: p.y + 0.7 }));
const JAW_UNDER: readonly Pt[] = spline([
  { x: 200, y: 12 }, { x: 199, y: 18 }, { x: 191, y: 25 }, { x: 174, y: 30 }, { x: 150, y: 34 }, { x: 126, y: 36 }, { x: 108, y: 35 }, { x: 99, y: 31 }, { x: 94, y: 24 }, { x: 96, y: 17 },
], 4);
const JAW: readonly Pt[] = [...JAW_TOP, ...JAW_UNDER];
const jawTopAt = (x: number): number => edgeAt(JAW_TOP, x);
const jawUnderAt = (x: number): number => edgeAt(JAW_UNDER, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => {
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n;
    return { x, y: topAt(x) + (underAt(x) - topAt(x)) * v };
  });
};

export const EYE: Pt = { x: 132, y: -8.5 };
const FORE_ROOT: Pt = { x: 46, y: 32 };
const TAIL_ROOT: Pt = { x: -203, y: 1 };

// ---------------------------------------------------------------- colour

const AT = [0, 0.25, 0.5, 0.72, 0.88, 1] as const;
const BACK_PAL = ['#252d35', '#37424c', '#586571', '#8693a0', '#b5bfc7', '#dde3e5'] as const;
const HEAD_PAL = ['#232b32', '#323e47', '#4f5c67', '#778592', '#a3afb8', '#c9d1d6'] as const;
const SHEEN = '#eef3f5';
const WATER_LIGHT = '#8fc0dc';
const LEATHER = '#262e36';
const LEATHER_LIT = '#55626e';

function coat(x: number): ReturnType<typeof mixStops> {
  const head = step01(x, 60, 150);
  return mixStops(AT, [[BACK_PAL, 1 - head], [HEAD_PAL, head]]);
}

// ---------------------------------------------------------------- body

function paintLight(k: Brush): void {
  const { ctx, pen } = k;
  for (let i = 0; i < 22; i++) {
    const x = -180 + pen.rng() * 300;
    const v = 0.04 + pen.rng() * 0.4;
    dab(ctx, x, topAt(x) + (underAt(x) - topAt(x)) * v, 9 + pen.rng() * 18, '16,22,28', 0.06 + pen.rng() * 0.08);
  }
  // Pale spotted throat and belly: dark leopard blotches, small, scattered, clustered at the lower flank.
  for (let i = 0; i < 90; i++) {
    const x = -60 + pen.rng() * 168;
    const v = 0.6 + pen.rng() * 0.36;
    const y = topAt(x) + (underAt(x) - topAt(x)) * v;
    pen.dot(x, y, px(k, 0.9 + pen.rng() * 1.5), '#2d3944', 0.5 + pen.rng() * 0.35);
  }
  for (let i = 0; i < 40; i++) {
    const x = -160 + pen.rng() * 100;
    const v = 0.5 + pen.rng() * 0.4;
    pen.dot(x, topAt(x) + (underAt(x) - topAt(x)) * v, px(k, 0.8 + pen.rng() * 1.2), '#3a4651', 0.35);
  }
  // Leopard spotting: dark blotches over the flank and the pale throat, a dappled back.
  for (let i = 0; i < 70; i++) {
    const x = -150 + pen.rng() * 270;
    const v = 0.3 + pen.rng() * 0.45;
    pen.dot(x, topAt(x) + (underAt(x) - topAt(x)) * v, px(k, 1.4 + pen.rng() * 2.4), '#2a3540', 0.32 + pen.rng() * 0.3);
  }
  for (let i = 0; i < 60; i++) {
    const x = -170 + pen.rng() * 300;
    const y = topAt(x) + (underAt(x) - topAt(x)) * (0.05 + pen.rng() * 0.25);
    dab(ctx, x, y, 5 + pen.rng() * 8, pen.rng() < 0.5 ? '18,24,30' : '190,204,214', 0.12 + pen.rng() * 0.1);
  }
  for (let i = 0; i < 40; i++) {
    const x = 100 + pen.rng() * 90;
    pen.dot(x, topAt(x) + (underAt(x) - topAt(x)) * (0.55 + pen.rng() * 0.4), px(k, 1 + pen.rng() * 1.6), '#2a3540', 0.55);
  }
  // Roundness: lit along the back, a core shadow on the flank, cool water light under the belly.
  softLine(ctx, along(0.42, 90, -170), 22, '#0d1218', 0.14);
  softLine(ctx, along(0.12, 190, -180), 12, SHEEN, 0.22);
  softLine(ctx, along(0.06, 120, -170), 4, '#ffffff', 0.26);
  softLine(ctx, along(0.975, 90, -150), 8, WATER_LIGHT, 0.26);
  // The head: dark crown, the muzzle's paler wash, shadow under the brow, a dark mask.
  dab(ctx, 160, -11, 26, '15,20,26', 0.22);
  dab(ctx, 178, 5, 14, '170,182,190', 0.3);
  dab(ctx, 132, -9, 15, '14,18,22', 0.4);
  dab(ctx, 112, 10, 14, '14,18,22', 0.18);
  softLine(ctx, spline([{ x: 150, y: -22 }, { x: 128, y: -20 }, { x: 108, y: -12 }], 4), 6, '#0a0e12', 0.28);
  dab(ctx, 150, 4, 22, '205,218,226', 0.22);
  dab(ctx, 118, 0, 20, '205,218,226', 0.14);
}

function paintGrain(k: Brush): void {
  const { pen } = k;
  for (let r = 0; r < 26; r++) {
    const v = 0.04 + (0.9 * (r + pen.rng() * 0.8)) / 26;
    let x = 190 - pen.rng() * 40;
    while (x > -190) {
      const end = Math.max(-195, x - 16 - pen.rng() * 40);
      const light = pen.rng() < 0.55;
      pen.hair(along(v + (pen.rng() - 0.5) * 0.02, x, end, 3), px(k, 0.9), light ? SHEEN : '#0d1218', light ? 0.07 : 0.07);
      x = end - 5 - pen.rng() * 18;
    }
  }
  // Wet highlights, broken streaks along the back and the crown.
  const streak = (x0: number, x1: number, v0: number, v1: number, n: number): void => {
    let x = x0;
    for (let i = 0; i < n && x > x1; i++) {
      const len = 8 + pen.rng() * 24;
      pen.hair(along(v0 + pen.rng() * (v1 - v0), x, Math.max(x1, x - len), 2), px(k, 1.2 + pen.rng() * 1.2), '#ffffff', 0.55);
      x -= len + 6 + pen.rng() * 20;
    }
  };
  streak(80, -170, 0.05, 0.12, 16);
  streak(190, 112, 0.1, 0.2, 7);
}

function paintHead(k: Brush): void {
  const { pen, ctx } = k;
  // The nose pad: dark leather, wet, a curled slit nostril; the whisker pad's rows of pores.
  const nose = smoothLoop([{ x: 207, y: 4 }, { x: 205.5, y: -1.5 }, { x: 200, y: -4 }, { x: 195, y: -2.6 }, { x: 195, y: 2.4 }, { x: 199, y: 6.6 }, { x: 204.5, y: 7.4 }], 4);
  pen.fill(nose, '#181c20', 0.97);
  shade(ctx, nose, -4, 7, [[0, 'rgba(150,165,175,0.5)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
  pen.stroke(spline([{ x: 202, y: -0.4 }, { x: 199.5, y: 0.8 }, { x: 198.6, y: 3.2 }], 3), px(k, 1.4), '#030405', 1, false);
  pen.dot(203, -2.8, px(k, 1.5), '#f4f6f6', 0.75);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) pen.dot(190 - i * 4 - row * 1.5, 7 + row * 2.6 + i * 0.3, px(k, 0.8), '#2a323a', 0.5);
  // Brow ridge and the stop above the muzzle.
  softLine(ctx, spline([{ x: 144, y: -15 }, { x: 134, y: -14.5 }, { x: 124, y: -13.5 }], 4), 4, '#0a0e12', 0.3);
  pen.hair(spline([{ x: 174, y: -14 }, { x: 170, y: -9 }, { x: 171, y: -4 }], 4), px(k, 0.9), INK, 0.25);
  // The mouth line and the corner tucked up into the cheek.
  pen.stroke(LIP.slice(2), px(k, 1.6), INK, 0.95, false);
  pen.hair(spline([PIVOT, { x: 100, y: 7 }, { x: 98, y: 1 }, { x: 102, y: -6 }], 4), px(k, 1.3), INK, 0.7);
}

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    ctx.save();
    ctx.translate(px(k, 1.2), px(k, 1.4));
    columnWash(ctx, -212, 210, 1, topAt, underAt, coat);
    ctx.restore();
    paintLight(k);
    paintGrain(k);
  });
  paintHead(k);
  pen.stroke(TOP.filter((p) => p.x < 205), px(k, 1.7), INK, 1, true);
  pen.stroke(BELLY.filter((p) => p.x < 99), px(k, 2.4), INK, 1, true);
}

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    ctx.save();
    ctx.translate(px(k, 0.6), px(k, 0.6));
    columnWash(ctx, 96, 204, 1, jawTopAt, jawUnderAt, () => mixStops(AT, [[HEAD_PAL, 1]]), 30);
    ctx.restore();
    dab(ctx, 150, 28, 22, '230,236,238', 0.4);
    softLine(ctx, JAW_UNDER.map((p) => ({ x: p.x, y: p.y - 1.6 })), 5, WATER_LIGHT, 0.24);
    softLine(ctx, JAW_TOP.map((p) => ({ x: p.x, y: p.y + 1.4 })), 3, '#0a0e12', 0.3);
    for (let i = 0; i < 26; i++) pen.dot(112 + pen.rng() * 80, 24 + pen.rng() * 8, px(k, 0.8 + pen.rng() * 1.1), '#2d3944', 0.55);
  });
  pen.hair(JAW_TOP, px(k, 1.1), INK, 0.8);
  pen.stroke(JAW_UNDER, px(k, 2.1), INK, 1, true);
}

// ---------------------------------------------------------------- flippers (root at 0,0, pointing +x)

const FORE: readonly Pt[] = smoothLoop([
  { x: -3, y: -12 }, { x: 14, y: -14 }, { x: 34, y: -13 }, { x: 54, y: -10 }, { x: 72, y: -6 }, { x: 86, y: -2 }, { x: 90, y: 1.5 },
  { x: 86, y: 4.5 }, { x: 74, y: 8 }, { x: 56, y: 11.5 }, { x: 36, y: 14 }, { x: 16, y: 15 }, { x: -3, y: 13.5 },
], 4);
const FORE_BOX: Box = { x0: -6, x1: 95, y0: -19, y1: 20 };
const TAIL: readonly Pt[] = smoothLoop([
  { x: -3, y: -7 }, { x: 16, y: -9 }, { x: 38, y: -15 }, { x: 58, y: -24 }, { x: 70, y: -27 }, { x: 73, y: -21 }, { x: 63, y: -10 }, { x: 56, y: -2 },
  { x: 56, y: 2 }, { x: 63, y: 10 }, { x: 73, y: 21 }, { x: 70, y: 27 }, { x: 58, y: 24 }, { x: 38, y: 15 }, { x: 16, y: 9 }, { x: -3, y: 7 },
], 3);
const TAIL_BOX: Box = { x0: -6, x1: 78, y0: -32, y1: 32 };

function leather(k: Brush, shape: readonly Pt[], len: number, half: number, ink: number): void {
  const { pen, ctx } = k;
  pen.fill(shape, LEATHER, 1);
  shade(ctx, shape, -half, half, [[0, LEATHER_LIT], [0.35, 'rgba(60,72,84,0.55)'], [0.7, 'rgba(20,26,32,0)'], [1, 'rgba(6,8,10,0.6)']]);
  pen.clipped(shape, () => {
    softLine(ctx, [{ x: 4, y: -half * 0.5 }, { x: len * 0.5, y: -half * 0.45 }, { x: len * 0.92, y: -half * 0.1 }], half * 0.5, '#cfdce6', 0.2);
    for (const f of [-0.55, -0.18, 0.2, 0.55]) {
      const ridge = spline([{ x: len * 0.3, y: half * f }, { x: len * 0.62, y: half * f * 0.6 }, { x: len * 0.92, y: half * f * 0.2 }], 6);
      pen.hair(ridge, px(k, 0.9), '#8d9ba6', 0.25);
    }
  });
  pen.stroke(shape.slice(3, shape.length - 3), px(k, ink), INK, 1, true);
}

// ---------------------------------------------------------------- sprites

const BODY_BOX: Box = { x0: -212, x1: 211, y0: -52, y1: 50 };
const JAW_BOX: Box = { x0: 96, x1: 205, y0: 8, y1: 40 };
const SEED = 7313;

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly fore: readonly HTMLCanvasElement[];
  readonly tail: readonly HTMLCanvasElement[];
}

const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  jaw: frames(JAW_BOX, b, SEED + 11, paintJaw),
  fore: frames(FORE_BOX, b, SEED + 23, (k) => leather(k, FORE, 90, 14, 1.8)),
  tail: frames(TAIL_BOX, b, SEED + 31, (k) => leather(k, TAIL, 73, 26, 1.7)),
}));

/** Weight of the body's undulation: none in the head, growing towards the tail. */
const sway = (x: number): number => Math.pow(Math.max(0, Math.min(1, (96 - x) / 300)), 1.4);

function strips(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, offset: (x: number) => number): void {
  const w = 6;
  for (let x = BODY_BOX.x0; x < BODY_BOX.x1; x += w) {
    const sw = Math.min(w, BODY_BOX.x1 - x);
    const dy = offset(x + sw / 2);
    ctx.drawImage(c, (x - BODY_BOX.x0) * res, 0, sw * res + 0.6, c.height, x, BODY_BOX.y0 + dy, sw + 0.6 / res, c.height / res);
  }
}

function limb(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, root: Pt, angle: number, flipY = false): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  if (flipY) ctx.scale(1, -1);
  blit(ctx, c, box, res);
  ctx.restore();
}

// ---------------------------------------------------------------- live face

const IVORY = '#f1e8d2';
const SKIN = '#44505b';

function tooth(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, h: number, w: number, lw: number): void {
  const tip = { x: x - 0.8 * dir * 0, y: y + dir * h };
  const shape = [{ x: x - w / 2, y: y - dir * 0.8 }, ...curve({ x: x - w / 2, y }, { x: x - w * 0.3, y: y + dir * h * 0.75 }, tip, 5), ...curve(tip, { x: x + w * 0.35, y: y + dir * h * 0.6 }, { x: x + w / 2, y }, 5), { x: x + w / 2, y: y - dir * 0.8 }];
  ctx.save();
  path(ctx, shape);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(150,130,100,0.5)';
  ctx.fillRect(x, y - 12, w, 24);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8 * lw;
  ctx.lineJoin = 'round';
  path(ctx, shape);
  ctx.stroke();
  ctx.restore();
}

/** Canines at the front and tri-cusped molars behind, hanging from the lip (dir 1) or standing on the jaw (dir -1). */
function teeth(ctx: CanvasRenderingContext2D, line: (x: number) => number, dir: number, lw: number, open: number): void {
  const m = 0.3 + 0.7 * step01(open, 0.05, 0.3);
  tooth(ctx, 188, line(188), dir, 13 * m, 6, lw);
  if (open < 0.12) return;
  tooth(ctx, 177, line(177), dir, 9 * m, 4.6, lw);
  for (const x of [162, 148, 134, 121]) {
    const y = line(x);
    for (const d of [-3.4, 0, 3.4]) tooth(ctx, x + d, y, dir, (d === 0 ? 8.5 : 6) * m, 3.8, lw);
  }
}

function drawEye(ctx: CanvasRenderingContext2D, lid: number, slant: number, lw: number): void {
  const { x, y } = EYE;
  const [rx, ry] = [7.2, 5.6];
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.05, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, rx);
  g.addColorStop(0, '#0b0806');
  g.addColorStop(0.5, '#1c130c');
  g.addColorStop(0.82, '#3b2a1b');
  g.addColorStop(1, '#5a4228');
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  ctx.fillStyle = '#030201';
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // The wet catchlight, and a soft one under.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x - 2.2, y - 2.3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,225,240,0.5)';
  ctx.beginPath();
  ctx.arc(x + 2.3, y + 2.3, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // The upper lid, in skin, down to `lid` of the eye; `slant` tilts it.
  if (lid > 0.01) {
    const edge = y - ry + 2 * ry * lid;
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.moveTo(x - rx - 2, y - ry - 3);
    ctx.lineTo(x + rx + 2, y - ry - 3);
    ctx.lineTo(x + rx + 2, edge + slant * 3.4);
    ctx.lineTo(x - rx - 2, edge - slant * 3.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3 * lw;
    ctx.beginPath();
    ctx.moveTo(x - rx - 2, edge - slant * 3.4);
    ctx.lineTo(x + rx + 2, edge + slant * 3.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.05, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWhiskers(ctx: CanvasRenderingContext2D, beat: number): void {
  for (let i = 0; i < 5; i++) {
    const y0 = 7 + i * 1.6;
    const droop = 6 + i * 3.5 + 1.5 * Math.sin(beat * 2 + i);
    const pts = curve({ x: 192 - i * 3, y: y0 }, { x: 204 - i * 2, y: y0 + droop * 0.2 }, { x: 214 - i * 3, y: y0 + droop }, 8);
    taper(ctx, pts, 1.1, 0.25, '#f4f6f6', 0.85);
  }
}

/** The inside of the mouth between the lip and the jaw's top edge, and the tongue. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.02) return;
  const lower = JAW_TOP.map((p) => {
    const [c, s] = [Math.cos(open), Math.sin(open)];
    const [dx, dy] = [p.x - PIVOT.x, p.y - PIVOT.y];
    return { x: PIVOT.x + dx * c - dy * s, y: PIVOT.y + dx * s + dy * c };
  });
  const shape = [...LIP.filter((p) => p.x >= 101).reverse(), ...[...lower].reverse(), { x: 100, y: 30 }, { x: 99, y: 14 }];
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const tipY = lower[lower.length - 1]!.y;
  const g = ctx.createLinearGradient(0, 12, 0, tipY);
  g.addColorStop(0, '#5a1f27');
  g.addColorStop(0.35, '#33101a');
  g.addColorStop(1, '#6a2a33');
  ctx.fillStyle = g;
  ctx.fillRect(90, 0, 130, 130);
  const back = ctx.createRadialGradient(108, 28, 2, 108, 28, 60);
  back.addColorStop(0, 'rgba(8,2,6,0.95)');
  back.addColorStop(1, 'rgba(8,2,6,0)');
  ctx.fillStyle = back;
  ctx.fillRect(90, 0, 130, 130);
  // The tongue lies along the jaw.
  const t0 = lower[3]!;
  const t1 = lower[lower.length - 3]!;
  ctx.fillStyle = 'rgba(214,112,122,0.9)';
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.quadraticCurveTo((t0.x + t1.x) / 2, (t0.y + t1.y) / 2 - 12, t1.x, t1.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(20,6,10,0.9)';
  ctx.lineWidth = 1;
  path(ctx, shape);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- draw

/**
 * The leopard seal, placed, turned and mirrored by `p`. `inMouth` is drawn in
 * the seal's own units after the inside of the mouth and before the lower jaw
 * and the teeth, so a prop (a diver's head, a penguin) sits between the jaws.
 */
export function drawLeopardSeal(ctx: CanvasRenderingContext2D, p: Placed, look: SealLook, boil: number, inMouth?: () => void): void {
  const k = p.len / SEAL_UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const s = spritesFor(bucketFor(scale));
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const lw = 1 / scale;
  const open = Math.max(0, Math.min(1, look.gape)) * 0.95;
  const amp = look.bend ?? 0;
  const off = (x: number): number => amp * sway(x) * Math.sin(p.beat - x * 0.018) * 1.6;
  const beat = (look.sad ?? 1) * Math.sin(p.beat - 3.9) * 0.3;
  limb(ctx, s.tail[f]!, TAIL_BOX, s.res, { x: TAIL_ROOT.x, y: TAIL_ROOT.y + off(TAIL_ROOT.x) }, Math.PI + beat);
  strips(ctx, s.body[f]!, s.res, off);
  drawMouth(ctx, open);
  inMouth?.();
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(open);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  blit(ctx, s.jaw[f]!, JAW_BOX, s.res);
  teeth(ctx, (x) => edgeAt(JAW_TOP, x), -1, lw, open);
  ctx.restore();
  teeth(ctx, (x) => edgeAt(LIP, x) - 0.4, 1, lw, open);
  drawWhiskers(ctx, p.beat);
  drawEye(ctx, look.lid ?? 0, look.slant ?? 0, lw);
  limb(ctx, s.fore[f]!, FORE_BOX, s.res, { x: FORE_ROOT.x, y: FORE_ROOT.y + off(FORE_ROOT.x) }, 2.55 + 0.18 * Math.sin(p.beat + 1));
  ctx.restore();
}

/** Bakes the sprites at the size the short opens on. */
export function prepareLeopardSeal(): void {
  spritesFor(bucketFor(3.6));
}
