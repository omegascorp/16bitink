import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { BOAT_X, cycles, FLOOR_Y, toScreen, type View } from './story';

/**
 * Off Cape Cod: a pale sky over a low coast, green water that darkens with
 * depth (shafts of light, drifting silt), the sand 45 ft down with a few
 * rocks and weed, and the lobster boat on the surface.
 */

export const INK_BG = '#06100e';
export const CHALK = '#e6ece8';

const WATER: readonly (readonly [number, string])[] = [
  [0, 'rgba(70,128,108,0.95)'],
  [260, 'rgba(36,88,74,0.96)'],
  [800, 'rgba(18,56,48,0.97)'],
  [FLOOR_Y, 'rgba(8,28,26,0.98)'],
];

export interface Backdrop {
  readonly paper: HTMLCanvasElement;
  readonly sky: HTMLCanvasElement;
  readonly floor: HTMLCanvasElement;
}

const SKY_H = 1400;
const FLOOR_W = 3400;
const FLOOR_H = 360;

function makeSky(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width + 400, SKY_H);
  const g = ctx.createLinearGradient(0, 0, 0, SKY_H);
  g.addColorStop(0, '#6f93ad');
  g.addColorStop(0.6, '#a9c4d0');
  g.addColorStop(1, '#e6e3d2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, SKY_H);
  const rng = createRng(2021);
  for (let i = 0; i < 18; i++) {
    const x = rng() * canvas.width;
    const y = SKY_H * (0.2 + rng() * 0.6);
    const rx = 150 + rng() * 240;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, rx);
    blob.addColorStop(0, rng() < 0.7 ? 'rgba(250,250,244,0.55)' : 'rgba(90,110,130,0.3)');
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.28);
    ctx.translate(-x, -y);
    ctx.fillStyle = blob;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
  // A low line of dunes at the horizon.
  const pen = new Pen(ctx, 611, 1.2);
  const dunes: Pt[] = [{ x: 0, y: SKY_H }];
  for (let x = 0; x <= canvas.width; x += 50) dunes.push({ x, y: SKY_H - 34 - 18 * Math.sin(x / 190) - 9 * Math.sin(x / 61) });
  dunes.push({ x: canvas.width, y: SKY_H });
  pen.fill(dunes, '#b9b79a', 0.95);
  pen.stroke(dunes.slice(1, -1), 2, INK, 0.7, false);
  return canvas;
}

/** The sand: a rippled bank, hatched in the troughs, with rocks and weed. */
function makeFloor(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FLOOR_W, FLOOR_H);
  const pen = new Pen(ctx, 4500, 1.4);
  const rng = createRng(45);
  const top: Pt[] = [];
  for (let x = 0; x <= FLOOR_W; x += 40) top.push({ x, y: 70 + 12 * Math.sin(x / 140) + 6 * Math.sin(x / 47) });
  const bank = [{ x: 0, y: FLOOR_H }, ...top, { x: FLOOR_W, y: FLOOR_H }];
  const g = ctx.createLinearGradient(0, 40, 0, FLOOR_H);
  g.addColorStop(0, '#9a9368');
  g.addColorStop(0.4, '#6f6c4c');
  g.addColorStop(1, '#0a1c1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  bank.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 70; i++) {
    const x = rng() * FLOOR_W;
    const y = 90 + rng() * 120;
    pen.hair([{ x, y }, { x: x + 40 + rng() * 60, y: y + 4 * Math.sin(x) }], 2, '#3c3d2a', 0.55);
  }
  pen.stroke(top, 3, INK, 0.9, true);
  // Rocks.
  for (let i = 0; i < 9; i++) {
    const x = 120 + rng() * (FLOOR_W - 240);
    const r = 24 + rng() * 40;
    const rock = [{ x: x - r, y: 78 }, { x: x - r * 0.7, y: 78 - r * 0.7 }, { x: x + r * 0.1, y: 78 - r * 0.95 }, { x: x + r * 0.8, y: 78 - r * 0.5 }, { x: x + r, y: 80 }];
    pen.fill(rock, '#4e5650', 1);
    pen.hatch(rock, 6, 0.9, 1, { color: '#12181a', alpha: 0.45 });
    pen.closed(rock, 2.4, INK);
  }
  // Weed.
  for (let i = 0; i < 16; i++) {
    const x = rng() * FLOOR_W;
    for (let k = 0; k < 3; k++) {
      pen.stroke([{ x: x + k * 8, y: 80 }, { x: x + k * 8 + 6 * (k - 1), y: 20 }, { x: x + k * 8 + 14 * (k - 1), y: -20 - k * 10 }], 3, '#2f6a3c', 0.9, false);
    }
  }
  return canvas;
}

export function makeBackdrop(): Backdrop {
  return { paper: makePaper(), sky: makeSky(), floor: makeFloor() };
}

/** The world's surface height at x: a slow swell and a chop. */
export const surfaceAt = (x: number, t: number): number => 6 * Math.sin(x / 70 + cycles(3, t)) + 3 * Math.sin(x / 26 - cycles(5, t));

/** Sky, the water behind everything, the sand, shafts of light and silt. */
export function drawBehind(ctx: CanvasRenderingContext2D, b: Backdrop, v: View, t: number): void {
  ctx.drawImage(b.paper, 0, 0);
  const horizon = toScreen(v, { x: 0, y: 0 }).y;
  if (horizon > 0) ctx.drawImage(b.sky, -200 - v.x * 0.04, horizon - SKY_H);
  const deep = toScreen(v, { x: 0, y: FLOOR_Y }).y;
  const g = ctx.createLinearGradient(0, horizon, 0, Math.max(horizon + 1, deep));
  for (const [depth, colour] of WATER) g.addColorStop(depth / FLOOR_Y, colour);
  ctx.fillStyle = g;
  const top = Math.max(0, horizon);
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
  drawShafts(ctx, v, t);
  const floorTop = toScreen(v, { x: v.x, y: FLOOR_Y - 70 }).y;
  if (floorTop < VIDEO.height) {
    const k = v.zoom;
    const w = FLOOR_W * k;
    ctx.drawImage(b.floor, (-FLOOR_W / 2 - v.x) * k + FOCUS_X, floorTop, w, FLOOR_H * k);
    ctx.fillStyle = '#0a1c1a';
    ctx.fillRect(0, floorTop + FLOOR_H * k - 2, VIDEO.width, VIDEO.height);
  }
  drawSilt(ctx, v, t);
}

const FOCUS_X = VIDEO.width / 2;

/** Pale shafts of light slanting down from the surface. */
function drawShafts(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const top = toScreen(v, { x: 0, y: 0 }).y;
  const bottom = toScreen(v, { x: 0, y: 1100 }).y;
  if (bottom < 0 || top > VIDEO.height) return;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(200,240,220,0.16)');
  g.addColorStop(1, 'rgba(200,240,220,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  for (let i = 0; i < 6; i++) {
    const x = -900 + i * 380 + 30 * Math.sin(cycles(1, t) + i);
    const pts = [{ x, y: 0 }, { x: x + 110, y: 0 }, { x: x + 400, y: 1100 }, { x: x + 170, y: 1100 }].map((p) => toScreen(v, p));
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const SILT = (() => {
  const rng = createRng(77);
  return Array.from({ length: 70 }, () => ({ x: rng(), y: rng(), r: 1.5 + rng() * 3, ph: rng() }));
})();

/** Specks of silt drifting in the water, a whole number of cycles a loop. */
function drawSilt(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  ctx.save();
  ctx.fillStyle = '#cfe6dc';
  for (const s of SILT) {
    const x = ((s.x * VIDEO.width + 30 * Math.sin(cycles(2, t) + s.ph * 6.28)) % VIDEO.width + VIDEO.width) % VIDEO.width;
    const y = (((s.y + (((t / 10.5) + s.ph) % 1) * 0.15) % 1) * VIDEO.height + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = 0.28 * Math.min(1, v.zoom);
    ctx.beginPath();
    ctx.arc(x, y, s.r * Math.min(1.6, v.zoom), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The water in front of things at the surface: a tint through which what is
 * just below shows, easing off with depth, and the surface line itself.
 */
export function drawWaterFront(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const horizon = toScreen(v, { x: 0, y: 0 }).y;
  if (horizon > VIDEO.height + 20) return;
  const left = v.x - FOCUS_X / v.zoom - 40;
  const right = v.x + FOCUS_X / v.zoom + 40;
  const pts: Pt[] = [];
  for (let x = left; x <= right; x += 16) pts.push(toScreen(v, { x, y: surfaceAt(x, t) }));
  const deep = toScreen(v, { x: 0, y: 700 }).y;
  const g = ctx.createLinearGradient(0, horizon, 0, Math.max(horizon + 1, deep));
  g.addColorStop(0, 'rgba(70,128,108,0.42)');
  g.addColorStop(1, 'rgba(20,60,50,0.1)');
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
  ctx.strokeStyle = 'rgba(230,244,238,0.5)';
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

// ---------------------------------------------------------------- the boat

const HULL_W = '#ece9df';
const STRIPE = '#27527a';
const BOOT = '#a8322a';

/** A lobster boat, side on, bow to +x, waterline at the origin; drawn at BOAT_X, rocking. */
export function drawBoat(ctx: CanvasRenderingContext2D, v: View, t: number, boil: number): void {
  const at = toScreen(v, { x: BOAT_X, y: surfaceAt(BOAT_X, t) });
  if (at.y < -400 || at.y > VIDEO.height + 600) return;
  const pen = new Pen(ctx, 8800 + boil * 977, 1.3);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.rotate(0.014 * Math.sin(cycles(3, t)));
  const hull = [
    { x: -330, y: -88 }, { x: -120, y: -80 }, { x: 150, y: -92 }, { x: 290, y: -128 }, { x: 345, y: -138 }, { x: 320, y: -40 }, { x: 250, y: 24 },
    { x: 100, y: 38 }, { x: -200, y: 40 }, { x: -320, y: 26 }, { x: -336, y: -40 },
  ];
  // Stacked traps on the stern deck.
  for (let k = 0; k < 3; k++) {
    const x = -300 + k * 62;
    const trap = [{ x, y: -88 }, { x: x + 56, y: -88 }, { x: x + 56, y: -150 }, { x, y: -150 }];
    pen.fill(trap, '#3f4a42', 0.55);
    pen.closed(trap, 2.2, INK);
    for (let i = 1; i < 4; i++) pen.hair([{ x: x + i * 14, y: -88 }, { x: x + i * 14, y: -150 }], 1.2, INK, 0.6);
    pen.hair([{ x, y: -119 }, { x: x + 56, y: -119 }], 1.2, INK, 0.6);
  }
  pen.fill(hull, HULL_W, 1);
  pen.hatch(hull, 7, 0.5, 1, { color: '#6c6a5c', alpha: 0.3, onlyBelow: -20 });
  pen.fill([{ x: -334, y: -50 }, { x: 330, y: -62 }, { x: 322, y: -40 }, { x: -336, y: -34 }], STRIPE, 0.95);
  pen.fill([{ x: -330, y: 10 }, { x: 270, y: 6 }, { x: 250, y: 24 }, { x: 100, y: 38 }, { x: -200, y: 40 }, { x: -320, y: 26 }], BOOT, 0.95);
  pen.closed(hull, 3, INK);
  // The cabin.
  const cabin = [{ x: -60, y: -90 }, { x: -50, y: -190 }, { x: 80, y: -196 }, { x: 140, y: -90 }];
  pen.fill(cabin, '#f4f1e6', 1);
  pen.closed(cabin, 2.8, INK);
  pen.fill([{ x: -36, y: -170 }, { x: 62, y: -174 }, { x: 96, y: -112 }, { x: -40, y: -112 }], '#3d5b6e', 0.95);
  pen.hair([{ x: -30, y: -160 }, { x: 40, y: -164 }], 3, '#cfe2e8', 0.7);
  pen.closed([{ x: -36, y: -170 }, { x: 62, y: -174 }, { x: 96, y: -112 }, { x: -40, y: -112 }], 2, INK);
  pen.fill([{ x: -66, y: -196 }, { x: 96, y: -204 }, { x: 96, y: -192 }, { x: -66, y: -186 }], '#27527a', 1);
  // The mast with the red-and-white dive flag.
  pen.stroke([{ x: 20, y: -200 }, { x: 22, y: -330 }], 4, INK, 1, false);
  const flag = [{ x: 24, y: -328 }, { x: 96, y: -322 }, { x: 94, y: -276 }, { x: 24, y: -280 }];
  pen.fill(flag, '#c8322a', 1);
  pen.fill([{ x: 24, y: -328 }, { x: 44, y: -327 }, { x: 94, y: -280 }, { x: 94, y: -276 }, { x: 74, y: -277 }, { x: 24, y: -322 }], '#f6f2e6', 1);
  pen.closed(flag, 2.2, INK);
  // Buoys on the rail.
  for (const [x, c] of [[190, '#e2a23a'], [226, '#c8322a']] as const) {
    pen.dot(x, -108, 15, c, 1);
    pen.circle(x, -108, 15, 2.4, INK);
  }
  ctx.restore();
}
