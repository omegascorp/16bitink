import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { dab, path, smoothLoop, softLine } from '../../seal/art/paint';
import { albiCanvas, WATERLINE } from './albi';

/**
 * The river Tarn in warm light, with Albi (./albi.ts) mirrored in it and the
 * pale gravel island in the middle: painted once into a large canvas (the
 * camera zooms in, soft like a long lens). Water darkens the gravel at the
 * edge, and a broken band of foam laps along it. World coordinates are the
 * 1080x1920 frame.
 */

export const WORLD = { w: 1080, h: 1920 } as const;
const SCALE = 2.5;

const KNOTS: readonly Pt[] = [
  { x: 322, y: 1225 }, { x: 368, y: 1120 }, { x: 440, y: 1052 }, { x: 560, y: 1006 }, { x: 700, y: 992 }, { x: 860, y: 1002 }, { x: 1000, y: 1032 }, { x: 1200, y: 1080 },
  { x: 1220, y: 1600 }, { x: 950, y: 1600 }, { x: 700, y: 1570 }, { x: 520, y: 1500 }, { x: 400, y: 1410 }, { x: 336, y: 1320 },
];

/** The island's edge: smooth, with a slow wander so it never looks drawn with a compass. */
export const EDGE: readonly Pt[] = smoothLoop(KNOTS, 10).map((p, i) => {
  const a = i * 0.21;
  const n = 5.5 * Math.sin(a) + 3.5 * Math.sin(a * 2.7 + 1) + 2 * Math.sin(a * 6.1 + 2);
  return { x: p.x + n * 0.8, y: p.y + n };
});

/** Shallow pools on the gravel where the birds bathe (x, y, radius). */
export const POOLS: readonly (readonly [number, number, number])[] = [[774, 1126, 92], [962, 1196, 96]];

function water(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, WATERLINE, 0, WORLD.h);
  g.addColorStop(0, '#a4cdbb');
  g.addColorStop(0.16, '#74b4a8');
  g.addColorStop(0.5, '#4f9c96');
  g.addColorStop(1, '#2f7674');
  ctx.fillStyle = g;
  ctx.fillRect(0, WATERLINE, WORLD.w, WORLD.h - WATERLINE);
}

/** Albi upside down in the river: blurred soft, torn by ripples, fading towards the viewer. */
function reflection(ctx: CanvasRenderingContext2D, view: HTMLCanvasElement): void {
  const h = 420;
  const row = makeCanvas(540, h / 2);
  row.ctx.imageSmoothingQuality = 'high';
  for (let y = 0; y < h / 2; y++) {
    const u = y / (h / 2);
    const shift = (1 + u * 9) * Math.sin(y * 0.5) + (0.5 + u * 5) * Math.sin(y * 1.37 + 1);
    const sy = view.height * (1 - u * 0.86) - 1;
    row.ctx.drawImage(view, 0, Math.max(0, sy - 2), view.width, 2.5, shift, y, 540, 1.4);
  }
  // Down and back up: the softness of water, without any stair-steps.
  const soft = makeCanvas(180, 70);
  soft.ctx.imageSmoothingQuality = 'high';
  soft.ctx.drawImage(row.canvas, 0, 0, 180, 70);
  const mask = makeCanvas(WORLD.w, h);
  mask.ctx.imageSmoothingQuality = 'high';
  mask.ctx.drawImage(row.canvas, 0, 0, WORLD.w, h);
  mask.ctx.globalAlpha = 0.6;
  mask.ctx.drawImage(soft.canvas, 0, 0, WORLD.w, h);
  mask.ctx.globalAlpha = 1;
  mask.ctx.globalCompositeOperation = 'destination-in';
  const fade = mask.ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,0.8)');
  fade.addColorStop(0.5, 'rgba(0,0,0,0.42)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  mask.ctx.fillStyle = fade;
  mask.ctx.fillRect(0, 0, WORLD.w, h);
  ctx.drawImage(mask.canvas, 0, WATERLINE);
}

/** Wind on the water: long soft strokes, wider and further apart as they come nearer; a path of sun. */
function ripples(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(8);
  for (let i = 0; i < 260; i++) {
    const u = rng() ** 1.6;
    const y = WATERLINE + 6 + u * 1180;
    const len = 30 + u * 220 + rng() * 60;
    const x = -40 + rng() * 1100;
    const light = rng() < 0.6;
    softLine(ctx, [{ x, y }, { x: x + len * 0.5, y: y + 1.5 * rng() }, { x: x + len, y }], 2 + u * 7, light ? '#d4efe6' : '#28615f', light ? 0.14 + (1 - u) * 0.12 : 0.1, 2);
  }
  for (let i = 0; i < 90; i++) {
    const y = WATERLINE + 6 + rng() ** 1.4 * 300;
    const x = 880 + (rng() - 0.5) * (60 + (y - WATERLINE) * 0.7);
    softLine(ctx, [{ x, y }, { x: x + 14 + rng() * 34, y }], 2.4, '#fff4d2', 0.4, 2);
  }
}

function shallows(ctx: CanvasRenderingContext2D): void {
  const ring = [...EDGE, EDGE[0]!];
  for (const [w, c, a] of [[150, '#7fc6b4', 0.16], [96, '#9bd7c2', 0.22], [54, '#c0e8d2', 0.3], [24, '#dcecd8', 0.34]] as const) softLine(ctx, ring, w, c, a, 18);
}

function pebbles(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(2024);
  const tones = ['#9c957f', '#ebe3cd', '#b8ab8e', '#847d69', '#d3c7a9', '#c4b79a', '#a39079', '#dcc9ae'];
  for (let i = 0; i < 1500; i++) {
    const x = 300 + rng() * 840;
    const y = 975 + rng() * 640;
    const r = 3 + rng() ** 2 * 15 * (0.55 + (y - 980) / 700);
    ctx.fillStyle = 'rgba(40,34,20,0.28)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + r * 0.34, r * 1.03, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tones[Math.floor(rng() * tones.length)]!;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, rng() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.38, r * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The gravel bar: pale and sun-warm on top, wet and dark where the river laps it, with glints of water between the stones. */
function island(ctx: CanvasRenderingContext2D): void {
  const ring = [...EDGE, EDGE[0]!];
  ctx.save();
  path(ctx, EDGE);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 980, 0, 1600);
  g.addColorStop(0, '#e2d7bc');
  g.addColorStop(0.5, '#cfc2a3');
  g.addColorStop(1, '#a89c80');
  ctx.fillStyle = g;
  ctx.fillRect(280, 960, 900, 680);
  pebbles(ctx);
  softLine(ctx, ring, 130, '#4a4635', 0.3, 24);
  softLine(ctx, ring, 62, '#3c3a2d', 0.52, 18);
  softLine(ctx, ring, 26, '#2f3a33', 0.5, 10);
  const rng = createRng(40);
  for (let i = 0; i < 260; i++) {
    const p = EDGE[Math.floor(rng() * EDGE.length)]!;
    const [x, y] = [p.x + (rng() - 0.5) * 70, p.y + (rng() - 0.5) * 70];
    ctx.fillStyle = 'rgba(255,253,240,0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, 1.2 + rng() * 2.2, 0.8 + rng() * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  dab(ctx, 800, 1060, 340, '255,236,190', 0.22);
  for (const [x, y, r] of POOLS) pool(ctx, x, y, r);
  ctx.restore();
}

function pool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  dab(ctx, x, y, r * 1.45, '60,56,42', 0.6);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.42);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
  g.addColorStop(0, 'rgba(168,214,206,0.92)');
  g.addColorStop(0.75, 'rgba(120,186,178,0.8)');
  g.addColorStop(1, 'rgba(120,186,178,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  softLine(ctx, [{ x: x - r * 0.5, y: y - 8 }, { x: x + r * 0.4, y: y - 10 }], 5, '#ffffff', 0.5, 2);
}

let cache: HTMLCanvasElement | null = null;

/** The painted world, made once. */
export function backdrop(): HTMLCanvasElement {
  if (cache) return cache;
  const { canvas, ctx } = makeCanvas(WORLD.w * SCALE, WORLD.h * SCALE);
  ctx.scale(SCALE, SCALE);
  const view = albiCanvas(SCALE);
  ctx.drawImage(view, 0, 0, WORLD.w, WATERLINE + 4);
  water(ctx);
  reflection(ctx, view);
  ripples(ctx);
  shallows(ctx);
  island(ctx);
  cache = canvas;
  return canvas;
}

export function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(backdrop(), 0, 0, WORLD.w, WORLD.h);
}

/** Everything that is river below the far bank, for clipping what swims in it. */
export function waterPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(-900, WATERLINE + 2, 2880, 1500);
  ctx.moveTo(EDGE[0]!.x, EDGE[0]!.y);
  EDGE.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
}

/** The river over a fish: `depth` 0 clear .. 1 hides it, the painted water itself laid back over it, so no band shows. */
export function drawWaterOver(ctx: CanvasRenderingContext2D, depth: number): void {
  if (depth <= 0.005) return;
  ctx.save();
  waterPath(ctx);
  ctx.clip('evenodd');
  ctx.globalAlpha = Math.min(1, depth);
  drawBackdrop(ctx);
  ctx.restore();
}

const fades = new Map<number, HTMLCanvasElement>();

/** The river's own paint, solid at the far bank and clear by `y1`. */
function fadeLayer(y1: number): HTMLCanvasElement {
  const have = fades.get(y1);
  if (have) return have;
  const h = y1 - WATERLINE;
  const { canvas, ctx } = makeCanvas(WORLD.w * SCALE, h * SCALE);
  ctx.drawImage(backdrop(), 0, -WATERLINE * SCALE);
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(0, 0, 0, h * SCALE);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  fades.set(y1, canvas);
  return canvas;
}

/** The river closing over whatever lies above `y1`: fully at the far bank, clear by `y1`. Keep `y1` above the island. */
export function drawDepthFade(ctx: CanvasRenderingContext2D, y1: number): void {
  ctx.drawImage(fadeLayer(y1), 0, WATERLINE, WORLD.w, y1 - WATERLINE);
}

/** Glinting rings of ripple over something moving just under the surface. */
export function drawRipples(ctx: CanvasRenderingContext2D, at: readonly Pt[], w: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  at.forEach((p, i) => {
    softLine(ctx, [{ x: p.x - 60, y: p.y - 3 }, { x: p.x, y: p.y + 2 }, { x: p.x + 60, y: p.y - 3 }], 5, '#eafaf2', 0.5 * alpha, 2);
    softLine(ctx, [{ x: p.x - 30 + (i % 3) * 8, y: p.y + w }, { x: p.x + 30, y: p.y + w + 2 }], 3, '#eafaf2', 0.42 * alpha, 2);
  });
  ctx.restore();
}

/**
 * The lapping waterline: broken tongues of foam running along the shore,
 * sliding in and out with the swell (whole numbers of swells per loop).
 */
export function drawFoam(ctx: CanvasRenderingContext2D, t: number, loopS: number): void {
  const swell = (2 * Math.PI * 6 * t) / loopS;
  const n = EDGE.length;
  const mid = { x: 760, y: 1280 };
  const out = (i: number, d: number): Pt => {
    const p = EDGE[(i + n) % n]!;
    const len = Math.hypot(p.x - mid.x, p.y - mid.y) || 1;
    return { x: p.x + ((p.x - mid.x) / len) * d, y: p.y + ((p.y - mid.y) / len) * d };
  };
  ctx.save();
  for (let i = 0; i < n; i += 2) {
    const gaps = Math.sin(i * 0.37) + 0.7 * Math.sin(i * 0.93 + 2);
    const lap = Math.sin(swell + i * 0.11);
    const d = 5 + 7 * lap;
    if (gaps > 0.72) continue;
    const run = [out(i, d), out(i + 1, d + 1), out(i + 2, d)];
    softLine(ctx, run, 13 + 5 * Math.sin(i * 1.3), '#ffffff', 0.5, 5);
    if (gaps < -0.3) softLine(ctx, [out(i, d + 14), out(i + 1, d + 16)], 8, '#f4fbf6', 0.22, 4);
  }
  ctx.restore();
}
