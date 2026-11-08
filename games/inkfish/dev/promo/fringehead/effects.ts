import { CAPTION_FONT } from '../captions';
import { createRng } from '../../../src/logic/rng';
import { INK } from '../../../src/art/pen';
import { CHALK, SPOKEN, INK_BG } from './scene';
import type { Pt } from './story';

/**
 * The comic marks over the action, in chalk and yellow: the impact burst when
 * two mouths slam, the trace along the folded jaw and the head's outline, the
 * loser's deflating puffs, the winner's smug sparkles, the gag's "?" and its
 * boing, the bottle's glint, the fish's dash lines and burst bubbles.
 */

/** The slam: wedges and a ring bursting from `at`, `size` px across, `age` seconds old. */
export function drawBurst(ctx: CanvasRenderingContext2D, at: Pt, size: number, age: number, life = 0.45): void {
  if (age < 0 || age > life) return;
  const u = age / life;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.globalAlpha = u < 0.5 ? 1 : (1 - u) / 0.5;
  // Wedges: up and down mostly (the rims meet on a vertical seam), yellow and chalk.
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.1;
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const stretch = 0.6 + 0.6 * Math.abs(d.y);
    const r0 = size * (0.18 + 0.2 * grow) * stretch;
    const r1 = size * (0.32 + 0.3 * grow) * stretch * (k % 2 ? 0.75 : 1);
    const w = size * 0.022 * (1 - u * 0.6);
    const pt = (r: number, side: number): [number, number] => [at.x + d.x * r - d.y * side, at.y + d.y * r + d.x * side];
    ctx.fillStyle = k % 3 === 0 ? SPOKEN : CHALK;
    ctx.beginPath();
    ctx.moveTo(...pt(r0, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * 0.35, w));
    ctx.lineTo(...pt(r1, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * 0.35, -w));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A dashed chalk line through points (screen px), `drawn` 0 .. 1 of its length. */
export function drawDashed(ctx: CanvasRenderingContext2D, pts: readonly Pt[], drawn: number, colour: string, width: number, closed = false): void {
  if (drawn <= 0 || pts.length < 2) return;
  const path = closed ? [...pts, pts[0]!] : [...pts];
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  const total = lengths.reduce((s, l) => s + l, 0);
  let left = total * Math.min(1, drawn);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash([width * 3.2, width * 2.4]);
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length && left > 0; i++) {
    const l = lengths[i - 1]!;
    const f = Math.min(1, left / l);
    const a = path[i - 1]!;
    const b = path[i]!;
    ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    left -= l;
  }
  ctx.stroke();
  ctx.restore();
}

/** A glowing yellow trace along points, drawn 0 .. 1 of the way. */
export function drawTrace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], drawn: number, width: number): void {
  if (drawn <= 0) return;
  const n = Math.max(2, Math.round(pts.length * Math.min(1, drawn)));
  const part = pts.slice(0, n);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(245,200,74,0.9)';
  ctx.shadowBlur = width * 2;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = width;
  ctx.beginPath();
  part.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  // An arrowhead at the moving end.
  const a = part[part.length - 2]!;
  const b = part[part.length - 1]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.fillStyle = SPOKEN;
  ctx.beginPath();
  ctx.moveTo(b.x + Math.cos(ang) * width * 2.6, b.y + Math.sin(ang) * width * 2.6);
  ctx.lineTo(b.x + Math.cos(ang + 2.4) * width * 2.2, b.y + Math.sin(ang + 2.4) * width * 2.2);
  ctx.lineTo(b.x + Math.cos(ang - 2.4) * width * 2.2, b.y + Math.sin(ang - 2.4) * width * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Little puffs of air out of a deflating mouth at `at`, heading `dir` (1 right, -1 left), `age` seconds in. */
export function drawPuffs(ctx: CanvasRenderingContext2D, at: Pt, dir: number, age: number): void {
  if (age < 0 || age > 0.8) return;
  const u = age / 0.8;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1 - u;
  for (let k = 0; k < 3; k++) {
    const d = 30 + 90 * u + k * 22;
    const y = at.y + (k - 1) * 26 * (0.6 + u);
    ctx.lineWidth = 6 * (1 - u * 0.5);
    ctx.beginPath();
    ctx.arc(at.x + dir * d, y, 12 + 8 * u, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.2 : Math.PI + 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A four-pointed sparkle. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.22 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** The winner's smug sparkles round `at` (screen px), `alpha` 0 .. 1, twinkling with `t`. */
export function drawSmug(ctx: CanvasRenderingContext2D, at: Pt, size: number, alpha: number, t: number): void {
  if (alpha <= 0) return;
  ctx.save();
  const spots = [{ x: -0.9, y: -0.75, r: 0.2 }, { x: 0.5, y: -1.05, r: 0.15 }, { x: 1.05, y: -0.35, r: 0.12 }, { x: -0.3, y: -1.25, r: 0.1 }];
  spots.forEach((s, i) => {
    const tw = 0.7 + 0.3 * Math.sin(t * 9 + i * 2);
    ctx.globalAlpha = alpha * tw;
    sparkle(ctx, at.x + s.x * size, at.y + s.y * size, s.r * size * tw * Math.min(1, alpha * 1.5), i % 2 ? CHALK : SPOKEN);
  });
  ctx.restore();
}

/** A hand-lettered mark ("?", "!") popping in at `at`. */
export function drawMark(ctx: CanvasRenderingContext2D, text: string, at: Pt, size: number, pop: number, colour = INK, halo = '#f4eddc'): void {
  if (pop <= 0) return;
  const k = pop < 1 ? 0.6 + 0.6 * pop - 0.2 * pop * pop : 1;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.rotate(0.12);
  ctx.globalAlpha = Math.min(1, pop * 2);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = halo;
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = colour;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The bonk: short radiating strokes and a springy squiggle above, `age` seconds old. */
export function drawBoing(ctx: CanvasRenderingContext2D, at: Pt, age: number): void {
  if (age < 0 || age > 0.6) return;
  const u = age / 0.6;
  ctx.save();
  ctx.globalAlpha = 1 - u * u;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const r0 = 175 + 50 * u;
    const r1 = r0 + 46 * (1 - u * 0.5);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  // The spring.
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    const x = at.x + 26 * Math.sin(f * Math.PI * 8) * (1 - f * 0.4);
    const y = at.y - 200 - f * 120 * (0.6 + 0.4 * Math.sin(age * 30));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A sparkle of light on glass. */
export function drawGlint(ctx: CanvasRenderingContext2D, at: Pt, alpha: number, t: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  sparkle(ctx, at.x, at.y, 46 * (0.8 + 0.2 * Math.sin(t * 20)), '#fffbe8');
  sparkle(ctx, at.x + 60, at.y + 30, 20, '#fffbe8');
  ctx.restore();
}

/** Speed lines trailing a dash, from `from` to `to` (screen px). */
export function drawDash(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number): void {
  if (alpha <= 0) return;
  const d = { x: to.x - from.x, y: to.y - from.y };
  const len = Math.hypot(d.x, d.y) || 1;
  const n = { x: -d.y / len, y: d.x / len };
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 5;
  for (const [off, k] of [[-34, 0.7], [0, 1], [34, 0.8], [62, 0.5]] as const) {
    ctx.beginPath();
    ctx.moveTo(from.x + n.x * off, from.y + n.y * off);
    ctx.lineTo(from.x + n.x * off + d.x * k, from.y + n.y * off + d.y * k);
    ctx.stroke();
  }
  ctx.restore();
}

const POPS = (() => {
  const rng = createRng(909);
  return Array.from({ length: 14 }, () => ({ a: rng() * Math.PI * 2, d: 0.4 + rng() * 0.8, r: 4 + rng() * 10, rise: 0.5 + rng() }));
})();

/** A cluster of bubbles bursting from `at`, `size` px across, `age` seconds old. */
export function drawBubbleBurst(ctx: CanvasRenderingContext2D, at: Pt, size: number, age: number): void {
  if (age < 0 || age > 1.2) return;
  const u = age / 1.2;
  ctx.save();
  ctx.strokeStyle = 'rgba(235,250,245,0.9)';
  ctx.fillStyle = 'rgba(235,250,245,0.18)';
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 1 - u;
  for (const b of POPS) {
    const out = (1 - (1 - u) ** 2) * b.d * size;
    const x = at.x + Math.cos(b.a) * out;
    const y = at.y + Math.sin(b.a) * out * 0.6 - u * 160 * b.rise;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Chalk tick marks across a line at points (screen px). */
export function drawTicks(ctx: CanvasRenderingContext2D, pts: readonly { at: Pt; h: number }[], alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const p of pts) {
    ctx.beginPath();
    ctx.moveTo(p.at.x, p.at.y - p.h / 2);
    ctx.lineTo(p.at.x, p.at.y + p.h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

export { INK_BG };
