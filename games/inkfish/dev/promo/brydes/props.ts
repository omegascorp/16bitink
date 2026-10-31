import { INK, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { CHALK, INK_BG } from './scene';
import { TEXT } from './script';
import { smoothed } from './whale';

/** The things drawn over the sea: the place tag, the "40 ft / 12 m" length bar, the two crossed-out gag cards. */

const ON_DARK = { fill: CHALK, halo: INK_BG } as const;

/** "Gulf of Thailand": a pin and the name, hand-lettered, with a wavy underline. */
export function drawPlace(ctx: CanvasRenderingContext2D, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const { y, size } = TEXT.place;
  const rise = (1 - alpha) * 30;
  drawTextLine(ctx, 'Gulf of Thailand', VIDEO.width / 2, y + rise, size, 700, alpha, ON_DARK);
  const pen = new Pen(ctx, 61 + boil * 977, 1.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.stroke(Array.from({ length: 16 }, (_, i) => ({ x: 170 + i * 49.3, y: y + rise + 26 + 7 * Math.sin(i * 1.3) })), 6, '#f5c84a', 1, false);
  // The pin above it.
  const [px, py] = [VIDEO.width / 2, y + rise - size * 0.95];
  ctx.fillStyle = '#e0443e';
  ctx.beginPath();
  ctx.arc(px, py, 22, Math.PI, 0);
  ctx.lineTo(px, py + 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK_BG;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#f4eddc';
  ctx.beginPath();
  ctx.arc(px, py - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The length bar down the whale from snout to fluke, "40 ft" over "12 m". */
export function drawBar(ctx: CanvasRenderingContext2D, top: Pt, bottom: Pt, bar: { draw: number; shown: number; pop: number }, boil: number): void {
  if (bar.shown <= 0) return;
  const pen = new Pen(ctx, 77 + boil * 977, 1.4);
  const end = { x: bottom.x, y: top.y + (bottom.y - top.y) * bar.draw };
  ctx.save();
  ctx.globalAlpha = bar.shown;
  for (const [col, w, dx] of [[INK_BG, 11, 2], [CHALK, 5, 0]] as const) {
    pen.stroke([{ x: top.x + dx, y: top.y }, { x: end.x + dx, y: end.y }], w, col, 1, false);
    pen.stroke([{ x: top.x - 22 + dx, y: top.y }, { x: top.x + 22 + dx, y: top.y }], w, col, 1, false);
    if (bar.draw > 0.98) pen.stroke([{ x: bottom.x - 22 + dx, y: bottom.y }, { x: bottom.x + 22 + dx, y: bottom.y }], w, col, 1, false);
  }
  ctx.restore();
  const pop = 1 + bar.pop;
  drawTextLine(ctx, '40 ft', VIDEO.width * 0.69, TEXT.feet.y, TEXT.feet.size * pop, 700, bar.shown * Math.min(1, bar.draw * 3), ON_DARK);
  drawTextLine(ctx, '12 m', VIDEO.width * 0.69, TEXT.metres.y, TEXT.metres.size * pop, 700, bar.shown * Math.min(1, bar.draw * 3), ON_DARK);
}

// ---------------------------------------------------------------- the gag cards

const WHALE_SHAPE: readonly Pt[] = smoothed([
  { x: 150, y: 6 }, { x: 128, y: -30 }, { x: 70, y: -50 }, { x: -20, y: -48 }, { x: -100, y: -28 }, { x: -150, y: -8 }, { x: -182, y: -48 }, { x: -204, y: -54 },
  { x: -196, y: -4 }, { x: -204, y: 42 }, { x: -182, y: 40 }, { x: -150, y: 10 }, { x: -100, y: 28 }, { x: -20, y: 42 }, { x: 60, y: 36 }, { x: 118, y: 22 },
], 2);

/** A dark silhouette whale on a card, nose to the right, mouth open or shut. */
function drawSilhouette(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt, scale: number, angle: number, open: boolean): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(0, -50, 0, 44);
  g.addColorStop(0, '#222c36');
  g.addColorStop(1, '#55616b');
  ctx.beginPath();
  WHALE_SHAPE.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  pen.stroke([...WHALE_SHAPE, WHALE_SHAPE[0]!], 4 / scale, INK, 1, false);
  if (open) {
    ctx.fillStyle = '#2a1317';
    ctx.beginPath();
    ctx.moveTo(150, 4);
    ctx.lineTo(70, -8);
    ctx.lineTo(96, 38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#f2eee3';
  ctx.beginPath();
  ctx.arc(86, -14, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#120d0c';
  ctx.beginPath();
  ctx.arc(89, -13, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFishIcon(ctx: CanvasRenderingContext2D, at: Pt, size: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(size, size);
  ctx.fillStyle = '#c6d4dc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 / size;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2);
  ctx.moveTo(-26, 0);
  ctx.lineTo(-42, -11);
  ctx.lineTo(-42, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(20, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const CARD = { w: 470, h: 250, x: 30, ys: [310, 600] } as const;

/** One gag card: n = 0 a whale lunging up at its fish, n = 1 a whale chasing one; a red ✗ stamped across it. */
export function drawCard(ctx: CanvasRenderingContext2D, n: 0 | 1, card: { slide: number; cross: number }, t: number, boil: number): void {
  if (card.slide <= 0) return;
  const pen = new Pen(ctx, 83 + n * 17 + boil * 977, 1.6);
  const x = CARD.x - (1 - card.slide) * (CARD.w + 80);
  const y = CARD.ys[n];
  ctx.save();
  ctx.translate(x + CARD.w / 2, y + CARD.h / 2);
  ctx.rotate(n ? 0.03 : -0.035);
  ctx.translate(-CARD.w / 2, -CARD.h / 2);
  ctx.fillStyle = '#f4eddc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD.w, CARD.h, 18);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const sea = ctx.createLinearGradient(0, 0, 0, CARD.h);
  sea.addColorStop(0, '#f7d9b0');
  sea.addColorStop(0.55, '#f2b98a');
  sea.addColorStop(0.56, '#4a8b98');
  sea.addColorStop(1, '#173f58');
  ctx.fillStyle = sea;
  ctx.fillRect(6, 6, CARD.w - 12, CARD.h - 12);
  const bob = 5 * Math.sin(t * 9 + n);
  if (n === 0) {
    // Lunging: the whale shooting up out of the water at a fish, spray behind it.
    drawSilhouette(ctx, pen, { x: 190, y: 150 + bob }, 0.72, -0.62, true);
    drawFishIcon(ctx, { x: 395, y: 44 }, 0.7);
    for (let i = 0; i < 4; i++) pen.hair([{ x: 60 + i * 26, y: 238 }, { x: 40 + i * 22, y: 190 - i * 8 }], 3, '#e8f2f4', 0.8);
  } else {
    // Chasing: speed lines, a sweaty fish dashing off ahead.
    for (let i = 0; i < 4; i++) pen.hair([{ x: 20, y: 110 + i * 24 }, { x: 70 + (i % 2) * 20, y: 110 + i * 24 }], 4, '#f4eddc', 0.9);
    drawSilhouette(ctx, pen, { x: 200, y: 160 + bob }, 0.74, 0.08, false);
    drawFishIcon(ctx, { x: 410, y: 150 }, 0.62);
    pen.hair([{ x: 380, y: 112 }, { x: 376, y: 124 }], 4, '#cfe8f4', 1);
    pen.hair([{ x: 398, y: 100 }, { x: 396, y: 114 }], 4, '#cfe8f4', 1);
  }
  ctx.restore();
  pen.stroke([{ x: 0, y: 0 }, { x: CARD.w, y: 0 }, { x: CARD.w, y: CARD.h }, { x: 0, y: CARD.h }, { x: 0, y: 0 }], 5, INK, 1, true);
  // The ✗ stamped on, thick and red, in two strokes.
  if (card.cross > 0) {
    const k = card.cross;
    const grow = 1 + 0.25 * (1 - k);
    ctx.save();
    ctx.translate(CARD.w / 2, CARD.h / 2);
    ctx.scale(grow, grow);
    ctx.globalAlpha = Math.min(1, k * 2);
    for (const [col, w] of [[INK, 22], ['#e0343a', 13]] as const) {
      pen.stroke([{ x: -80, y: -60 }, { x: -80 + 160 * Math.min(1, k * 2), y: -60 + 120 * Math.min(1, k * 2) }], w, col, 1, false);
      if (k > 0.5) pen.stroke([{ x: 80, y: -60 }, { x: 80 - 160 * Math.min(1, (k - 0.5) * 2), y: -60 + 120 * Math.min(1, (k - 0.5) * 2) }], w, col, 1, false);
    }
    ctx.restore();
  }
  ctx.restore();
}
