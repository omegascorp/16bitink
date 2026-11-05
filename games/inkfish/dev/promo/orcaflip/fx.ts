import { blob, hash } from '../alvin/art/draw';

/** Water effects shared by the scenes: the burst of bubbles and sand-coloured swirl at a hit, light rays. */

/** How far the forward fan reaches, against the tail-ward one: the bubbles stay off the shark's head. */
const HEAD_SIDE = 0.6;

export interface BurstStyle {
  readonly size?: number;
  /** Fans the bubbles out both ways along this angle (along the shark's side), the forward half short of the head, instead of all round. */
  readonly axis?: number;
  /** Keeps the middle clear: no bubble within this many px of the contact, so it stays in view. */
  readonly hole?: number;
  /** How much stirred-up sand there is, 0 to 1. */
  readonly sand?: number;
}

/** An impact `age` seconds ago at x, y: a spray of bubbles and a swirl of sand. Clean: no more than that. */
export function burst(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, seed: number, style: BurstStyle = {}): void {
  if (age <= 0 || age > 2.6) return;
  const { size = 1, axis, hole = 0, sand = 1 } = style;
  const fade = Math.exp(-age * 1.35);
  ctx.save();
  // The swirl: the sand the hit stirs up, three drifting washes.
  for (let i = 0; i < 3 && sand > 0; i++) {
    const a = hash(seed + i * 3) * 6.28 + age * (i % 2 ? 0.9 : -0.7);
    const r = size * (70 + 210 * (1 - Math.exp(-age * 2.2)));
    blob(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.4, r * 0.9, r * 0.55, a, '214,188,138', 0.3 * sand * fade);
  }
  // The bubbles: thrown out, then rising.
  for (let i = 0; i < 44; i++) {
    const a = axis === undefined ? hash(seed + i * 1.37) * Math.PI * 2 : axis + (i % 2 ? Math.PI : 0) + (hash(seed + i * 1.37) - 0.5) * 2.2;
    const out = size * (90 + 380 * hash(seed + i * 2.11 + 4)) * (1 - Math.exp(-age * 4.5));
    const reach = (hole * (0.9 + 1.2 * hash(seed + i * 4.3)) + out) * (axis !== undefined && i % 2 === 0 ? HEAD_SIDE : 1);
    const rad = size * (6 + 30 * hash(seed + i * 3.7 + 9)) * (0.7 + 0.5 * Math.min(1, age));
    const bx = x + Math.cos(a) * reach;
    const by = y + Math.sin(a) * reach - 90 * age ** 1.3 * (0.4 + hash(seed + i));
    ctx.globalAlpha = Math.min(1, fade * 1.3);
    ctx.fillStyle = 'rgba(210,240,252,0.2)';
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,252,255,0.85)';
    ctx.lineWidth = Math.max(2, rad * 0.16);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(bx - rad * 0.3, by - rad * 0.3, rad * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Wide soft rays slanting down from the surface. */
export function rays(ctx: CanvasRenderingContext2D, alpha: number, t: number, count = 6): void {
  if (alpha <= 0.01) return;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = -80 + i * (1240 / count) + 40 * Math.sin(t * 0.3 + i * 1.9);
    const w = 90 + 130 * hash(i + 11);
    const g = ctx.createLinearGradient(x, -100, x - 360, 1500);
    g.addColorStop(0, `rgba(200,240,252,${0.34 * alpha})`);
    g.addColorStop(1, 'rgba(200,240,252,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, -100);
    ctx.lineTo(x + w * 0.5, -100);
    ctx.lineTo(x - 360 + w * 1.4, 1500);
    ctx.lineTo(x - 360 - w * 0.4, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
