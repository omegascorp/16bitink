import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { cycles, FOCUS, type Grade, toScreen, type View } from './story';

/**
 * The Strait of Magellan around them, seen at the waterline: a heavy grey
 * Patagonian sky over far snowy ridges, the cold grey-green water below
 * the surface (the whale's dark shape rising in it), the surface itself,
 * and the colour of each beat's mood washed over the whole picture.
 */

export const CHALK = '#e6ece8';
export const INK_BG = '#071012';

/** Water colour by depth below the surface (world px): grey-green, near black deep down. */
const WATER: readonly (readonly [number, string])[] = [
  [0, 'rgba(74,96,94,0.93)'],
  [280, 'rgba(46,66,66,0.95)'],
  [900, 'rgba(24,40,42,0.97)'],
  [1800, 'rgba(11,21,23,0.98)'],
];
const DEEPEST = WATER[WATER.length - 1]![0];

export interface Backdrop {
  readonly paper: HTMLCanvasElement;
  readonly sky: HTMLCanvasElement;
  readonly ridges: HTMLCanvasElement;
}

const SKY_H = 1500;
const RIDGES_W = 2600;
const RIDGES_H = 260;

/** The sky, its bottom edge on the horizon: heavy cloud, darkest overhead, a pale band low down. */
function makeSky(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width + 400, SKY_H);
  const g = ctx.createLinearGradient(0, 0, 0, SKY_H);
  g.addColorStop(0, '#2b333a');
  g.addColorStop(0.55, '#4f5b62');
  g.addColorStop(0.88, '#8c9799');
  g.addColorStop(1, '#a9b2b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, SKY_H);
  const rng = createRng(2025);
  // Banks of cloud: soft dark and pale washes, then a few pen strokes along their undersides.
  for (let i = 0; i < 26; i++) {
    const x = rng() * canvas.width;
    const y = SKY_H * (0.15 + rng() * 0.7);
    const rx = 160 + rng() * 260;
    const ry = 40 + rng() * 60;
    const dark = rng() < 0.6;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, rx);
    blob.addColorStop(0, dark ? 'rgba(30,36,42,0.45)' : 'rgba(200,206,204,0.3)');
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = blob;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
  const pen = new Pen(ctx, 77, 1.6);
  for (let i = 0; i < 18; i++) {
    const x = rng() * canvas.width;
    const y = SKY_H * (0.3 + rng() * 0.6);
    const w = 120 + rng() * 220;
    pen.hair([{ x, y }, { x: x + w * 0.3, y: y - 8 }, { x: x + w * 0.7, y: y - 4 }, { x: x + w, y: y + 2 }], 1.8, '#1d2328', 0.35);
  }
  return canvas;
}

/** Far ridges across the strait: blue-grey, snow along their tops, hatched on their shadowed sides. */
function makeRidges(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(RIDGES_W, RIDGES_H);
  const pen = new Pen(ctx, 1520, 1.2);
  const rng = createRng(1520);
  for (const layer of [{ base: 0.55, colour: '#6d7b82', alpha: 0.9 }, { base: 0.25, colour: '#47555d', alpha: 1 }]) {
    const pts: Pt[] = [{ x: 0, y: RIDGES_H }];
    let y = RIDGES_H * layer.base;
    for (let x = 0; x <= RIDGES_W; x += 60) {
      y = Math.max(RIDGES_H * 0.08, Math.min(RIDGES_H * 0.85, y + (rng() - 0.5) * 70));
      pts.push({ x, y });
    }
    pts.push({ x: RIDGES_W, y: RIDGES_H });
    pen.fill(pts, layer.colour, layer.alpha);
    pen.hatch(pts, 7, 1.1, 0.8, { color: '#1c2429', alpha: 0.25 });
    // Snow on the peaks.
    for (let i = 1; i < pts.length - 2; i++) {
      const p = pts[i]!;
      if (p.y < RIDGES_H * 0.4) pen.hair([{ x: p.x - 26, y: p.y + 14 }, p, { x: p.x + 30, y: p.y + 18 }], 4, '#e7ebe8', 0.85);
    }
    pen.stroke(pts.slice(1, -1), 1.8, INK, 0.7, false);
  }
  return canvas;
}

export function makeBackdrop(): Backdrop {
  return { paper: makePaper(), sky: makeSky(), ridges: makeRidges() };
}

/** The world rectangle the view shows. */
function bounds(v: View): { readonly left: number; readonly right: number } {
  return { left: v.x - FOCUS.x / v.zoom, right: v.x + (VIDEO.width - FOCUS.x) / v.zoom };
}

/** The surface's height (world px, down positive) at x: a slow swell and a chop. */
export const surfaceAt = (x: number, t: number): number => 6 * Math.sin(x / 70 + cycles(3, t)) + 3 * Math.sin(x / 26 - cycles(5, t));

/** Paper, sky, the far ridges and the water behind everything. */
export function drawBehind(ctx: CanvasRenderingContext2D, b: Backdrop, v: View, t: number): void {
  ctx.drawImage(b.paper, 0, 0);
  const horizon = toScreen(v, { x: 0, y: 0 }).y;
  if (horizon > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(b.sky, -200 - v.x * 0.05, horizon - SKY_H);
    ctx.restore();
    const k = 0.75 + 0.25 * v.zoom;
    const w = RIDGES_W * k;
    const x0 = FOCUS.x - w / 2 - v.x * 0.12;
    ctx.drawImage(b.ridges, x0, horizon - RIDGES_H * k + 6, w, RIDGES_H * k);
  }
  const deep = toScreen(v, { x: 0, y: DEEPEST }).y;
  const g = ctx.createLinearGradient(0, horizon, 0, Math.max(horizon + 1, deep));
  for (const [depth, colour] of WATER) g.addColorStop(depth / DEEPEST, colour);
  ctx.fillStyle = g;
  const top = Math.max(0, horizon);
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
  drawShafts(ctx, v, t);
}

/** Pale shafts of light slanting down from the surface. */
function drawShafts(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const top = toScreen(v, { x: 0, y: 0 }).y;
  const bottom = toScreen(v, { x: 0, y: 1300 }).y;
  if (bottom < 0 || top > VIDEO.height) return;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(210,228,222,0.12)');
  g.addColorStop(1, 'rgba(210,228,222,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  for (let i = 0; i < 6; i++) {
    const x = -900 + i * 380 + 30 * Math.sin(cycles(1, t) + i);
    const pts = [{ x, y: 0 }, { x: x + 120, y: 0 }, { x: x + 420, y: 1300 }, { x: x + 180, y: 1300 }].map((p) => toScreen(v, p));
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The water in front: what's under the surface seen through it, murkier with depth; then the surface line. */
export function drawWaterFront(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const b = bounds(v);
  const pts: Pt[] = [];
  for (let x = b.left - 40; x <= b.right + 40; x += 16) pts.push(toScreen(v, { x, y: surfaceAt(x, t) }));
  const horizon = toScreen(v, { x: 0, y: 0 }).y;
  if (horizon > VIDEO.height + 20) return;
  const deep = toScreen(v, { x: 0, y: 900 }).y;
  const g = ctx.createLinearGradient(0, horizon, 0, Math.max(horizon + 1, deep));
  g.addColorStop(0, 'rgba(58,82,80,0.4)');
  g.addColorStop(1, 'rgba(16,30,32,0.7)');
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(VIDEO.width + 50, VIDEO.height + 50);
  ctx.lineTo(-50, VIDEO.height + 50);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(214,230,226,0.45)';
  ctx.lineWidth = Math.max(2, 7 * v.zoom);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 4 * v.zoom) : ctx.moveTo(p.x, p.y + 4 * v.zoom)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, 3.4 * v.zoom);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** Paints a flat colour over the frame with a blend mode. */
function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The mood over the whole picture. */
export function drawGrade(ctx: CanvasRenderingContext2D, g: Grade, t: number): void {
  wash(ctx, 'saturation', '#808080', 0.55 * g.cold);
  wash(ctx, 'multiply', '#8fa3b8', 0.4 * g.cold);
  wash(ctx, 'soft-light', '#ff9ec0', 0.35 * g.rosy);
  wash(ctx, 'screen', '#3a2026', 0.35 * g.rosy);
  wash(ctx, 'soft-light', '#ffc76a', 0.42 * g.warm);
  if (g.warm > 0.01) drawSunbeams(ctx, g.warm, t);
  wash(ctx, 'multiply', '#9a86b8', 0.4 * g.sly);
  wash(ctx, 'soft-light', '#d070c8', 0.3 * g.sly);
}

/** Sunlight breaking through the cloud from the top left: the relief. */
function drawSunbeams(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const spread = 0.2 + i * 0.16 + 0.02 * Math.sin(cycles(1, t) + i);
    const g = ctx.createLinearGradient(-100, -100, 900, 1300);
    g.addColorStop(0, `rgba(255,214,140,${(0.22 * amount).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-100, -100);
    ctx.lineTo(1400 * Math.cos(spread) - 100, 1400 * Math.sin(spread) - 100);
    ctx.lineTo(1400 * Math.cos(spread + 0.06) - 100, 1400 * Math.sin(spread + 0.06) - 100);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.55): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 420, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(2,6,8,0)');
  g.addColorStop(1, `rgba(2,6,8,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A flat fill over everything: black for the jaws shutting, white for the flash. */
export function drawFill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
