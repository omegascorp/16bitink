import { pt } from '../../../src/art/kit';
import { rgba } from '../../../src/art/paint';
import { HIGHLIGHT, INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { clamp01 } from '../short';
import type { Sprite } from '../sprites';

/** The marks drawn live over the scenes: parts of figures, dust, cracks, burst lines, labels, brackets and rings. */

/** A baked part at a place, turned and stretched along its own length (y). */
export function drawPart(ctx: CanvasRenderingContext2D, s: Sprite, boil: number, x: number, y: number, scale: number, rotation = 0, stretch = 1): void {
  const canvas = s.frames[((boil % s.frames.length) + s.frames.length) % s.frames.length]!;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(scale / s.res, (scale * stretch) / s.res);
  ctx.drawImage(canvas, -s.frame.ox * s.res, -s.frame.oy * s.res);
  ctx.restore();
}

/** A pen for live marks: the same seed each boil frame, so they boil with the drawings. */
export const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 7 + boil, 0.6);

function puff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A dust burst kicked out along the ground from (x, y), `u` 0 .. 1 of its life, `size` ~1 for a stomp: a shock ring, billows lit from the low sun, pebbles flung. */
export function drawDust(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, size: number, boil: number, seed = 1): void {
  if (u <= 0 || u >= 1) return;
  const rng = createRng(900 + seed);
  const pen = penFor(ctx, 31 + seed, boil);
  const fade = (1 - u) * (1 - u);
  const out = 1 - (1 - u) ** 5;
  // The shock ring racing out over the ground.
  const ring = Math.min(1, u * 2.5);
  if (ring < 1) {
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - ring) ** 1.5;
    ctx.strokeStyle = '#f3d7ad';
    ctx.filter = 'blur(6px)';
    ctx.lineWidth = 34 * (1 - ring) * size + 2;
    ctx.beginPath();
    ctx.ellipse(x, y, (90 + 560 * ring) * size, (18 + 110 * ring) * size, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1;
    const reach = (80 + rng() * 380) * size;
    const px = x + side * (70 * size + reach * out * (0.3 + 0.7 * rng()));
    const py = y + 14 - (rng() * 200 * rng()) * size * (0.25 + out);
    const r = (60 + rng() * 90) * size * (0.6 + 0.8 * out);
    puff(ctx, px, py, r, '#7a6352', 0.55 * fade);
    puff(ctx, px + r * 0.18, py - r * 0.22, r * 0.72, k % 3 ? '#d6b48c' : '#f0d6ae', 0.55 * fade);
    const a0 = rng() * Math.PI * 2;
    const curl = Array.from({ length: 8 }, (_, i) => pt(px + Math.cos(a0 + i * 0.55) * r * 0.5, py + Math.sin(a0 + i * 0.55) * r * 0.36));
    pen.hair(curl, 2.2 * size, INK, 0.55 * fade);
  }
  for (let k = 0; k < 12; k++) {
    const side = k % 2 ? 1 : -1;
    const vx = side * (160 + rng() * 420) * size;
    const vy = -(380 + rng() * 620) * size;
    const tt = u * 1.2;
    const px = x + vx * tt;
    const py = y + vy * tt + 1500 * tt * tt;
    if (py > y + 6) continue;
    const r = (6 + rng() * 9) * size;
    const rock = [pt(px - r, py), pt(px - r * 0.2, py - r * 0.9), pt(px + r, py - r * 0.2), pt(px + r * 0.3, py + r * 0.7)];
    pen.fill(rock, '#5d4e48', 0.95 * (1 - u));
    pen.fill(rock.map((q) => pt(q.x - r * 0.2, q.y - r * 0.25)), '#b39478', 0.5 * (1 - u));
    pen.stroke([...rock, rock[0]!], 1.8, INK, 0.9 * (1 - u));
  }
}

/** Cracks running out across the ground from (x, y), drawn in perspective (squashed), `p` 0 .. 1 grown, `alpha` to fade. */
export function drawCracks(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, size: number, boil: number, seed = 1, alpha = 1): void {
  if (p <= 0 || alpha <= 0) return;
  const rng = createRng(700 + seed);
  const pen = penFor(ctx, 17 + seed, boil);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rng() * 0.5;
    const len = (220 + rng() * 260) * size * p;
    const pts: Pt[] = [pt(x, y)];
    let cx = x;
    let cy = y;
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const aa = a + (rng() - 0.5) * 0.7;
      cx += (Math.cos(aa) * len) / n;
      cy += (Math.sin(aa) * len * 0.3) / n;
      pts.push(pt(cx, cy));
    }
    pen.stroke(pts, (5 - k * 0.2) * size, '#0b0910', 0.9 * alpha, false);
    pen.hair(pts.map((q) => pt(q.x + 1.5, q.y + 2.5)), 1.2 * size, '#c49a7a', 0.35 * alpha);
    // A short branch off it.
    const mid = pts[3]!;
    pen.hair([mid, pt(mid.x + Math.cos(a + 0.8) * len * 0.25, mid.y + Math.sin(a + 0.8) * len * 0.07)], 2.2 * size, '#0b0910', 0.8 * alpha);
  }
  // The dent: a dark squashed hollow where the foot hit.
  ctx.save();
  ctx.globalAlpha = 0.55 * alpha * clamp01(p * 2);
  ctx.translate(x, y);
  ctx.scale(1, 0.24);
  puff(ctx, 0, 0, 130 * size, '#07060c', 0.8);
  ctx.restore();
}

/** Comic burst lines round a point (a snap, a hit), `u` 0 .. 1 of their life. */
export function drawBurstLines(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, r: number, color: string, boil: number, n = 8, seed = 3): void {
  if (u <= 0 || u >= 1) return;
  const pen = penFor(ctx, 41 + seed, boil);
  const out = 1 - (1 - u) ** 2;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + seed;
    const r0 = r * (0.35 + 0.65 * out);
    const r1 = r0 + r * 0.55 * (1 - u);
    pen.stroke([pt(x + Math.cos(a) * r0, y + Math.sin(a) * r0), pt(x + Math.cos(a) * r1, y + Math.sin(a) * r1)], 5, color, 1 - u * u, false);
  }
}

/** Little stars circling a stunned head. */
export function drawDizzy(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = penFor(ctx, 61, boil);
  for (let k = 0; k < 3; k++) {
    const a = t * 5 + (k * Math.PI * 2) / 3;
    const cx = x + Math.cos(a) * 70;
    const cy = y + Math.sin(a) * 18;
    const star = Array.from({ length: 10 }, (_, i) => {
      const rr = i % 2 ? 7 : 17;
      const aa = (i / 10) * Math.PI * 2 - Math.PI / 2;
      return pt(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
    });
    pen.fill(star, HIGHLIGHT, alpha * (Math.sin(a) > -0.2 ? 1 : 0.6));
    pen.stroke([...star, star[0]!], 2.2, INK, alpha);
  }
}

/** A label that pops in (`pop` 0 .. 1 of its pop, then held), faded by `alpha`. */
export function drawPopLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, pop: number, alpha: number, colours: TextInk = PAPER_ON_DARK): void {
  if (pop <= 0 || alpha <= 0) return;
  const k = pop < 1 ? 0.6 + 0.55 * Math.sin(Math.PI * Math.min(1, pop) * 0.75) : 1;
  drawTextLine(ctx, text, x, y, size * k, 700, alpha, colours);
}

/** An inked dimension bracket from a to b, its ticks `tick` px long, drawn out to `p`. */
export function drawBracket(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, tick: Pt, p: number, boil: number, seed: number, color = PAPER): void {
  if (p <= 0) return;
  const pen = penFor(ctx, 71 + seed, boil);
  const e = pt(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p);
  pen.stroke([a, e], 4, color, 0.95, false);
  pen.stroke([pt(a.x - tick.x, a.y - tick.y), pt(a.x + tick.x, a.y + tick.y)], 4, color, 0.95, false);
  if (p >= 1) pen.stroke([pt(b.x - tick.x, b.y - tick.y), pt(b.x + tick.x, b.y + tick.y)], 4, color, 0.95, false);
}

/** A dashed highlighter ring round a point (an ellipse), drawn out to `p`. */
export function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, p: number, alpha: number, color = HIGHLIGHT): void {
  if (p <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(p));
  ctx.stroke();
  ctx.restore();
}

/** A highlighter stroke along a path (the legs lit), translucent yellow. */
export function drawHighlight(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, alpha: number): void {
  if (alpha <= 0 || pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.42 * alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = HIGHLIGHT;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.stroke();
  ctx.restore();
}

/** Sweat drops flicking off a head. */
export function drawSweat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = penFor(ctx, 81, boil);
  for (let k = 0; k < 3; k++) {
    const u = (t * 1.6 + k / 3) % 1;
    const side = k === 1 ? 1 : -1;
    const cx = x + side * (30 + 90 * u) * (k === 2 ? 0.6 : 1);
    const cy = y - 40 * Math.sin(u * Math.PI) - 30 * u + 120 * u * u;
    const drop = [pt(cx, cy - 16), pt(cx + 8, cy), pt(cx, cy + 8), pt(cx - 8, cy)];
    pen.fill(drop, '#bfe6f5', alpha * (1 - u));
    pen.stroke([...drop, drop[0]!], 2.4, INK, alpha * (1 - u));
  }
}

/** The quill: a long feather leaning back from its nib at (x, y), lifted off the page by `lift`. */
export function drawQuill(ctx: CanvasRenderingContext2D, x: number, y: number, lift: number, boil: number): void {
  const pen = penFor(ctx, 91, boil);
  const nib = pt(x, y - lift * 40);
  const tip = pt(nib.x + 230, nib.y - 330);
  const spine = (u: number): Pt => pt(nib.x + (tip.x - nib.x) * u + Math.sin(u * Math.PI) * 26, nib.y + (tip.y - nib.y) * u);
  // The vane: wider on one side, its edge notched where the barbs part.
  const vane: Pt[] = [];
  const back: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = 0.25 + (i / 16) * 0.75;
    const w = Math.sin(((u - 0.25) / 0.75) * Math.PI) ** 0.7 * 50 + 4;
    const notch = i % 5 === 3 ? 0.72 : 1;
    const s = spine(u);
    vane.push(pt(s.x - w * 0.86 * notch, s.y - w * 0.5 * notch));
    back.push(pt(s.x + w * 0.42 * (i % 6 === 2 ? 0.7 : 1), s.y + w * 0.3));
  }
  const shape = [...vane, ...back.reverse()];
  pen.fill(shape, PAPER_FILL, 0.96);
  pen.fill(shape, '#cbb89a', 0.55);
  for (let i = 1; i < 16; i++) pen.hair([spine(0.25 + (i / 16) * 0.75), vane[i]!], 1.1, '#7a6650', 0.7);
  pen.stroke([...shape, shape[0]!], 2.4, INK, 0.9);
  pen.stroke([nib, spine(0.3), spine(1)], 3.2, INK, 0.95, false);
  pen.fill([nib, pt(nib.x + 10, nib.y - 30), pt(nib.x + 20, nib.y - 24)], '#3a2a1a', 0.95);
}
