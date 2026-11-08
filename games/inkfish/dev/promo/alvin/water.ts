import { blob, hash } from './art/draw';
import { VIDEO } from '../short';

/** Water, light shafts and drifting specks: the backdrops the scenes share. */

export function waterGradient(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Daylight from above as painted depth: a glow, then wide soft pools of light leaning down, no edges to them. */
export function shafts(ctx: CanvasRenderingContext2D, alpha: number, t: number): void {
  if (alpha <= 0.01) return;
  blob(ctx, 620, -60, 1000, 720, 0, '190,236,250', 0.55 * alpha);
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 230 + 34 * Math.sin(t * 0.4 + i * 1.7);
    const w = 150 + 120 * hash(i + 3);
    blob(ctx, x - 150, 660, w, 900, 0.3, '200,240,252', 0.12 * alpha);
  }
}

/** Big dark washes low in the water, so the depth reads as paint rather than a flat gradient. */
export function depths(ctx: CanvasRenderingContext2D, rgb: string, alpha: number): void {
  for (let i = 0; i < 6; i++) blob(ctx, hash(i + 21) * 1080, 900 + hash(i + 31) * 900, 420 + hash(i + 41) * 340, 220 + hash(i + 51) * 200, (hash(i + 61) - 0.5) * 0.6, rgb, alpha);
}

/** The sea floor far below the sub, silt in the last of the light: it stops the bottom of the frame being empty. */
export function seabed(ctx: CanvasRenderingContext2D, top: number, rgb: string, alpha: number): void {
  ctx.save();
  ctx.fillStyle = `rgba(${rgb},${alpha})`;
  ctx.beginPath();
  ctx.moveTo(-10, top + 120);
  ctx.bezierCurveTo(240, top - 30, 470, top + 90, 700, top + 30);
  ctx.bezierCurveTo(860, top - 10, 980, top + 40, 1090, top + 10);
  ctx.lineTo(1090, VIDEO.height + 10);
  ctx.lineTo(-10, VIDEO.height + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 12; i++) blob(ctx, hash(i + 71) * 1080, top + 70 + hash(i + 81) * 240, 130 + hash(i + 91) * 160, 22 + hash(i + 3) * 26, 0.05, i % 2 ? '86,120,140' : '4,18,34', 0.3);
  blob(ctx, 560, top + 10, 620, 120, 0, '150,190,205', 0.22);
}

/** Specks drifting `vy` px a second (negative: up), wrapping round the screen. */
export function specks(ctx: CanvasRenderingContext2D, t: number, count: number, vy: number, alpha: number, size = 3.2): void {
  ctx.save();
  ctx.fillStyle = `rgba(225,240,250,${alpha})`;
  for (let i = 0; i < count; i++) {
    const x = (hash(i * 1.7) * VIDEO.width + 14 * Math.sin(t * 0.7 + i)) % VIDEO.width;
    const y = (((hash(i * 2.9 + 1) * VIDEO.height + vy * t * (0.6 + hash(i + 8) * 0.8)) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.5 + hash(i + 5)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Darkens the corners, to hold the eye in the middle. */
export function vignette(ctx: CanvasRenderingContext2D, alpha: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, VIDEO.height / 2, 380, VIDEO.width / 2, VIDEO.height / 2, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,6,16,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Blends two #rrggbb colours. */
export function tint(a: string, b: string, u: number): string {
  const [pa, pb] = [a, b].map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  return `rgb(${[0, 1, 2].map((i) => Math.round(pa![i]! + (pb![i]! - pa![i]!) * u)).join(',')})`;
}
