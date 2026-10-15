import { HIGHLIGHT, INK, PAPER, PAPER_FILL, RED } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, lerp, smooth } from '../short';

/**
 * The sketchbook marks drawn over the scene: labels with leader lines, rings,
 * the scale's dial, the tape measure, bursts of spikes and the rewind sign.
 * Plain canvas strokes in the ballpoint ink, round-capped like the InkFish
 * shorts' callouts.
 */

/** A label in ink handwriting, with a leader line to what it names. */
export function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64, weight: 500 | 700 = 700): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
    ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
    ctx.stroke();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, weight, alpha);
}

/** Words on one centred line, each part fading in on its own (e.g. "biggest crab" then "on land"). */
export function drawLabelParts(ctx: CanvasRenderingContext2D, parts: readonly (readonly [string, number])[], x: number, y: number, size: number): void {
  if (parts.every(([, a]) => a <= 0)) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const widths = parts.map(([s]) => ctx.measureText(s).width);
  ctx.restore();
  let left = x - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach(([text, alpha], i) => {
    drawTextLine(ctx, text, left + widths[i]! / 2, y, size, 700, alpha);
    left += widths[i]!;
  });
}

/** A dashed ring round something, drawn on as `u` goes 0 .. 1 (and faded by it). */
export function drawDashedRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number, color: string): void {
  if (u <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp01(u * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * smooth(clamp01(u * 1.6)));
  ctx.stroke();
  ctx.restore();
}

/** Short strokes flying out round a point: a snap, a crack, a puff of ink. */
export function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, len: number, alpha: number, n: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len));
    ctx.stroke();
  }
  ctx.restore();
}

/** The scale's dial, 0–5 kg, its red needle at `kg`, with a dashed leader down to the scale. */
export function drawDial(ctx: CanvasRenderingContext2D, c: Pt, r: number, kg: number, show: number, to: Pt): void {
  if (show <= 0) return;
  const e = smooth(show);
  const angleOf = (v: number): number => Math.PI * (0.8 + (1.4 * v) / 5);
  ctx.save();
  ctx.globalAlpha = clamp01(show * 2);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(c.x - r * 0.5, c.y + r * 0.9);
  ctx.lineTo(lerp(c.x - r * 0.5, to.x, e), lerp(c.y + r * 0.9, to.y, e));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(c.x, c.y);
  ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.stroke();
  for (let v = 0; v <= 5; v += 0.5) {
    const a = angleOf(v);
    const inner = v % 1 === 0 ? r * 0.74 : r * 0.82;
    ctx.lineWidth = v % 1 === 0 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
    if (v % 1 === 0) drawTextLine(ctx, String(v), Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55 + 14, 40, 700);
  }
  drawTextLine(ctx, 'kg', 0, r * 0.62, 40, 700);
  const a = angleOf(kg);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-Math.cos(a) * r * 0.12, -Math.sin(a) * r * 0.12);
  ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A tape measure pulled across from x0 to x1 at height y as `u` goes 0 .. 1, with dashed drops to the feet at `footY`. */
export function drawTape(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, footY: number, u: number): void {
  if (u <= 0) return;
  const x = lerp(x0, x1, smooth(u));
  ctx.save();
  ctx.globalAlpha = clamp01(u * 4);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x0, y + 14);
  ctx.lineTo(x0, footY);
  if (u > 0.98) {
    ctx.moveTo(x1, y + 14);
    ctx.lineTo(x1, footY);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = HIGHLIGHT;
  ctx.fillRect(x0, y - 14, x - x0, 28);
  ctx.lineWidth = 4;
  ctx.strokeRect(x0, y - 14, x - x0, 28);
  ctx.lineWidth = 2.5;
  for (let k = x0 + 20; k < x; k += 20) {
    ctx.beginPath();
    ctx.moveTo(k, y - 14);
    ctx.lineTo(k, y - ((k - x0) % 100 < 1 ? 0 : 6));
    ctx.stroke();
  }
  ctx.restore();
}

/** The rewind sign: two back-pointing triangles, pulsing, with a paper halo. */
export function drawRewind(ctx: CanvasRenderingContext2D, x: number, y: number, show: number, t: number): void {
  if (show <= 0) return;
  const pulse = 1 + 0.06 * Math.sin(t * 2 * Math.PI * 3);
  ctx.save();
  ctx.globalAlpha = show;
  ctx.translate(x, y);
  ctx.scale(pulse * (0.7 + 0.3 * smooth(show)), pulse * (0.7 + 0.3 * smooth(show)));
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const dx of [0, 95]) {
    ctx.moveTo(-95 + dx, 0);
    ctx.lineTo(0 + dx, -62);
    ctx.lineTo(0 + dx, 62);
    ctx.closePath();
  }
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

/**
 * A magnifier: grown out of `spot` (a ring of radius `r0` round it) to its
 * place, showing what `inside` draws round the spot, `zoom` times bigger.
 */
export function drawLens(
  ctx: CanvasRenderingContext2D, lens: { readonly x: number; readonly y: number; readonly r: number; readonly zoom: number }, spot: Pt, r0: number, open: number, inside: () => void,
): void {
  if (open <= 0) return;
  const e = smooth(open);
  const c = { x: lerp(spot.x, lens.x, e), y: lerp(spot.y, lens.y, e) };
  const r = lerp(r0, lens.r, e);
  const z = lerp(1, lens.zoom, e);
  ctx.save();
  ctx.globalAlpha = clamp01(open * 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([14, 10]);
  const d = Math.hypot(c.x - spot.x, c.y - spot.y) || 1;
  const px = -(c.y - spot.y) / d;
  const py = (c.x - spot.x) / d;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(spot.x + px * r0 * s, spot.y + py * r0 * s);
    ctx.lineTo(c.x + px * r * s, c.y + py * r * s);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(c.x, c.y);
  ctx.scale(z, z);
  ctx.translate(-spot.x, -spot.y);
  inside();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}
