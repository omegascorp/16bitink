import { INK } from '../../../../src/art/pen';
import { type Pt, spline } from '../../kraken/whale';
import { path } from '../../seal/art/paint';
import { jawTopAt, LIP, LOWER_TEETH, mouthAt, type Tooth, UPPER_TEETH } from './trexShape';

/**
 * The T. rex's teeth, drawn live (they show only as the jaw opens): thick,
 * banana-shaped, recurved crowns in old ivory, stained toward the root, lit
 * along the front edge. The roots hide under the scaly lips.
 */

/** How deep a root sits under the lip. */
const ROOT = 4;

/** A tooth's outline: `dir` 1 hangs down from `rootY`, -1 stands up from it; the tip curves back (toward -x). */
const widthOf = (t: Tooth): number => Math.min(6, 0.4 * t.len + 0.9);

function outline(t: Tooth, rootY: number, dir: 1 | -1): Pt[] {
  const w = widthOf(t);
  const L = t.len;
  const [c, s] = [Math.cos(t.lean ?? 0), Math.sin(t.lean ?? 0)];
  const at = (u: number, v: number): Pt => ({ x: t.x + u * c - v * s, y: rootY + dir * (v * c + u * s * 0.3) });
  return spline([
    at(w * 0.5, 0), at(w * 0.52, L * 0.42), at(w * 0.24, L * 0.8), at(-w * 0.3, L),
    at(-w * 0.44, L * 0.76), at(-w * 0.52, L * 0.38), at(-w * 0.5, 0),
  ], 4);
}

function paintTooth(ctx: CanvasRenderingContext2D, t: Tooth, rootY: number, dir: 1 | -1, lw: number): void {
  const shape = outline(t, rootY, dir);
  const w = widthOf(t);
  ctx.save();
  path(ctx, shape);
  const across = ctx.createLinearGradient(t.x + w * 0.5, 0, t.x - w * 0.5, 0);
  across.addColorStop(0, '#f6eed6');
  across.addColorStop(0.45, '#e6d9b4');
  across.addColorStop(1, '#a8935f');
  ctx.fillStyle = across;
  ctx.fill();
  ctx.clip();
  const along = ctx.createLinearGradient(0, rootY, 0, rootY + dir * t.len);
  along.addColorStop(0, 'rgba(120,92,44,0.75)');
  along.addColorStop(0.45, 'rgba(150,120,70,0.25)');
  along.addColorStop(0.8, 'rgba(255,250,235,0)');
  along.addColorStop(1, 'rgba(255,250,235,0.35)');
  ctx.fillStyle = along;
  ctx.fillRect(t.x - w, Math.min(rootY, rootY + dir * t.len) - 1, 2 * w, t.len + 2);
  // The light down the front edge.
  ctx.strokeStyle = 'rgba(255,253,244,0.8)';
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.moveTo(t.x + w * 0.34, rootY + dir * t.len * 0.3);
  ctx.quadraticCurveTo(t.x + w * 0.36, rootY + dir * t.len * 0.7, t.x - w * 0.05, rootY + dir * t.len * 0.92);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 0.9 * lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Upper teeth, hanging from under the upper lip. */
export function drawUpperTeeth(ctx: CanvasRenderingContext2D, lw: number): void {
  for (const t of UPPER_TEETH) paintTooth(ctx, t, mouthAt(t.x) - ROOT, 1, lw);
}

/** Lower teeth, standing up from under the lower lip, in the shut jaw's own place (turn the context with the jaw first). */
export function drawLowerTeeth(ctx: CanvasRenderingContext2D, lw: number): void {
  for (const t of LOWER_TEETH) paintTooth(ctx, t, jawTopAt(t.x) + 1.2 + ROOT, -1, lw);
}

/** The shadow the upper lip throws on the teeth just under it. */
export function drawLipShadow(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(20,8,4,0.32)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  LIP.filter((p) => p.x < 35).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 0.9) : ctx.moveTo(p.x, p.y + 0.9)));
  ctx.stroke();
  ctx.restore();
}
