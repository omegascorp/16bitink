import { INK, makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { dab, edgeAt, path, softLine, taper } from '../../seal/art/paint';
import { CHINLINE, CORNER, EYE, FAR_LOW, FAR_UP, GILL, HEAD_SHAPE, JAW_SHAPE, NEAR_LOW, NEAR_UP, PECTORAL, TOPLINE } from './catfishShape';
import { brushed, cloud, field, glint, offset, type Rgb, skin, step } from './skin';

/**
 * The baked parts of the side-on head (./catfishSide.ts): the wet marbled skin
 * of the near cheek and neck with the eye, gill slit and pectoral fin on them,
 * the far upper lip, and the lower jaw that swings. Layered washes first, then
 * form and wet light, then thin ink.
 */

export const RES = 1.6;
/** Marbling blobs per own unit: this close, a blob is about the size of the eye socket to the lip. */
const GRAIN = 0.34;

/** How dark the skin is at a point: dark over the head and neck, breaking to cream round the jaw and throat. */
function dorsalAt(x: number, y: number): number {
  const top = edgeAt(TOPLINE, x);
  const bot = edgeAt(CHINLINE, x);
  const v = (y - top) / (bot - top);
  return 1.02 - step(0.34, 0.74, v);
}

function colourAt(x: number, y: number): Rgb {
  const dark = dorsalAt(x, y);
  return skin(dark, cloud(x * GRAIN, y * GRAIN) * (0.4 + 0.6 * step(0, 0.45, dark)));
}

export interface Sprite { readonly canvas: HTMLCanvasElement; readonly x0: number; readonly y0: number }

function sprite(x0: number, y0: number, x1: number, y1: number, paint: (ctx: CanvasRenderingContext2D, px: number) => void): Sprite {
  const { canvas, ctx } = makeCanvas(Math.ceil((x1 - x0) * RES), Math.ceil((y1 - y0) * RES));
  ctx.scale(RES, RES);
  ctx.translate(-x0, -y0);
  paint(ctx, 1 / RES);
  return { canvas, x0, y0 };
}

function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The band of fine bristle teeth just inside a lip: `side` +1 is to the left of the line's travel. */
function bristles(ctx: CanvasRenderingContext2D, rim: readonly Pt[], side: 1 | -1, depth: (u: number) => number, px: number, seed: number): void {
  const inner = offset(rim, (u) => side * depth(u));
  ctx.fillStyle = '#5f5052';
  path(ctx, [...rim, ...[...inner].reverse()]);
  ctx.fill();
  const rng = createRng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = px * 1.5;
  for (let i = 1; i < rim.length; i++) {
    const [p0, p1, q1] = [rim[i - 1]!, rim[i]!, inner[i]!];
    const n = Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 1.5);
    for (let k = 0; k < n; k++) {
      const f = k / n;
      const [x, y] = [p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f];
      const h = 0.42 + rng() * 0.6;
      ctx.strokeStyle = rng() < 0.75 ? '#f4eedd' : '#bdb19b';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (q1.x - p1.x) * h + (rng() - 0.5) * 2, y + (q1.y - p1.y) * h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A thick pale fleshy lip along `rim`, on `side`: creased, wet, with the ink only along its inner edge. */
function lip(ctx: CanvasRenderingContext2D, rim: readonly Pt[], side: 1 | -1, thick: (u: number) => number, px: number, seed: number): void {
  const outer = offset(rim, (u) => side * thick(u));
  const mid = offset(rim, (u) => side * thick(u) * 0.48);
  const band = [...rim, ...[...outer].reverse()];
  ctx.save();
  path(ctx, band);
  ctx.clip();
  ctx.fillStyle = '#d9c7ab';
  ctx.fillRect(0, 300, 1100, 1000);
  softLine(ctx, outer, 16, '#8a7a5e', 0.75, 5);
  softLine(ctx, rim, 7, '#b3977f', 0.6, 3);
  softLine(ctx, mid, 7, '#fff4e4', 0.8, 3);
  const rng = createRng(seed);
  rim.forEach((p, i) => {
    if (i % 4 || rng() < 0.35) return;
    softLine(ctx, [p, outer[i]!], 1.4, '#7c6854', 0.2, 1);
  });
  ctx.restore();
  rim.forEach((p, i) => {
    if (i % 13 === 4) glint(ctx, mid[i]!.x, mid[i]!.y, 6 + (i % 7), 1.1, Math.atan2(rim[Math.min(rim.length - 1, i + 1)]!.y - p.y, rim[Math.min(rim.length - 1, i + 1)]!.x - p.x), 0.75);
  });
  inkLine(ctx, outer, px * 2.1, 0.4);
  inkLine(ctx, rim, px * 3, 0.82);
}

/** Thin sensory pores along the head, a row of ink dots. */
function pores(ctx: CanvasRenderingContext2D, line: readonly Pt[], every: number): void {
  ctx.fillStyle = '#17160c';
  line.forEach((p, i) => {
    if (i % every) return;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/** Form and wet light over the head: rounded over the top and the cheek, the sky lying long on the wet skin, a few bright touches. */
function paintGloss(ctx: CanvasRenderingContext2D): void {
  const along = (d: number, from: number, to: number): Pt[] => offset(TOPLINE, () => -d).filter((p) => p.x >= from && p.x <= to);
  // The flat top of the shovel, turned to the sky.
  dab(ctx, 190, 616, 130, '226,222,190', 0.26);
  dab(ctx, 350, 572, 170, '200,206,180', 0.18);
  // Round the head under the top, into the cheek, and behind the mouth's corner.
  softLine(ctx, offset(NEAR_UP, () => 66).filter((p) => p.x > 200), 62, '#14130a', 0.26, 5);
  // The edge where the flat top of the shovel turns down into the cheek.
  softLine(ctx, along(100, 200, 780), 44, '#12110a', 0.3, 5);
  dab(ctx, 700, 700, 190, '18,18,10', 0.42);
  dab(ctx, 690, 900, 150, '30,28,16', 0.34);
  dab(ctx, 930, 800, 220, '14,14,8', 0.34);
  brushed(ctx, 60, 420, 1010, 760, 16, (c) => {
    softLine(c, along(50, 150, 700), 46, '#c6d2c0', 0.3, 4);
    softLine(c, along(120, 380, 740), 26, '#d8dfca', 0.16, 3);
  });
  brushed(ctx, 60, 420, 1010, 760, 3, (c) => {
    softLine(c, along(40, 240, 420), 7, '#f6faf2', 0.64, 3);
    softLine(c, along(46, 480, 640), 5, '#ffffff', 0.5, 2);
    softLine(c, along(30, 150, 205), 5, '#ffffff', 0.6, 2);
  });
  const rng = createRng(47);
  for (let i = 0; i < 12; i++) {
    const x = 180 + rng() * 620;
    const y = edgeAt(TOPLINE, x) + 40 + rng() * 120;
    glint(ctx, x, y, 4 + rng() * 9, 0.9 + rng() * 0.8, -0.2 + rng() * 0.2, 0.62);
  }
}

/** A tiny bead of an eye, set low and far forward, just above the lip. */
function paintEye(ctx: CanvasRenderingContext2D, px: number): void {
  const { x, y } = EYE;
  dab(ctx, x, y, 34, '16,14,8', 0.62);
  ctx.fillStyle = '#c7b78f';
  ctx.beginPath();
  ctx.ellipse(x, y, 19, 17.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(x, y, 1, x, y, 15.5);
  iris.addColorStop(0, '#e9cf6e');
  iris.addColorStop(0.7, '#b98f33');
  iris.addColorStop(1, '#5e4816');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.arc(x - 1, y + 0.5, 8.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 5, y - 5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x + 4.5, y + 4.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  inkLine(ctx, [...Array.from({ length: 25 }, (_, i) => ({ x: x + 19 * Math.cos((i / 24) * Math.PI * 2), y: y + 17.5 * Math.sin((i / 24) * Math.PI * 2) }))], px * 2.4, 0.9);
  // The thick skin folded over it.
  inkLine(ctx, [{ x: x - 24, y: y - 9 }, { x: x - 6, y: y - 24 }, { x: x + 18, y: y - 21 }, { x: x + 30, y: y - 6 }], px * 2.2, 0.42);
}

function nostril(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  dab(ctx, x, y, 15, '6,8,4', 0.66);
  ctx.fillStyle = '#0a0c08';
  ctx.beginPath();
  ctx.ellipse(x, y, 5.5, 3.6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  glint(ctx, x + 1, y - 6, 5, 1, -0.4, 0.8);
}

/** The gill slit: a dark crease, the flap's lit edge in front of it, the shadow it throws behind. */
function paintGill(ctx: CanvasRenderingContext2D, px: number): void {
  softLine(ctx, GILL.map((p) => ({ x: p.x + 16, y: p.y })), 34, '#100f08', 0.5, 5);
  softLine(ctx, GILL.map((p) => ({ x: p.x - 5, y: p.y })), 5, '#e7e6cf', 0.3, 3);
  taper(ctx, GILL, 3 * px + 5, 2 * px, INK, 0.85);
}

function paintPectoral(ctx: CanvasRenderingContext2D, px: number): void {
  const root = { x: 790, y: 980 };
  const g = ctx.createLinearGradient(790, 980, 1030, 1140);
  g.addColorStop(0, '#343a26');
  g.addColorStop(0.65, '#565a40');
  g.addColorStop(1, '#8d8d6a');
  ctx.save();
  path(ctx, PECTORAL);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  dab(ctx, 900, 1010, 90, '226,230,200', 0.2);
  for (let i = 0; i < 15; i++) {
    const a = 0.2 + (i / 14) * 1.0;
    const far = { x: root.x + Math.cos(a) * 260, y: root.y + Math.sin(a) * 260 };
    const mid = { x: (root.x + far.x) / 2 + 8, y: (root.y + far.y) / 2 - 6 };
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = px * 1.7;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.quadraticCurveTo(mid.x, mid.y, far.x, far.y);
    ctx.stroke();
  }
  ctx.restore();
  inkLine(ctx, PECTORAL, px * 3, 0.8);
}

function paintHead(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.save();
  path(ctx, HEAD_SHAPE);
  ctx.clip();
  field(ctx, 90, 430, 1020, 1130, 0.7, colourAt);
  paintGloss(ctx);
  // The folds running back from the corner of the mouth.
  softLine(ctx, [CORNER, { x: 680, y: 806 }, { x: 716, y: 748 }], 14, '#14120a', 0.5, 4);
  inkLine(ctx, [{ x: CORNER.x + 8, y: CORNER.y - 4 }, { x: 684, y: 802 }, { x: 720, y: 742 }], px * 2, 0.5);
  paintGill(ctx, px);
  ctx.restore();
  // Ink over the top, none along the neck: it melts into the body behind.
  inkLine(ctx, TOPLINE.filter((p) => p.x < 800), px * 3.6, 0.9);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(850, 0, 1005, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(850, 400, 200, 760);
  ctx.restore();
  paintPectoral(ctx, px);
  bristles(ctx, NEAR_UP, -1, (u) => 4 + 15 * Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.7, px, 3);
  bristles(ctx, FAR_UP, -1, (u) => 4 + 8 * Math.sin(Math.PI * u), px, 8);
  lip(ctx, FAR_UP, 1, (u) => 5 + 11 * (1 - u) ** 0.6, px, 2);
  lip(ctx, NEAR_UP, 1, (u) => 8 + 22 * Math.min(1, u * 2.2) ** 0.8, px, 5);
  pores(ctx, offset(NEAR_UP, () => 44).filter((p) => p.x > 300 && p.x < 590), 4);
  for (const [x, y] of [[168, 622], [228, 596]] as const) nostril(ctx, x, y);
  paintEye(ctx, px);
}

function paintJaw(ctx: CanvasRenderingContext2D, px: number): void {
  const paintOut = (): void => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(640, 0, 790, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(640, 780, 180, 380);
    ctx.restore();
  };
  ctx.save();
  path(ctx, JAW_SHAPE);
  ctx.clip();
  field(ctx, 90, 800, 810, 1130, 0.7, colourAt);
  // The jaw rounding away under the chin, and the shade the lip throws.
  softLine(ctx, offset(NEAR_LOW, () => -44), 26, '#7c7052', 0.42, 4);
  softLine(ctx, offset(CHINLINE, () => 26).filter((p) => p.x > 110 && p.x < 800), 50, '#5d5438', 0.5, 5);
  dab(ctx, 130, 990, 80, '40,36,22', 0.5);
  brushed(ctx, 90, 860, 810, 1130, 6, (c) => softLine(c, [{ x: 200, y: 1014 }, { x: 330, y: 1048 }, { x: 480, y: 1052 }, { x: 600, y: 1030 }], 14, '#fff8e6', 0.4, 3));
  for (const [x, y, l, a] of [[260, 1030, 12, 0.3], [420, 1056, 10, 0], [540, 1044, 9, -0.15]] as const) glint(ctx, x, y, l, 1.4, a, 0.8);
  ctx.restore();
  inkLine(ctx, CHINLINE.filter((p) => p.x < 800), px * 3.4, 0.82);
  paintOut();
  bristles(ctx, NEAR_LOW, 1, (u) => 4 + 14 * Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.7, px, 13);
  bristles(ctx, FAR_LOW, 1, (u) => 4 + 7 * Math.sin(Math.PI * u), px, 18);
  lip(ctx, FAR_LOW, -1, (u) => 5 + 10 * (1 - u) ** 0.6, px, 7);
  lip(ctx, NEAR_LOW, -1, (u) => 8 + 20 * Math.min(1, u * 2.2) ** 0.8, px, 9);
}

export interface Parts { readonly head: Sprite; readonly jaw: Sprite }
let parts: Parts | null = null;

export function bake(): Parts {
  parts ??= { head: sprite(60, 420, 1060, 1190, paintHead), jaw: sprite(60, 780, 830, 1140, paintJaw) };
  return parts;
}
