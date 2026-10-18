import type { Rng } from '../logic/rng';
import { rgba } from './paint';
import { INK } from './palette';

/**
 * The brushwork the ore glyphs share (oreArt.ts, talusOres.ts): plain
 * canvas paths, not the Pen, since a chunk of ground may hold dozens of
 * glyphs. Drawn centred on the origin.
 */
export type P = readonly [number, number];

export function poly(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Highlighter fill modelled like a stone (lit on the upper left, shaded on the lower right), then a pen outline. */
export function inked(ctx: CanvasRenderingContext2D, pts: readonly P[], color: string, width = 1.1): void {
  poly(ctx, pts);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = color;
  ctx.fill();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, 'rgba(255, 252, 235, 0.6)');
  g.addColorStop(0.35, 'rgba(255, 252, 235, 0)');
  g.addColorStop(0.7, 'rgba(60, 30, 40, 0.12)');
  g.addColorStop(1, 'rgba(40, 24, 60, 0.38)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export const TAU = Math.PI * 2;

export function disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry = rx): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}

/** A soft radial dab of colour, fading out from its middle. */
export function dab(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/** Runs `draw` clipped to a closed outline. */
export function inside(ctx: CanvasRenderingContext2D, pts: readonly P[], draw: () => void): void {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  draw();
  ctx.restore();
}

export function line(ctx: CanvasRenderingContext2D, pts: readonly P[], color: string, width: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A lumpy outline: a circle of florets, each bulging out between cusps, as a cauliflower or a botryoidal crust. */
export function lumpy(cx: number, cy: number, s: number, lobes: number, rng: Rng, squash = 0.86): P[] {
  const amps = Array.from({ length: lobes }, () => 0.6 + rng() * 0.6);
  const per = 5;
  const turn = rng() * TAU;
  return Array.from({ length: lobes * per }, (_, i) => {
    const a = (i / (lobes * per)) * TAU + turn;
    const q = s * (0.84 + 0.16 * Math.sin(((i % per) / per) * Math.PI) * amps[Math.floor(i / per)]!);
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q * squash];
  });
}

/** A soft shadow where a rounded thing rests on the rock. */
export function restShadow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.4);
  dab(ctx, 0, 0, s, '#1a1626', 0.35);
  ctx.restore();
}
