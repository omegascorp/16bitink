import { BOIL } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { makeDraw, oval } from '../../../src/art/kit';
import { createRng } from '../../../src/logic/rng';
import { mix, rgba } from '../../../src/art/wash';
import { VIDEO } from '../short';
import { LINE } from './bodyArt';
import { type Camera, CAM_Y, MOODS, type Mood, moodWeights } from './story';

/**
 * The savanna at ground level behind the egg-eater (the game's chapter 4
 * palette: dust, dry grass, a thorn tree on the horizon): a sky that changes
 * with each sentence's mood, a hazy far plain, thorn trees, and the ground
 * painted once per line-boil frame.
 */

interface Palette {
  readonly top: string;
  readonly mid: string;
  readonly hor: string;
  readonly tint: string;
  readonly tintAlpha: number;
  readonly vignette: number;
  readonly sun: string;
}

const PALETTES: Readonly<Record<Mood, Palette>> = {
  surprised: { top: '#f0a850', mid: '#f6cf86', hor: '#fce8bc', tint: '#ffb866', tintAlpha: 0.1, vignette: 0.22, sun: '#fff3c8' },
  curious: { top: '#a9cf98', mid: '#d4e3a8', hor: '#f3efc6', tint: '#c8e089', tintAlpha: 0.1, vignette: 0.2, sun: '#fffbd8' },
  dramatic: { top: '#10152e', mid: '#3a2f4e', hor: '#b05a44', tint: '#1b2447', tintAlpha: 0.34, vignette: 0.6, sun: '#ff9a5a' },
  laugh: { top: '#6fc6dc', mid: '#c9e8cf', hor: '#fbe9a2', tint: '#ffe27a', tintAlpha: 0.08, vignette: 0.14, sun: '#fffbe0' },
  sarcastic: { top: '#74598a', mid: '#c48a92', hor: '#f1c698', tint: '#7a5a8e', tintAlpha: 0.16, vignette: 0.3, sun: '#ffe2b8' },
};

/** A palette colour mixed over the five moods by their weights. */
function blend(t: number, pick: (p: Palette) => string): string {
  const w = moodWeights(t);
  let acc = pick(PALETTES.surprised);
  let used = w.surprised;
  for (const m of MOODS.slice(1)) {
    if (w[m] <= 0) continue;
    used += w[m];
    acc = mix(acc, pick(PALETTES[m]), w[m] / used);
  }
  return acc;
}

const blendNum = (t: number, pick: (p: Palette) => number): number => {
  const w = moodWeights(t);
  return MOODS.reduce((s, m) => s + w[m] * pick(PALETTES[m]), 0);
};

/** The horizon in world y: where the plain meets the sky. */
export const HORIZON_Y = -30;

/** The ground, painted once per boil frame: the world region it covers (units) and its pixels per unit. */
const GROUND = { x0: -140, x1: 360, y0: HORIZON_Y, y1: 150, res: 6 } as const;
let grounds: HTMLCanvasElement[] | null = null;

function paintGround(f: number): HTMLCanvasElement {
  const { x0, x1, y0, y1, res } = GROUND;
  const { canvas, ctx } = makeCanvas((x1 - x0) * res, (y1 - y0) * res);
  ctx.scale(res, res);
  ctx.translate(-x0, -y0);
  const d = makeDraw(ctx, 8100, f, 0, LINE);
  const { pen } = d;
  const rng = createRng(8200 + f);
  // The far plain, hazy, then the near ground, dusty and warm.
  const far = ctx.createLinearGradient(0, y0, 0, 0);
  far.addColorStop(0, '#d9cb9e');
  far.addColorStop(1, '#bda573');
  ctx.fillStyle = far;
  ctx.fillRect(x0, y0, x1 - x0, -y0);
  const near = ctx.createLinearGradient(0, 0, 0, y1);
  near.addColorStop(0, '#b0905c');
  near.addColorStop(0.18, '#9c7d4e');
  near.addColorStop(1, '#5e472c');
  ctx.fillStyle = near;
  ctx.fillRect(x0, 0, x1 - x0, y1);
  // A pale band where the ground catches the light at the snake's side, and a dark one far below.
  pen.fill([{ x: x0, y: 0 }, { x: x1, y: 0 }, { x: x1, y: 5 }, { x: x0, y: 5 }], '#e1c88e', 0.25);
  const farShape = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: 0 }, { x: x0, y: 0 }];
  const nearShape = [{ x: x0, y: 0 }, { x: x1, y: 0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  pen.stipple(nearShape, 5200, (_, y) => 0.3 + (y / y1) * 0.5, 0.2, '#4a3520');
  pen.stipple(nearShape, 900, (_, y) => 0.6 - (y / y1) * 0.4, 0.22, '#e9d6a0');
  pen.stipple(farShape, 2600, (_, y) => 0.7 * (1 - (y - y0) / -y0), 0.22, '#8a7348');
  // Dry grass tufts across the plain, small and pale far off, bigger and darker near.
  for (let i = 0; i < 520; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = rng() < 0.7 ? y0 + 4 + rng() * (-y0 - 4) : rng() * y1;
    const size = 0.8 + ((y - y0) / (y1 - y0)) * 3.4;
    const col = rng() < 0.5 ? '#8a6c3a' : '#c0a468';
    for (let b = 0; b < 4; b++) {
      const lean = (rng() - 0.5) * size * 0.9;
      pen.hair([{ x: x + b * 0.25, y }, { x: x + lean * 0.6, y: y - size * 0.6 }, { x: x + lean, y: y - size * (0.8 + rng() * 0.4) }], 0.25 + size * 0.04, col, 0.7);
    }
  }
  // Stones and cracks on the near ground.
  for (let i = 0; i < 70; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = 2 + rng() * (y1 - 4);
    const r = 0.5 + (y / y1) * 2.6 + rng() * 0.8;
    pen.fill(oval(x, y, r * 1.3, r * 0.7, 14), '#7d6a4e', 0.8);
    pen.fill(oval(x - r * 0.2, y - r * 0.15, r * 0.9, r * 0.4, 12), '#c7b38a', 0.55);
    pen.hair([{ x: x - r * 1.2, y: y + r * 0.6 }, { x: x + r * 1.3, y: y + r * 0.62 }], 0.3, LINE, 0.4);
  }
  return canvas;
}

/** The thorn trees on the horizon: place along the plain, height, and how wide the crown. */
const TREES: readonly (readonly [number, number, number])[] = [
  [-70, 15, 17], [-48, 10, 11], [-22, 17, 19], [4, 9, 10], [26, 14, 15], [52, 18, 21], [80, 9, 11], [104, 15, 17], [130, 11, 13], [160, 17, 19],
];

function drawTrees(ctx: CanvasRenderingContext2D, cam: Camera, haze: string): void {
  const par = 0.72;
  const base = CAM_Y + (HORIZON_Y - cam.cy) * cam.k + 2;
  ctx.save();
  for (const [x, h, w] of TREES) {
    const sx = VIDEO.width / 2 + (x - cam.cx * par) * cam.k * 0.55;
    if (sx < -300 || sx > VIDEO.width + 300) continue;
    const u = cam.k * 0.55;
    ctx.fillStyle = mix('#6a5535', haze, 0.45);
    // Trunk and flat crown of a thorn tree.
    ctx.fillRect(sx - u * 0.45, base - h * u * 0.8, u * 0.9, h * u * 0.8);
    ctx.beginPath();
    ctx.ellipse(sx, base - h * u * 0.86, w * u * 0.62, h * u * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx - w * u * 0.2, base - h * u * 0.78, w * u * 0.35, h * u * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Sky, sun, far trees and the ground under the world transform, then (once) the mood's grade. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, t: number, cam: Camera, shake: { x: number; y: number }, boil: number): void {
  const { width: W, height: H } = VIDEO;
  const hy = CAM_Y + (HORIZON_Y - cam.cy) * cam.k + shake.y;
  const sky = ctx.createLinearGradient(0, Math.min(hy - 1100, -200), 0, hy);
  sky.addColorStop(0, blend(t, (p) => p.top));
  sky.addColorStop(0.62, blend(t, (p) => p.mid));
  sky.addColorStop(1, blend(t, (p) => p.hor));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // The sun, low and soft.
  const sunX = W / 2 + (-30 - cam.cx * 0.5) * cam.k * 0.5 + shake.x;
  const sunY = hy - 300 - cam.k * 6;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 420);
  const sc = blend(t, (p) => p.sun);
  sun.addColorStop(0, rgba(sc, 0.95));
  sun.addColorStop(0.1, rgba(sc, 0.75));
  sun.addColorStop(0.4, rgba(sc, 0.22));
  sun.addColorStop(1, rgba(sc, 0));
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, Math.max(H, hy + 100));
  drawTrees(ctx, { ...cam, cx: cam.cx + shake.x / cam.k }, blend(t, (p) => p.hor));
  grounds ??= Array.from({ length: BOIL }, (_, f) => paintGround(f));
  const g = grounds[boil % BOIL]!;
  ctx.save();
  ctx.translate(W / 2 + shake.x, CAM_Y + shake.y);
  ctx.scale(cam.k, cam.k);
  ctx.translate(-cam.cx, -cam.cy);
  ctx.drawImage(g, GROUND.x0, GROUND.y0, GROUND.x1 - GROUND.x0, GROUND.y1 - GROUND.y0);
  ctx.restore();
  // The haze where the plain meets the sky.
  const haze = ctx.createLinearGradient(0, hy - 60, 0, hy + 90);
  haze.addColorStop(0, rgba(blend(t, (p) => p.hor), 0));
  haze.addColorStop(0.5, rgba(blend(t, (p) => p.hor), 0.5));
  haze.addColorStop(1, rgba(blend(t, (p) => p.hor), 0));
  ctx.fillStyle = haze;
  ctx.fillRect(0, hy - 60, W, 150);
}

/** The mood's tint and a vignette over everything. */
export function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const { width: W, height: H } = VIDEO;
  const a = blendNum(t, (p) => p.tintAlpha);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = blend(t, (p) => p.tint);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.45, H * 0.74);
  v.addColorStop(0, 'rgba(4,6,14,0)');
  v.addColorStop(1, `rgba(4,6,14,${blendNum(t, (p) => p.vignette)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The paper-on-dark caption ink is used while the scene is this dark. */
export const isNight = (t: number): boolean => moodWeights(t).dramatic > 0.5;
