import { HIGHLIGHT, INK, PAPER, RED } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01 } from '../short';

/**
 * The sketchbook marks drawn over the scenes: labels with leader lines, the
 * game's highlighter glow on whatever the narrator is pointing at, bursts of
 * spikes, the ZAP's bolts and the crab's yelp. Plain canvas strokes in the
 * ballpoint ink, round-capped like the other shorts' callouts.
 */

/** A label in ink handwriting, with leader lines to what it names. */
export function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: readonly Pt[], alpha: number, size = 64): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const p of to) {
    const from = { x: at.x, y: p.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 12, from.y + (dy / len) * 12);
    ctx.lineTo(p.x - (dx / len) * 12, p.y - (dy / len) * 12);
    ctx.stroke();
  }
  ctx.restore();
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha);
}

/** A soft highlighter glow behind something, as the game marks what the crab can use. */
export function glowBehind(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number, color = HIGHLIGHT): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(243,224,74,0)');
  ctx.globalAlpha = 0.7 * clamp01(alpha);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Short strokes flying out round a point: a snap, a pop, a puff of ink. */
export function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, len: number, alpha: number, n: number, color = INK): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
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

const BOLT = '#ffe45c';

/**
 * An electric zigzag from a to b: bright yellow on a dark ink edge, its
 * kinks set by `seed` (change it each boil frame and the bolt crackles).
 */
export function drawBolt(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, seed: number, width: number, alpha: number): void {
  if (alpha <= 0) return;
  const n = 7;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Pt[] = [a];
  for (let i = 1; i < n; i++) {
    const k = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const off = (k - Math.floor(k) - 0.5) * len * 0.28;
    pts.push({ x: a.x + (dx * i) / n + nx * off, y: a.y + (dy * i) / n + ny * off });
  }
  pts.push(b);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  for (const [color, w] of [[INK, width * 1.9], [BOLT, width], ['#fffbe6', width * 0.35]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** A burst of electric bolts out of a point, for a sting. */
export function drawZapBurst(ctx: CanvasRenderingContext2D, c: Pt, r: number, seed: number, alpha: number, n = 6): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed * 0.7;
    drawBolt(ctx, { x: c.x + Math.cos(a) * r * 0.25, y: c.y + Math.sin(a) * r * 0.25 }, { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }, seed + i, Math.max(2.5, r * 0.06), alpha);
  }
}

/** The crab's yelp: a red "!" popping up, tilted, on a paper halo. */
export function drawYelp(ctx: CanvasRenderingContext2D, x: number, y: number, u: number): void {
  if (u <= 0) return;
  const pop = 0.6 + 0.4 * clamp01(u * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.15);
  ctx.scale(pop, pop);
  ctx.font = `700 150px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = clamp01(u);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 24;
  ctx.strokeText('!', 0, 0);
  ctx.fillStyle = RED;
  ctx.fillText('!', 0, 0);
  ctx.restore();
}

/** A curved arrow from a to b bowing out by `bend` px, its head at b. */
export function drawArrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, bend: number, alpha: number, color = INK): void {
  if (alpha <= 0) return;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const c = { x: mx + (-(b.y - a.y) / len) * bend, y: my + ((b.x - a.x) / len) * bend };
  const ang = Math.atan2(b.y - c.y, b.x - c.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  ctx.moveTo(b.x + Math.cos(ang + 2.6) * 30, b.y + Math.sin(ang + 2.6) * 30);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b.x + Math.cos(ang - 2.6) * 30, b.y + Math.sin(ang - 2.6) * 30);
  ctx.stroke();
  ctx.restore();
}

/** A full-frame wash: a mood's light laid over a scene (`alpha` 0 .. 1). */
export function wash(ctx: CanvasRenderingContext2D, color: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Dark corners, for suspense and the eerie beat. */
export function vignette(ctx: CanvasRenderingContext2D, alpha: number, color = '18,22,52'): void {
  if (alpha <= 0) return;
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.22, w / 2, h * 0.45, h * 0.62);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${alpha})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
