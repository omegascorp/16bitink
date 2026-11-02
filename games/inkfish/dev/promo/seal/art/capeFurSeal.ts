import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import { type Placed, UNITS } from '../story';
import { along, BODY, EAR, EYE, FORE_FAR, FORE_NEAR, HIND_DOWN, HIND_UP, JAW, JAW_TOP, JAW_UNDER, LIP, NOSE, PIVOT, THROAT, TOP, topAt, underAt } from './sealShape';
import { drawSealFace, type SealLook } from './sealFace';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, dab, fadeRoot, frames, lazily, mixStops, px, screenScale,
  shade, smoothLoop, softLine, step01,
} from './paint';

export type { SealLook, SealMood } from './sealFace';

/**
 * The Cape fur seal (Arctocephalus pusillus), painted in the manner of the
 * great white (../../foodchain/art/greatWhite.ts): a sleek torpedo thickest
 * at the chest, a long neck, a pointed dog-like muzzle with a dark nose, a
 * small ear flap lying back. The dense fur is a wash, laid in column by column
 * from a dark chocolate-grey back to a golden-tan throat and chest, with a
 * soft sheen along the back, wet highlights and the water's cool light under
 * the belly. The long fore flippers are dark hairless leather beyond the
 * furred wrist, with digit ridges; the hind flippers trail with long toes and
 * fringed flaps.
 *
 * Parts are sprites baked once per line-boil frame at a few sizes: the body,
 * the lower jaw (turning about the corner of the mouth over the inside, drawn
 * live), the fore flippers and the hind flippers. The eye, whiskers, teeth
 * and props are drawn live (./sealFace.ts) so the moods can change them.
 *
 * Own units, as the short places animals: 310 long, the middle at 0,0, nose
 * to the right (+x), belly down (+y).
 */

// ---------------------------------------------------------------- ink

const LEATHER = '#211915';
const LEATHER_LIT = '#47392f';
const SHEEN = '#f7efe1';
const WATER_LIGHT = '#9cc3dc';

const AT = [0, 0.2, 0.42, 0.62, 0.8, 1] as const;
const BACK_PAL = ['#1f1814', '#2a211b', '#3a2e25', '#4d3f33', '#5f5042', '#6b5c4d'] as const;
const CHEST_PAL = ['#231b16', '#31271f', '#47382b', '#76593a', '#a98352', '#c09b66'] as const;
const HEAD_PAL = ['#29211b', '#3a3028', '#544538', '#776552', '#97826a', '#a8937b'] as const;

function furStops(x: number): ReturnType<typeof mixStops> {
  const head = step01(x, 96, 126);
  const front = step01(x, -20, 40) * (1 - head);
  return mixStops(AT, [[BACK_PAL, 1 - head - front], [CHEST_PAL, front], [HEAD_PAL, head]]);
}

// ---------------------------------------------------------------- the body

function paintFurLight(k: Brush): void {
  const { ctx, pen } = k;
  // Soft mottling, darker over the back, warm on the flank and throat.
  for (let i = 0; i < 18; i++) {
    const x = -132 + pen.rng() * 210;
    const v = 0.08 + pen.rng() * 0.45;
    dab(ctx, x, topAt(x) + (underAt(x) - topAt(x)) * v, 8 + pen.rng() * 16, '16,11,8', 0.06 + pen.rng() * 0.09);
  }
  for (let i = 0; i < 10; i++) {
    const x = -120 + pen.rng() * 210;
    const v = 0.5 + pen.rng() * 0.35;
    dab(ctx, x, topAt(x) + (underAt(x) - topAt(x)) * v, 10 + pen.rng() * 14, '196,156,102', 0.05 + pen.rng() * 0.06);
  }
  // The head: a dark mask round the eye, a darker crown, a paler muzzle, a golden cheek and throat.
  dab(ctx, EYE.x, EYE.y, 16, '20,14,10', 0.45);
  dab(ctx, 98, -18, 18, '16,11,8', 0.25);
  dab(ctx, 146, -3, 14, '158,138,114', 0.35);
  dab(ctx, 148, 6, 10, '196,180,156', 0.4);
  dab(ctx, 101, 10, 15, '196,156,100', 0.2);
  dab(ctx, 78, 32, 24, '200,160,100', 0.22);
  // The body in the round: lit along the back, a core shadow on the flank, the water's cool light under the belly.
  softLine(ctx, along(0.42, 50, -140), 20, '#120c09', 0.12);
  softLine(ctx, along(0.14, 152, -146), 12, '#efe0c4', 0.2);
  softLine(ctx, along(0.06, 124, -142), 4, '#f6eee0', 0.24);
  softLine(ctx, along(0.975, 104, -150), 7, WATER_LIGHT, 0.24);

}

/** The fur's lie: long faint streaks from the head back, light and dark, following the body round. */
function paintFurGrain(k: Brush): void {
  const { pen } = k;
  const rows = 30;
  for (let r = 0; r < rows; r++) {
    const v = 0.03 + (0.92 * (r + pen.rng() * 0.8)) / rows;
    let x = 150 - pen.rng() * 30;
    while (x > -150) {
      const end = Math.max(-152, x - 14 - pen.rng() * 34);
      const light = pen.rng() < 0.5;
      pen.hair(along(v + (pen.rng() - 0.5) * 0.02, x, end, 3), px(k, 0.9), light ? SHEEN : '#120c09', light ? 0.07 * (1.2 - v) : 0.08);
      x = end - 4 - pen.rng() * 16;
    }
  }
}

/** Wet highlights: broken bright streaks along the back, on the crown and down the muzzle. */
function paintWet(k: Brush): void {
  const { pen } = k;
  const streak = (x0: number, x1: number, v0: number, v1: number, count: number, a: number): void => {
    let x = x0;
    for (let i = 0; i < count && x > x1; i++) {
      const len = 8 + pen.rng() * 26;
      const v = v0 + pen.rng() * (v1 - v0);
      pen.hair(along(v, x, Math.max(x1, x - len), 2), px(k, 1.2 + pen.rng() * 1.3), SHEEN, a * (0.6 + pen.rng() * 0.4));
      x -= len + 5 + pen.rng() * 20;
    }
  };
  streak(64, -138, 0.04, 0.12, 14, 0.75);
  streak(40, -100, 0.14, 0.22, 6, 0.35);
  streak(112, 80, 0.08, 0.14, 3, 0.7);
  streak(150, 124, 0.12, 0.22, 3, 0.65);
  pen.hair([{ x: 158, y: -3.5 }, { x: 161, y: -1 }], px(k, 1.6), SHEEN, 0.7);
}

/** The neck's folds where the head turns on it, the stop above the muzzle, the whisker pad. */
function paintFolds(k: Brush): void {
  const { pen, ctx } = k;
  for (const [x, lean, a] of [[76, 5, 0.22], [60, 7, 0.14]] as const) {
    const pts = [0.16, 0.4, 0.62, 0.8].map((v, i) => ({ x: x + lean * Math.sin((i / 3) * Math.PI) - 2 * i, y: topAt(x) + (underAt(x) - topAt(x)) * v }));
    const fold = spline(pts, 5);
    softLine(ctx, fold.map((p) => ({ x: p.x + 3, y: p.y })), 8, '#100b08', a * 0.7);
    softLine(ctx, fold.map((p) => ({ x: p.x - 3, y: p.y })), 6, '#e9dcc4', a * 0.25);
  }
  pen.hair(spline([{ x: 129, y: -13 }, { x: 127, y: -9 }, { x: 128, y: -4 }], 4), px(k, 0.9), INK, 0.22);
  // The whisker pad: a soft swelling, its rows of pores.
  softLine(ctx, spline([{ x: 156, y: 9 }, { x: 146, y: 11 }, { x: 136, y: 10 }], 4), 3, '#120c09', 0.18);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) pen.dot(152 - i * 3.6 - row * 1.5, 1.5 + row * 3 + i * 0.35, px(k, 0.9), '#2a1d16', 0.55);
  }
}

function paintHead(k: Brush): void {
  const { pen, ctx } = k;
  // The ear: a small furred flap lying back, lit on its top edge.
  pen.fill(EAR, '#3a2e25', 1);
  shade(ctx, EAR, -22, -10, [[0, 'rgba(240,226,200,0.4)'], [0.5, 'rgba(240,226,200,0)'], [1, 'rgba(12,8,6,0.4)']]);
  pen.hair(spline([{ x: 93, y: -12 }, { x: 88, y: -15 }, { x: 83, y: -18 }], 4), px(k, 0.9), INK, 0.5);
  pen.stroke(EAR.slice(0, 13), px(k, 1.2), INK, 0.9, false);
  // The nose: dark bare leather, the nostril a curled slit, wet on top.
  pen.fill(NOSE, '#1d1512', 0.96);
  shade(ctx, NOSE, -4, 7, [[0, 'rgba(120,100,90,0.45)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
  pen.stroke(spline([{ x: 160.5, y: -0.6 }, { x: 158.6, y: 0.4 }, { x: 157.6, y: 2.4 }], 3), px(k, 1.4), '#050303', 1, false);
  pen.dot(160.6, -2.6, px(k, 1.4), '#f2ece4', 0.75);
  pen.stroke(NOSE.slice(10, 26), px(k, 1.2), INK, 0.8, false);
  // The lip line, a little shadow under it and the corner of the mouth tucked up.
  pen.stroke(LIP.slice(3), px(k, 1.5), INK, 0.95, false);
  pen.hair(spline([PIVOT, { x: 106, y: 14.4 }, { x: 103, y: 12.4 }], 3), px(k, 1.1), INK, 0.6);
}

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    // The wash, laid a little off the line so a sliver of paper catches the light along the back.
    ctx.save();
    ctx.translate(px(k, 1.2), px(k, 1.4));
    columnWash(ctx, -160, 166, 1, topAt, underAt, furStops);
    ctx.restore();
    paintFurLight(k);
    paintFurGrain(k);
    paintWet(k);
    paintFolds(k);
  });
  paintHead(k);
  // Ink: light on the lit back, firmer underneath.
  pen.stroke(TOP.filter((p) => p.x < 161), px(k, 1.6), INK, 1, true);
  pen.stroke(THROAT.filter((p) => p.x < 108), px(k, 2.4), INK, 1, true);
}

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    ctx.save();
    ctx.translate(px(k, 0.6), px(k, 0.6));
    columnWash(ctx, 100, 162, 1, topAt, underAt, furStops);
    ctx.restore();
    dab(ctx, 140, 20, 12, '205,186,160', 0.45);
    dab(ctx, 118, 24, 12, '214,176,112', 0.25);
    softLine(ctx, JAW_UNDER.map((p) => ({ x: p.x, y: p.y - 1.5 })), 5, WATER_LIGHT, 0.2);
    softLine(ctx, JAW_TOP.map((p) => ({ x: p.x, y: p.y + 1.5 })), 3, '#120c09', 0.35);
    for (let i = 0; i < 5; i++) pen.dot(152 - i * 4.2, 15.5 + i * 0.9, px(k, 0.8), '#2a1d16', 0.45);
  });
  pen.hair(JAW_TOP, px(k, 1.1), INK, 0.8);
  pen.stroke(JAW_UNDER, px(k, 2.1), INK, 1, true);
}

// ---------------------------------------------------------------- the flippers (root at 0,0, pointing +x)

const FORE: readonly Pt[] = smoothLoop([
  { x: -3, y: -12 }, { x: 10, y: -13.5 }, { x: 26, y: -13 }, { x: 42, y: -11.5 }, { x: 58, y: -9 }, { x: 70, y: -6.5 }, { x: 80, y: -3.5 },
  { x: 86, y: -0.5 }, { x: 88, y: 1.8 }, { x: 85.5, y: 3.8 }, { x: 79, y: 5.6 }, { x: 69, y: 8 }, { x: 57, y: 10.6 }, { x: 43, y: 12.6 },
  { x: 28, y: 14 }, { x: 12, y: 14.6 }, { x: -3, y: 13.5 },
], 4);
const FORE_BOX: Box = { x0: -6, x1: 92, y0: -18, y1: 19 };

const HIND: readonly Pt[] = smoothLoop([
  { x: -3, y: -6.5 }, { x: 14, y: -6.8 }, { x: 30, y: -8 }, { x: 46, y: -10.4 }, { x: 58, y: -12.6 }, { x: 66, y: -14.2 },
  { x: 76, y: -13.8 }, { x: 70, y: -10.2 }, { x: 75, y: -6.8 }, { x: 69.5, y: -3.4 }, { x: 74.5, y: 0 }, { x: 69.5, y: 3.4 },
  { x: 75, y: 6.8 }, { x: 70, y: 10.2 }, { x: 76, y: 13.8 }, { x: 66, y: 14.2 }, { x: 56, y: 12.2 }, { x: 42, y: 9.8 },
  { x: 28, y: 7.8 }, { x: 14, y: 6.8 }, { x: -3, y: 6.5 },
], 3);
const HIND_BOX: Box = { x0: -6, x1: 82, y0: -18, y1: 18 };
const TOES = [-13.8, -6.8, 0, 6.8, 13.8] as const;

/** Leather in the round: lit along its leading edge, a sheen, darker to the trailing edge and the tip. */
function leather(k: Brush, shape: readonly Pt[], len: number, half: number): void {
  const { pen, ctx } = k;
  pen.fill(shape, LEATHER, 1);
  shade(ctx, shape, -half, half, [[0, LEATHER_LIT], [0.35, 'rgba(58,46,38,0.6)'], [0.7, 'rgba(20,15,12,0)'], [1, 'rgba(8,6,5,0.6)']]);
  pen.clipped(shape, () => {
    softLine(ctx, [{ x: 4, y: -half * 0.5 }, { x: len * 0.5, y: -half * 0.45 }, { x: len * 0.92, y: -half * 0.1 }], half * 0.5, '#c9d6de', 0.2);
    softLine(ctx, [{ x: len * 0.2, y: half * 0.65 }, { x: len * 0.9, y: half * 0.35 }], half * 0.5, '#050403', 0.25);
  });
}

/** The fur over the wrist, thinning out onto the bare leather. */
function furredRoot(k: Brush, shape: readonly Pt[], reach: number): void {
  const { pen, ctx } = k;
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, 0, reach, 0);
    g.addColorStop(0, 'rgba(98,76,58,1)');
    g.addColorStop(0.55, 'rgba(88,68,52,0.85)');
    g.addColorStop(1, 'rgba(70,54,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -30, reach + 10, 60);
    for (let i = 0; i < 26; i++) {
      const y = -14 + pen.rng() * 28;
      const x = pen.rng() * reach * 0.8;
      pen.hair([{ x, y }, { x: x + 6 + pen.rng() * 8, y: y + (pen.rng() - 0.5) * 2 }], px(k, 0.8), pen.rng() < 0.5 ? SHEEN : '#120c09', 0.1);
    }
  });
}

function paintFore(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  leather(k, FORE, 88, 13);
  furredRoot(k, FORE, 34);
  pen.clipped(FORE, () => {
    // Digit ridges running out to the tip, light on top, shadowed under.
    for (const y0 of [-8, -3, 2.5, 8]) {
      const ridge = spline([{ x: 30, y: y0 }, { x: 60, y: y0 * 0.62 + 0.4 }, { x: 84, y: y0 * 0.18 + 1.2 }], 6);
      pen.hair(ridge.map((p) => ({ x: p.x, y: p.y + 1 })), px(k, 1), '#060404', 0.4);
      pen.hair(ridge, px(k, 0.9), '#8e7f72', 0.28);
    }
    // Creases at the wrist.
    for (let i = 0; i < 5; i++) {
      const x = 30 + i * 3.4 + pen.rng() * 2;
      pen.hair([{ x, y: -9 + pen.rng() * 3 }, { x: x + 1.5, y: 9 - pen.rng() * 3 }], px(k, 0.7), '#060404', 0.25);
    }
    // The wet light on the leading edge.
    pen.hair([{ x: 30, y: -11.2 }, { x: 56, y: -8.4 }, { x: 78, y: -3.6 }], px(k, 1.5), SHEEN, 0.45);
    if (far) {
      ctx.fillStyle = 'rgba(8,6,5,0.38)';
      ctx.fillRect(-10, -20, 110, 40);
    }
  });
  pen.stroke(FORE.slice(3, FORE.length - 3), px(k, far ? 1.4 : 1.8), INK, 1, true);
  fadeRoot(ctx, -4, 6);
}

function paintHind(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  leather(k, HIND, 76, 12);
  furredRoot(k, HIND, 24);
  pen.clipped(HIND, () => {
    // The toes: ridges out to the tips, small pale nails set well back, thin fringed flaps beyond them.
    for (const y of TOES) {
      const toe = spline([{ x: 20, y: y * 0.4 }, { x: 48, y: y * 0.72 }, { x: 73, y: y * 0.98 }], 6);
      pen.hair(toe.map((p) => ({ x: p.x, y: p.y + 1.2 })), px(k, 1.1), '#050403', 0.45);
      pen.hair(toe, px(k, 1), '#9a8a7b', 0.3);
      if (Math.abs(y) < 10) {
        const nail = { x: 57, y: y * 0.82 };
        pen.fill(smoothLoop([{ x: nail.x - 1.8, y: nail.y }, { x: nail.x, y: nail.y - 0.8 }, { x: nail.x + 2, y: nail.y }, { x: nail.x, y: nail.y + 0.8 }], 3), '#8f8170', 0.6);
      }
    }
    const g = ctx.createLinearGradient(62, 0, 78, 0);
    g.addColorStop(0, 'rgba(110,92,78,0)');
    g.addColorStop(1, 'rgba(120,102,88,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(60, -24, 20, 48);
    if (far) {
      ctx.fillStyle = 'rgba(8,6,5,0.38)';
      ctx.fillRect(-10, -30, 100, 60);
    }
  });
  pen.stroke(HIND.slice(3, HIND.length - 3), px(k, far ? 1.3 : 1.6), INK, 1, true);
  fadeRoot(ctx, -4, 8);
}

// ---------------------------------------------------------------- sprites

const BODY_BOX: Box = { x0: -162, x1: 168, y0: -44, y1: 50 };
const JAW_BOX: Box = { x0: 100, x1: 164, y0: 6, y1: 34 };

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly fore: readonly HTMLCanvasElement[];
  readonly foreFar: readonly HTMLCanvasElement[];
  readonly hind: readonly HTMLCanvasElement[];
  readonly hindFar: readonly HTMLCanvasElement[];
}

const SEED = 4409;
const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  jaw: frames(JAW_BOX, b, SEED + 11, paintJaw),
  fore: frames(FORE_BOX, b, SEED + 23, (k) => paintFore(k, false)),
  foreFar: frames(FORE_BOX, b, SEED + 29, (k) => paintFore(k, true)),
  hind: frames(HIND_BOX, b, SEED + 31, (k) => paintHind(k, false)),
  hindFar: frames(HIND_BOX, b, SEED + 37, (k) => paintHind(k, true)),
}));

function limb(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, root: Pt, angle: number, mirror = false, stretch = 1): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  ctx.scale(stretch, mirror ? -1 : 1);
  blit(ctx, c, box, res);
  ctx.restore();
}

/** The throat puffed out (a burp), live. */
function drawPuff(ctx: CanvasRenderingContext2D, puff: number, lw: number): void {
  if (puff < 0.01) return;
  const c = { x: 98, y: 27 + 4 * puff };
  const [rx, ry] = [15 + 5 * puff, 6 + 7 * puff];
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, -0.15, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(c.x + 3, c.y - ry * 0.4, 1, c.x, c.y, rx);
  g.addColorStop(0, '#d8b67c');
  g.addColorStop(0.7, '#b48b55');
  g.addColorStop(1, '#7d5f40');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * lw;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, -0.15, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.restore();
}

/** Where the seal's jaws close (the short pins the bite here). */
export const SEAL_JAWS: Pt = { x: 130, y: 12 };

/** The seal, nose right in its own units, placed, turned and mirrored by `p`. */
export function drawCapeFurSeal(ctx: CanvasRenderingContext2D, p: Placed, look: SealLook, boil: number): void {
  const k = p.len / UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const s = spritesFor(bucketFor(scale));
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const lw = 1 / scale;
  const sweep = Math.sin(p.beat) * 0.22;
  const wave = look.wave ?? 0;
  const open = Math.max(0, Math.min(1, look.gape)) * 0.62;
  // The hind flippers trailing, toes back; the far fore flipper behind the body.
  limb(ctx, s.hindFar[f]!, HIND_BOX, s.res, HIND_UP, Math.PI - 0.06 + sweep * 0.8, true);
  limb(ctx, s.hind[f]!, HIND_BOX, s.res, HIND_DOWN, Math.PI + 0.15 + sweep);
  limb(ctx, s.foreFar[f]!, FORE_BOX, s.res, FORE_FAR, 2.78 + 0.1 * Math.sin(p.beat + 1.1), false, 0.82);
  blit(ctx, s.body[f]!, BODY_BOX, s.res);
  drawPuff(ctx, look.puff ?? 0, lw);
  drawSealFace(ctx, { ...look, open, wave }, lw, p.beat, () => {
    ctx.save();
    ctx.translate(PIVOT.x, PIVOT.y);
    ctx.rotate(open);
    ctx.translate(-PIVOT.x, -PIVOT.y);
    blit(ctx, s.jaw[f]!, JAW_BOX, s.res);
    ctx.restore();
  }, () => {
    // The near fore flipper: long, swept back along the belly (raised and waving for a "shoo").
    const lead = wave > 0 ? 2.3 - 3.2 * wave * (0.6 + 0.4 * Math.sin(p.beat * 5)) : 2.6 + 0.15 * Math.sin(p.beat);
    limb(ctx, s.fore[f]!, FORE_BOX, s.res, FORE_NEAR, lead);
  });
  ctx.restore();
}

/** Bakes the sizes the short opens on. */
export function prepareSeal(): void {
  spritesFor(bucketFor(2.45));
}
