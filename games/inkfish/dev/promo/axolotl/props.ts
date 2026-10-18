import { PAPER_FILL } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { ellipse, INK, type Pt } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { closed, drawTwinkle, livePen, pt } from './ink';
import type { Grade } from './story';

/**
 * The overlays: the sun and moon going round in the time-lapse, sparkles
 * round the bud, little hearts round the grinning axolotl, and the colour
 * grade that sets each beat's mood (drained, darkened, warm or rosy).
 */

const SUN = '#f5c84a';

/** An inked sun: a round face and short rays. */
function drawSun(ctx: CanvasRenderingContext2D, at: Pt, r: number, boil: number): void {
  halo(ctx, at.x, at.y, r * 3, '#ffd27a', 0.5);
  const pen = livePen(ctx, boil, 41, 0.6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ray = [pt(at.x + Math.cos(a - 0.15) * r * 1.2, at.y + Math.sin(a - 0.15) * r * 1.2), pt(at.x + Math.cos(a) * r * 1.7, at.y + Math.sin(a) * r * 1.7), pt(at.x + Math.cos(a + 0.15) * r * 1.2, at.y + Math.sin(a + 0.15) * r * 1.2)];
    pen.fill(ray, SUN, 0.95);
    pen.stroke(closed(ray), 2.4, INK, 1, false);
  }
  const face = ellipse(at.x, at.y, r, r, 30);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, SUN, 0.9);
  pen.stroke(closed(face), 3, INK);
}

/** An inked crescent moon. */
function drawMoon(ctx: CanvasRenderingContext2D, at: Pt, r: number, boil: number): void {
  halo(ctx, at.x, at.y, r * 2.6, '#cfe0ff', 0.4);
  const pen = livePen(ctx, boil, 43, 0.6);
  const outer = Array.from({ length: 25 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / 24;
    return pt(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
  });
  const inner = Array.from({ length: 25 }, (_, i) => {
    const a = Math.PI / 2 - (Math.PI * i) / 24;
    return pt(at.x + Math.cos(a) * r * 0.45, at.y + Math.sin(a) * r);
  });
  const moon = [...outer, ...inner];
  pen.fill(moon, PAPER_FILL, 1);
  pen.fill(moon, '#e6ecf7', 0.8);
  pen.stroke(closed(moon), 3, INK);
}

/** The sun and moon wheeling round over the top of the picture: `angle` 0 has the sun overhead. */
export function drawSkyClock(ctx: CanvasRenderingContext2D, angle: number, alpha: number, boil: number): void {
  if (alpha <= 0.01) return;
  const c = pt(VIDEO.width / 2, 760);
  const R = 400;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(0, 250, VIDEO.width, 360);
  ctx.clip();
  drawSun(ctx, pt(c.x + Math.sin(angle) * R, c.y - Math.cos(angle) * R), 46, boil);
  drawMoon(ctx, pt(c.x - Math.sin(angle) * R, c.y + Math.cos(angle) * R), 44, boil);
  ctx.restore();
}

/** Sparkles twinkling round a point, `a` 0 .. 1, `t` for their twinkle. */
export function drawSparkles(ctx: CanvasRenderingContext2D, at: Pt, reach: number, a: number, t: number): void {
  if (a <= 0.01) return;
  for (let i = 0; i < 5; i++) {
    const ph = t * (2.1 + i * 0.37) + i * 1.9;
    const tw = 0.5 + 0.5 * Math.sin(ph * 2.2);
    const ang = i * 1.257 + 0.3 * Math.sin(ph * 0.5);
    const d = reach * (0.55 + 0.35 * ((i * 0.37) % 1));
    drawTwinkle(ctx, pt(at.x + Math.cos(ang) * d, at.y + Math.sin(ang) * d * 0.8), reach * (0.11 + 0.09 * tw), a * (0.45 + 0.55 * tw), '#fff1b0', ph * 0.2);
  }
}

/** A soft ring spreading out from the bud, `u` 0 .. 1 over its life. */
export function drawPulse(ctx: CanvasRenderingContext2D, at: Pt, reach: number, u: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha * (1 - u) ** 1.5;
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(at.x, at.y, reach * (0.3 + 0.7 * u), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** One little inked heart. */
function heart(ctx: CanvasRenderingContext2D, at: Pt, s: number, boil: number, salt: number): void {
  const pen = livePen(ctx, boil, 60 + salt, 0.4);
  const shape = Array.from({ length: 30 }, (_, i) => {
    const th = (i / 30) * Math.PI * 2;
    return pt(at.x + s * Math.sin(th) ** 3, at.y - (s * (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th))) / 16);
  });
  pen.fill(shape, '#ff6f8f', 1);
  pen.stroke(closed(shape), 2.6, INK, 1, false);
}

/** Hearts floating up round the grinning axolotl's head, `a` 0 .. 1 (`u` the time since they began). */
export function drawHearts(ctx: CanvasRenderingContext2D, at: Pt, a: number, u: number, boil: number): void {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  for (let i = 0; i < 3; i++) {
    const k = (u * 0.7 + i / 3) % 1;
    heart(ctx, pt(at.x - 70 + i * 70 + 14 * Math.sin(u * 3 + i), at.y - 30 - 150 * k), 22 * (0.7 + 0.5 * Math.sin(Math.PI * k)), boil, i);
  }
  ctx.restore();
}

/** Paints a flat colour over the frame with a blend mode. */
function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Darkens what has been drawn (the water behind the axolotl): night in the time-lapse, deep teal for the see-through beat. */
export function gradeBackdrop(ctx: CanvasRenderingContext2D, g: Grade): void {
  wash(ctx, 'multiply', '#10283a', g.dark);
}

/** The mood over the whole picture: the colour drained and dimmed (sad), a warm golden glow (wonder), a rosy brightness (cheeky). */
export function gradeAll(ctx: CanvasRenderingContext2D, g: Grade, night: number): void {
  wash(ctx, 'multiply', '#26304a', 0.35 * night);
  wash(ctx, 'saturation', '#808080', g.drain);
  wash(ctx, 'multiply', '#9aa2a8', 0.45 * g.drain);
  wash(ctx, 'soft-light', '#ffc76a', 0.3 * g.warm);
  wash(ctx, 'soft-light', '#ff9ec0', 0.32 * g.rosy);
  wash(ctx, 'screen', '#2a1820', 0.4 * g.rosy);
}

/** A soft dark edge round the frame. */
export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 420, VIDEO.width / 2, 820, 1250);
  g.addColorStop(0, 'rgba(6,14,10,0)');
  g.addColorStop(1, 'rgba(6,14,10,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
