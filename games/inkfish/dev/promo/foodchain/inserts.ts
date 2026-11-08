import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { FRAME } from '../descent/frame';
import { drawTextLeft } from '../descent/hud';
import { clamp01, smooth } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { plankton } from './cast';
import { inkOn } from './hud';

/**
 * The cut-ins: the game card (the inkling eating its way up), the stopwatch
 * for the half-hour chase, the coastline the great whites left, the grand
 * piano beside the tuna, the magnifier with a krill and a paperclip, the
 * surface after the hunt, and the end card.
 */

const W = FRAME.width;
const H = FRAME.height;
const RED = '#c8372d';

interface Pt {
  readonly x: number;
  readonly y: number;
}

const boilOf = (t: number): number => Math.floor(t * BOIL_FPS) % BOIL_FRAMES;

// ---------------------------------------------------------------- the game card

export interface GameCard {
  draw(ctx: CanvasRenderingContext2D, t: number, from: number, eatUp: number, free: number, alpha: number): void;
}

/** The inkling in its puddle, eating three minnows and growing a size each time, with the site under it. */
export function createGameCard(): GameCard {
  const inkling: Sprite = makeSprite('inkling', 6);
  const minnow: Sprite = makeSprite('minnow', 3);
  return {
    draw(ctx, t, from, eatUp, free, alpha) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#d9ecef');
      g.addColorStop(1, '#a9cfd6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const meals = [eatUp - 0.4, eatUp + 0.5, eatUp + 1.3];
      const eaten = meals.filter((m) => t > m).length;
      const size = 170 * 1.35 ** eaten;
      const x = W * 0.5 + 60 * Math.sin((t - from) * 0.6);
      const y = H * 0.48 + 20 * Math.sin((t - from) * 1.1);
      meals.forEach((m, i) => {
        const left = clamp01((m - t) / 0.25);
        if (left <= 0) return;
        const dx = (i % 2 === 0 ? 1 : -1) * (220 + 260 * clamp01((m - t) / 2.2));
        drawSwimmer(ctx, minnow, { j: 0, shape: 'minnow', age: 0, x: x + dx * left + 0.42 * size, y: y - 30 + i * 30, length: 80 * left, facing: dx > 0 ? -1 : 1, tilt: 0, beat: t * 14, effort: 0.6 }, boilOf(t));
      });
      const gulping = meals.some((m) => t > m - 0.35 && t < m + 0.1);
      drawSwimmer(ctx, inkling, { j: 0, shape: 'inkling', age: 0, x, y, length: size, facing: 1, tilt: 0, beat: t * 10, effort: 0.5 }, boilOf(t), { jaw: gulping ? 0.8 : 0 });
      drawTextLine(ctx, 'InkFish', W / 2, 190, 150, 700, alpha);
      drawTextLine(ctx, 'free in your browser · 16bit.ink', W / 2, H - 120, 72, 700, alpha * smooth((t - free) / 0.4));
    },
  };
}

// ---------------------------------------------------------------- the stopwatch

/** A hand-drawn stopwatch (top middle, clear of the step card and the pyramid), its hand sweeping round `minutes`. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, minutes: number, alpha: number, dark: number): void {
  if (alpha <= 0) return;
  const x = W / 2;
  const y = 200;
  const r = 95;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 16, y - r - 30, 32, 26);
  ctx.strokeRect(x - 16, y - r - 30, 32, 26);
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * r * 0.82, y - Math.cos(a) * r * 0.82);
    ctx.lineTo(x + Math.sin(a) * r * 0.94, y - Math.cos(a) * r * 0.94);
    ctx.stroke();
  }
  // The elapsed half hour as a red wedge, and the hand.
  const a = (minutes / 60) * Math.PI * 2;
  ctx.fillStyle = 'rgba(200,55,45,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.8, -Math.PI / 2, -Math.PI / 2 + a);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(a) * r * 0.78, y - Math.cos(a) * r * 0.78);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, `${Math.round(minutes)} min`, x + r + 90, y + 18, 58, 700, alpha, inkOn(dark));
}

// ---------------------------------------------------------------- the coastline

/** The tip of South Africa with Gansbaai marked; the shark dots near it scatter out to sea as `gone` goes 0 .. 1. */
export function drawCoast(ctx: CanvasRenderingContext2D, gone: number, alpha: number): void {
  if (alpha <= 0) return;
  const x0 = W * 0.5 - 520;
  const y0 = H * 0.5 - 330;
  const w = 1040;
  const h = 660;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#9cc4d8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeRect(x0, y0, w, h);
  // Land across the top: the coast runs east to west with Cape Agulhas dipping south.
  const coast = [[0, 0.32], [0.12, 0.38], [0.22, 0.52], [0.3, 0.46], [0.42, 0.5], [0.5, 0.62], [0.56, 0.58], [0.68, 0.5], [0.8, 0.46], [0.9, 0.36], [1, 0.3]] as const;
  ctx.fillStyle = '#e9dfc3';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (const [u, v] of coast) ctx.lineTo(x0 + u * w, y0 + v * h);
  ctx.lineTo(x0 + w, y0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const gx = x0 + 0.33 * w;
  const gy = y0 + 0.47 * h;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(gx, gy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'Gansbaai', gx, gy - 26, 48, 700, alpha);
  drawTextLine(ctx, 'SOUTH AFRICA', x0 + 0.62 * w, y0 + 0.2 * h, 54, 700, alpha * 0.8);
  // Twelve great whites, by the shore at first, then off the map.
  for (let i = 0; i < 12; i++) {
    const a = 0.9 + (i / 12) * 1.4;
    const r0 = 60 + (i % 4) * 26;
    const r = r0 + smooth(gone - i * 0.03) * 900;
    const sx = gx + Math.cos(a) * r * 1.2;
    const sy = gy + Math.sin(a) * r;
    if (sx < x0 || sx > x0 + w || sy < y0 || sy > y0 + h) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4a5560';
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -7);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawTextLine(ctx, 'great whites', x0 + 0.33 * w, y0 + 0.86 * h, 46, 700, alpha * (1 - smooth(gone)));
  drawTextLine(ctx, 'gone for weeks… sometimes months', W / 2, y0 + h - 40, 50, 700, alpha * smooth((gone - 0.4) / 0.4));
}

// ---------------------------------------------------------------- the grand piano

/** A grand piano seen from the side, as an ink silhouette `w` px long, standing on (x, y). */
export function drawPiano(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number, dark: number): void {
  if (alpha <= 0) return;
  const h = w * 0.55;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1d1b22';
  ctx.strokeStyle = dark > 0.5 ? PAPER : INK;
  ctx.lineWidth = 3;
  // Lid propped open, case, legs.
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.45);
  ctx.lineTo(x + w / 2, y - h * 0.45);
  ctx.quadraticCurveTo(x + w * 0.52, y - h * 0.62, x + w * 0.3, y - h * 0.65);
  ctx.lineTo(x - w / 2, y - h * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y - h * 0.65);
  ctx.lineTo(x + w * 0.1, y - h);
  ctx.lineTo(x + w * 0.16, y - h * 0.96);
  ctx.lineTo(x - w * 0.36, y - h * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const lx of [-0.44, 0.0, 0.42]) {
    ctx.fillRect(x + lx * w - 6, y - h * 0.45, 12, h * 0.45);
    ctx.strokeRect(x + lx * w - 6, y - h * 0.45, 12, h * 0.45);
  }
  ctx.restore();
  drawTextLine(ctx, 'grand piano', x, y + 52, 44, 700, alpha, inkOn(dark));
  drawTextLine(ctx, '~480 kg · 1,060 lb', x, y + 94, 36, 500, alpha, inkOn(dark));
}

// ---------------------------------------------------------------- the magnifier

/** A round magnifier at (x, y): one krill beside a paperclip, the same length. */
export function drawKrillMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8f1ee';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  plankton.drawKrill(ctx, x, y - r * 0.3, r * 1.25, Math.PI, t, { kick: 0.5 + 0.5 * Math.sin(t * 6) });
  plankton.drawPaperclip(ctx, x, y + r * 0.38, r * 1.25, 0, t);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.72, y + r * 0.72);
  ctx.lineTo(x + r * 1.15, y + r * 1.15);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'krill = a paperclip · 2 in', x, y + r + 64, 46, 700, alpha, INK_ON_PAPER);
}

// ---------------------------------------------------------------- the surface

/** The sea's surface from just below, calm, with a spout of spray rising above at `spray` 0..1. */
export function drawSurface(ctx: CanvasRenderingContext2D, t: number, spray: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  sky.addColorStop(0, '#f4eddc');
  sky.addColorStop(1, '#dfe6ea');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.45);
  const sea = ctx.createLinearGradient(0, H * 0.45, 0, H);
  sea.addColorStop(0, '#3d7aa8');
  sea.addColorStop(1, '#12345e');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const y = H * 0.45 + 6 * Math.sin(x * 0.012 + t * 1.4) + 3 * Math.sin(x * 0.031 - t * 2);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // The spout: a column of mist, narrow at the water and billowing at the top, that rises, then thins and drifts.
  if (spray > 0) {
    const rise = smooth(spray / 0.45);
    const fade = 1 - smooth((spray - 0.55) / 0.45);
    const baseX = W * 0.55;
    const baseY = H * 0.45;
    const height = 480 * rise;
    const drift = 60 * spray;
    const edge = (side: 1 | -1): Pt[] => Array.from({ length: 17 }, (_, i) => {
      const k = i / 16;
      const width = 14 + 120 * k ** 1.6 + 14 * Math.sin(t * 4 + k * 9 + side);
      return { x: baseX + drift * k * k + side * width, y: baseY - height * k };
    });
    const right = edge(1);
    const left = edge(-1).reverse();
    const top = baseY - height;
    const grad = ctx.createLinearGradient(0, baseY, 0, top);
    grad.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
    grad.addColorStop(1, `rgba(255,255,255,${0.55 * fade})`);
    ctx.fillStyle = grad;
    ctx.strokeStyle = `rgba(40,50,60,${0.5 * fade})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    right.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    // A billowing crown across the top.
    const r = right[right.length - 1]!;
    const l = left[0]!;
    for (let i = 1; i <= 5; i++) {
      const x = r.x + ((l.x - r.x) * i) / 5;
      ctx.quadraticCurveTo(x - (l.x - r.x) / 10, top - 40 * rise, x, top + 6 * Math.sin(i + t));
    }
    left.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the end card

/** The logo and the site on the left; the right half kept clear for YouTube's end-screen elements. */
export function drawEndCard(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  drawTextLeft(ctx, 'InkFish', 140, 470, 190, 700, alpha, INK_ON_PAPER);
  drawTextLeft(ctx, 'Start at the bottom of the chain.', 146, 570, 64, 500, alpha, INK_ON_PAPER);
  drawTextLeft(ctx, 'Free in your browser · 16bit.ink', 146, 660, 64, 700, alpha, INK_ON_PAPER);
}
