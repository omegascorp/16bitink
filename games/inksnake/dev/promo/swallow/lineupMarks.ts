import { clamp01, smooth } from '../short';
import type { Pt } from '../sprites';
import { GOLD, write } from './hud';
import type { View } from './swallower';

/**
 * The line-up's ground (dry grass painted in world space, so it never
 * tiles), its ruler in feet, the crown and the #1 rosette.
 */

export interface LineView extends View {
  readonly x: number;
  readonly y: number;
}

const hash = (i: number, j: number, k: number): number => {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** The ground: plain dry grass, painted in world space (soft washes, then tufts), so it never tiles. */
export function drawGround(ctx: CanvasRenderingContext2D, v: LineView): void {
  ctx.fillStyle = '#d8c79a';
  ctx.fillRect(0, 0, 1920, 1080);
  const left = v.x - 960 / v.zoom;
  const right = v.x + 960 / v.zoom;
  const top = v.y - 540 / v.zoom;
  const bottom = v.y + 540 / v.zoom;
  const wash = 260;
  for (let i = Math.floor(left / wash) - 1; i <= right / wash + 1; i++) {
    for (let j = Math.floor(top / wash) - 1; j <= bottom / wash + 1; j++) {
      const c = v.at({ x: (i + hash(i, j, 1)) * wash, y: (j + hash(i, j, 2)) * wash });
      const r = wash * (0.6 + hash(i, j, 3)) * v.zoom;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      g.addColorStop(0, hash(i, j, 4) > 0.5 ? 'rgba(160,140,80,0.22)' : 'rgba(240,226,180,0.3)');
      g.addColorStop(1, 'rgba(216,199,154,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    }
  }
  const cell = Math.max(12, 18 / Math.min(1, v.zoom));
  ctx.strokeStyle = '#8f7a48';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, Math.min(3, v.zoom * 0.35));
  ctx.beginPath();
  for (let i = Math.floor(left / cell); i <= right / cell; i++) {
    for (let j = Math.floor(top / cell); j <= bottom / cell; j++) {
      if (hash(i, j, 5) < 0.45) continue;
      const c = v.at({ x: (i + hash(i, j, 6)) * cell, y: (j + hash(i, j, 7)) * cell });
      const h = Math.max(3, Math.min(14, 4 * v.zoom)) * (0.6 + hash(i, j, 8));
      for (const k of [-1, 0, 1]) {
        ctx.moveTo(c.x + k * h * 0.15, c.y);
        ctx.lineTo(c.x + k * h * 0.5, c.y - h);
      }
    }
  }
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The ruler along the bottom: 0–16 ft, a tick every 6 in, a label every foot (metres under). */
export function drawRuler(ctx: CanvasRenderingContext2D, v: LineView, y: number, alpha: number): void {
  const ft = 30.48;
  const sy = v.at({ x: 0, y }).y;
  if (alpha <= 0 || sy > 1070) return;
  const x0 = v.at({ x: 0, y }).x;
  const x1 = v.at({ x: 16 * ft, y }).x;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(245,240,225,0.75)';
  ctx.fillRect(x0 - 20, sy - 8, x1 - x0 + 40, 26);
  ctx.strokeStyle = '#2b2418';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 - 20, sy - 8, x1 - x0 + 40, 26);
  ctx.beginPath();
  for (let h = 0; h <= 32; h++) {
    const x = v.at({ x: (h / 2) * ft, y }).x;
    ctx.moveTo(x, sy - 8);
    ctx.lineTo(x, sy + (h % 2 ? 2 : 12));
  }
  ctx.stroke();
  ctx.restore();
  const every = v.zoom * ft < 60 ? 2 : 1;
  for (let f = 0; f <= 16; f += every) {
    const x = v.at({ x: f * ft, y }).x;
    if (x < 30 || x > 1890) continue;
    write(ctx, `${f} ft`, x, sy + 56, 38, { alpha });
    write(ctx, `${(f * 0.3048).toFixed(1)} m`, x, sy + 88, 28, { alpha: alpha * 0.85, weight: 500 });
  }
}

/** A gold crown over a lump (the rock python, until "not even close" knocks it off). */
export function drawCrown(ctx: CanvasRenderingContext2D, at: Pt, size: number, fall: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(at.x + fall * 260, at.y - size * 1.4 + fall * fall * 900 - fall * 300);
  ctx.rotate(fall * 4);
  ctx.beginPath();
  const w = size;
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -w * 0.55);
  ctx.lineTo(-w / 4, -w * 0.25);
  ctx.lineTo(0, -w * 0.7);
  ctx.lineTo(w / 4, -w * 0.25);
  ctx.lineTo(w / 2, -w * 0.55);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#3a2a10';
  ctx.stroke();
  ctx.restore();
}

/** The gold "#1" rosette. */
export function drawRosette(ctx: CanvasRenderingContext2D, at: Pt, r: number, u: number): void {
  if (u <= 0) return;
  const k = smooth(u) * (1 + 0.25 * Math.sin(Math.min(1, u) * Math.PI));
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.fillStyle = '#b3322b';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.2, r * 0.5);
    ctx.lineTo(sx * r * 0.65, r * 1.9);
    ctx.lineTo(sx * r * 0.35, r * 1.65);
    ctx.lineTo(sx * r * 0.05, r * 1.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rr = r * (i % 2 ? 0.88 : 1);
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  write(ctx, '#1', at.x, at.y + r * 0.3 * k, r * 0.95 * k, { fill: '#3a2a10', halo: GOLD, alpha: clamp01(u * 2) });
}
