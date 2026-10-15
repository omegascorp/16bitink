import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, lerp, smooth } from '../short';
import type { Pt } from './fish';
import { EGG } from './scene';

/** The notes inked over the scene: ♂/♀ badges, labels with leader lines, the lens on the pouch, the calendar and the card. */

export const MALE_INK = '#2f68ad';
export const FEMALE_INK = '#d23f78';
const RED = '#d8432f';

/** ♂ or ♀ as pen strokes on a paper halo, centred at (x, y). */
export function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sex: 'male' | 'female', alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (): void => {
    ctx.beginPath();
    if (sex === 'male') {
      const c = { x: -r * 0.2, y: r * 0.2 };
      ctx.arc(c.x, c.y, r * 0.62, 0, Math.PI * 2);
      const tip = { x: c.x + r * 1.15, y: c.y - r * 1.15 };
      ctx.moveTo(c.x + r * 0.44, c.y - r * 0.44);
      ctx.lineTo(tip.x, tip.y);
      ctx.moveTo(tip.x - r * 0.55, tip.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x, tip.y + r * 0.55);
    } else {
      const c = { x: 0, y: -r * 0.3 };
      ctx.arc(c.x, c.y, r * 0.62, 0, Math.PI * 2);
      ctx.moveTo(c.x, c.y + r * 0.62);
      ctx.lineTo(c.x, c.y + r * 1.5);
      ctx.moveTo(c.x - r * 0.42, c.y + r * 1.1);
      ctx.lineTo(c.x + r * 0.42, c.y + r * 1.1);
    }
  };
  path();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = r * 0.42;
  ctx.stroke();
  path();
  ctx.strokeStyle = sex === 'male' ? MALE_INK : FEMALE_INK;
  ctx.lineWidth = r * 0.17;
  ctx.stroke();
  ctx.restore();
}

/** A badge and a word beside it, the pair centred on x. */
export function drawSexTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, sex: 'male' | 'female', alpha: number, swell = 0): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  const r = size * 0.36 * (1 + 0.35 * swell);
  const gap = size * 0.25;
  const left = x - (w + gap + 2 * r) / 2;
  drawBadge(ctx, left + r, y - size * 0.3, r, sex, alpha);
  drawTextLine(ctx, text, left + 2 * r + gap + w / 2, y, size, 700, alpha, { fill: sex === 'male' ? MALE_INK : FEMALE_INK, halo: PAPER });
}

/** A label in ink with a leader line to what it names. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.85 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 30) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 10, to.y - (dy / len) * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha);
}

// ---------------------------------------------------------------- the lens

export const LENS = { x: 290, y: 470, r: 165 } as const;
const EGGS_IN: readonly Pt[] = [{ x: -70, y: -40 }, { x: 10, y: -62 }, { x: 82, y: -20 }, { x: -30, y: 30 }, { x: 52, y: 52 }];
const EGG_R = 36;
const WALL = 108;

/** A baby curled in its egg, `grow` 0 a speck .. 1 a curled little pipefish with an eye. */
function drawEmbryo(ctx: CanvasRenderingContext2D, c: Pt, grow: number, turn: number): void {
  const r = EGG_R * (0.25 + 0.5 * grow);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(turn);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 + 4 * grow;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, -0.4, -0.4 + Math.PI * (0.6 + 1.1 * grow));
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(Math.cos(-0.4) * r * 0.7, Math.sin(-0.4) * r * 0.7, 2 + 3.5 * grow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** An O₂ bubble from the pouch wall into egg k, `u` 0 .. 1 along its way. */
function drawBubble(ctx: CanvasRenderingContext2D, k: number, u: number): void {
  const target = EGGS_IN[k % EGGS_IN.length]!;
  const from = { x: target.x + (k % 2 ? 30 : -30), y: WALL + 8 };
  const e = smooth(u);
  const x = lerp(from.x, target.x, e) + 8 * Math.sin(u * 9 + k);
  const y = lerp(from.y, target.y + EGG_R * 0.6, e);
  const r = 15;
  ctx.save();
  ctx.globalAlpha = Math.min(1, u * 5) * (1 - clamp01((u - 0.8) / 0.2));
  ctx.fillStyle = '#e8f4ff';
  ctx.strokeStyle = '#2f68ad';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2f68ad';
  ctx.font = `700 19px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('O₂', x, y + 1);
  ctx.restore();
}

/** Inside the lens, at full size about (0, 0): the eggs in the pouch's wall, the blood bringing oxygen, the embryos growing. */
function drawCut(ctx: CanvasRenderingContext2D, grow: number, clock: number): void {
  const R = LENS.r;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  ctx.fillStyle = 'rgba(226,197,149,0.55)';
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  // The pouch wall below, full of blood vessels.
  ctx.fillStyle = 'rgba(214,120,110,0.45)';
  ctx.fillRect(-R, WALL, 2 * R, R);
  ctx.strokeStyle = '#b8323a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -R; x <= R; x += 10) ctx.lineTo(x, WALL + 22 + 6 * Math.sin(x * 0.05));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -R; x <= R; x += 10) ctx.lineTo(x, WALL + 3 * Math.sin(x * 0.04));
  ctx.stroke();
  EGGS_IN.forEach((c, k) => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, EGG_R, 0, Math.PI * 2);
    ctx.fillStyle = EGG;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawEmbryo(ctx, c, grow, k * 1.3);
  });
  for (let k = 0; k < 6; k++) drawBubble(ctx, k, (clock * 1.1 + k / 6) % 1);
}

/** The lens, `open` 0 .. 1: grown out of the pouch to its place, joined to it by two dashed lines. */
export function drawLens(ctx: CanvasRenderingContext2D, spot: Pt, open: number, grow: number, clock: number): void {
  if (open <= 0) return;
  const e = smooth(open);
  const c = { x: lerp(spot.x, LENS.x, e), y: lerp(spot.y, LENS.y, e) };
  const r = lerp(20, LENS.r, e);
  const dx = c.x - spot.x;
  const dy = c.y - spot.y;
  const d = Math.hypot(dx, dy) || 1;
  const px = -dy / d;
  const py = dx / d;
  const spotR = 30;
  ctx.save();
  ctx.globalAlpha = clamp01(open * 4);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(spot.x + px * spotR * s, spot.y + py * spotR * s);
    ctx.lineTo(c.x + px * r * s, c.y + py * r * s);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spotR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(c.x, c.y);
  ctx.scale(r / LENS.r, r / LENS.r);
  drawCut(ctx, grow, clock);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the calendar and the card

export const CALENDAR = { x: 815, y: 480, w: 230, h: 250 } as const;

function drawPage(ctx: CanvasRenderingContext2D, week: number, squash: number): void {
  const { w, h } = CALENDAR;
  ctx.save();
  ctx.scale(1, squash);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.rect(-w / 2, 0, w, h - 40);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (squash < 0.25) return;
  drawTextLine(ctx, 'week', 0, 58 * squash, 50 * squash, 700, 1);
  drawTextLine(ctx, String(week), 0, 160 * squash, 120 * squash, 700, 1, { fill: RED, halo: PAPER });
}

/** A desk calendar, `pages` flipped so far (fractional while a page lifts over the top), `alpha` faded in. */
export function drawCalendar(ctx: CanvasRenderingContext2D, pages: number, alpha: number): void {
  if (alpha <= 0) return;
  const { x, y, w } = CALENDAR;
  const shown = Math.floor(pages);
  const lift = pages - shown;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(0.05);
  // The binding along the top.
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillRect(-w / 2 - 6, -40, w + 12, 44);
  ctx.strokeRect(-w / 2 - 6, -40, w + 12, 44);
  ctx.translate(0, 4);
  drawPage(ctx, shown + 2, 1);
  if (shown < 4) drawPage(ctx, shown + 1, Math.cos(Math.PI * lift * 0.5) ** 2);
  for (const rx of [-60, 0, 60]) {
    ctx.beginPath();
    ctx.ellipse(rx, -6, 8, 16, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
}

/** The Father's Day card, `shown` 0 .. 1: popping up with a little overshoot, `wobble` rocking it. */
export function drawCard(ctx: CanvasRenderingContext2D, shown: number, wobble: number): void {
  if (shown <= 0) return;
  const pop = shown < 1 ? smooth(shown) * (1 + 0.12 * Math.sin(Math.PI * shown)) : 1;
  const w = 860;
  const h = 250;
  ctx.save();
  ctx.translate(540, 455);
  ctx.rotate(-0.035 + 0.02 * wobble);
  ctx.scale(pop, pop);
  ctx.globalAlpha = Math.min(1, shown * 3);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 26);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 18);
  ctx.stroke();
  ctx.setLineDash([]);
  drawHeart(ctx, -w / 2 + 70, -h / 2 + 62, 26);
  drawHeart(ctx, w / 2 - 70, h / 2 - 62, 26);
  drawTextLine(ctx, 'Happy', 0, -18, 92, 700, 1, { fill: MALE_INK, halo: PAPER });
  drawTextLine(ctx, 'Father’s Day!', 0, 82, 104, 700, 1, { fill: RED, halo: PAPER });
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.1, 0, s * 0.9);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}
