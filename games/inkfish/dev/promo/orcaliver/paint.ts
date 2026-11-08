import { makeCanvas, type Pt } from '../../../src/art/pen';
import { VIDEO } from '../short';
import type { BodyPose } from './pose';

/** Shared painting helpers: a spare canvas, hazed or tinted animals, and drawing in an animal's own frame. */

type Spare = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
const spares = new Map<string, Spare>();

/** A full-frame spare canvas by name, cleared, with no transform. */
export function spare(name: string): Spare {
  let s = spares.get(name);
  if (!s) {
    s = makeCanvas(VIDEO.width, VIDEO.height);
    spares.set(name, s);
  }
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.globalAlpha = 1;
  s.ctx.filter = 'none';
  s.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
  return s;
}

/** Paints into a spare canvas, lays `colour` over it at `amount` (distance haze, a silhouette, a tint), and draws it in. */
export function tinted(ctx: CanvasRenderingContext2D, paint: (c: CanvasRenderingContext2D) => void, colour: string, amount: number, alpha = 1): void {
  if (alpha <= 0.005) return;
  const s = spare('tinted');
  paint(s.ctx);
  if (amount > 0) {
    s.ctx.globalCompositeOperation = 'source-atop';
    s.ctx.globalAlpha = amount;
    s.ctx.fillStyle = colour;
    s.ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, 0, 0);
  ctx.restore();
}

/** Runs `draw` in the animal's local frame (1000 px snout to tail, snout at 0 facing +x), as the painted art lays itself out. */
export function inBody(ctx: CanvasRenderingContext2D, p: BodyPose, draw: () => void): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (p.flip) ctx.scale(1, -1);
  ctx.scale(p.length / 1000, p.length / 1000);
  ctx.translate(500, 0);
  draw();
  ctx.restore();
}

/** A closed path through points. */
export function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** Rising bubbles: `n` of them from (x, y), spread `spread` px, risen `rise` px, 0 .. 1 `alpha`. */
export function drawBubbles(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, spread: number, rise: number, alpha: number, seed = 1): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    const a = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const f = a - Math.floor(a);
    const g = (Math.sin(seed * 3.1 + i * 9.7) + 1) / 2;
    const r = 6 + 16 * g;
    const bx = x + (f - 0.5) * spread + 10 * Math.sin(rise / 40 + i);
    const by = y - rise * (0.5 + f) - i * 6;
    ctx.globalAlpha = alpha * (0.5 + 0.5 * g);
    ctx.strokeStyle = 'rgba(235,248,255,0.9)';
    ctx.fillStyle = 'rgba(220,240,255,0.18)';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(bx - r * 0.35, by - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Speed lines streaking behind a mover along `angle` (the way it's heading), 0 .. 1 `amount`. */
export function drawSpeedLines(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, amount: number, spread = 300, len = 420): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(230,240,255,0.55)';
  for (let i = 0; i < 9; i++) {
    const off = ((i * 0.618) % 1 - 0.5) * spread;
    const l = len * (0.5 + ((i * 0.37) % 1) * 0.6) * amount;
    ctx.globalAlpha = amount * (0.4 + 0.5 * ((i * 0.29) % 1));
    ctx.lineWidth = 3 + (i % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(-60 - (i % 4) * 40, off);
    ctx.lineTo(-60 - (i % 4) * 40 - l, off);
    ctx.stroke();
  }
  ctx.restore();
}
