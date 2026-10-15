import { halo } from '../../../src/art/glowArt';
import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { smooth } from '../short';
import type { Pt } from './fish';

/** The notes inked over the reef: the sign, the spines' glow, labels with leader lines, the "?", the calendar and the counter. */

export const RED = '#c8321e';
export const GREEN = '#2f8a4a';
export const ON_PAPER: TextInk = { fill: INK, halo: PAPER };
export const RED_INK: TextInk = { fill: RED, halo: PAPER };
const GREEN_INK: TextInk = { fill: GREEN, halo: PAPER };

function inked(ctx: CanvasRenderingContext2D, width: number, colour = INK): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A fork, tines up, `h` tall, centred at the origin. */
function fork(ctx: CanvasRenderingContext2D, h: number): void {
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(0, -h * 0.12);
  for (const x of [-0.12, -0.04, 0.04, 0.12]) {
    ctx.moveTo(x * h, -h * 0.5);
    ctx.lineTo(x * h, -h * 0.2);
  }
  ctx.moveTo(-h * 0.12, -h * 0.2);
  ctx.quadraticCurveTo(0, -h * 0.05, h * 0.12, -h * 0.2);
  inked(ctx, h * 0.045);
}

/** A table knife, blade up. */
function knife(ctx: CanvasRenderingContext2D, h: number): void {
  ctx.beginPath();
  ctx.moveTo(-h * 0.03, h * 0.5);
  ctx.lineTo(-h * 0.03, -h * 0.05);
  ctx.quadraticCurveTo(-h * 0.06, -h * 0.4, h * 0.03, -h * 0.5);
  ctx.lineTo(h * 0.07, -h * 0.05);
  ctx.lineTo(h * 0.03, -h * 0.05);
  ctx.lineTo(h * 0.03, h * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#d7dce2';
  ctx.fill();
  inked(ctx, h * 0.035);
}

/** A chef's hat: a puffy top over a band. */
function chefHat(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, w * 0.1);
  ctx.bezierCurveTo(-w * 0.62, w * 0.02, -w * 0.5, -w * 0.42, -w * 0.18, -w * 0.3);
  ctx.bezierCurveTo(-w * 0.12, -w * 0.58, w * 0.22, -w * 0.58, w * 0.2, -w * 0.3);
  ctx.bezierCurveTo(w * 0.52, -w * 0.42, w * 0.62, w * 0.02, w * 0.32, w * 0.1);
  ctx.lineTo(w * 0.32, w * 0.34);
  ctx.lineTo(-w * 0.32, w * 0.34);
  ctx.closePath();
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  inked(ctx, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, w * 0.16);
  ctx.lineTo(w * 0.32, w * 0.16);
  inked(ctx, w * 0.03);
}

/**
 * The sign over the reef, a card on a slant with an arrow down at the
 * lionfish. One face: a fork and knife either side of "EAT" over "this
 * fish" (they jab on `jab`). The other: a chef's hat and "safe to eat".
 * `width` squeezes it like a card turning over.
 */
export function drawSign(ctx: CanvasRenderingContext2D, at: Pt, to: Pt, face: 'eat' | 'safe', shown: number, width: number, jab: number): void {
  if (shown <= 0 || width <= 0.01) return;
  const pop = smooth(shown);
  ctx.save();
  ctx.globalAlpha = Math.min(1, shown * 2);
  // The arrow, from under the card down to the fish.
  ctx.beginPath();
  ctx.moveTo(at.x + 40, at.y + 120);
  ctx.quadraticCurveTo(at.x + 70, to.y - 40, to.x, to.y);
  inked(ctx, 7, face === 'eat' ? RED : GREEN);
  const a = Math.atan2(to.y - (to.y - 40), to.x - (at.x + 70));
  ctx.beginPath();
  ctx.moveTo(to.x + Math.cos(a + 2.6) * 34, to.y + Math.sin(a + 2.6) * 34);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x + Math.cos(a - 2.6) * 34, to.y + Math.sin(a - 2.6) * 34);
  inked(ctx, 7, face === 'eat' ? RED : GREEN);

  ctx.translate(at.x, at.y);
  ctx.rotate(-0.06);
  ctx.scale(width * (0.7 + 0.3 * pop), 0.7 + 0.3 * pop);
  ctx.fillStyle = 'rgba(27,26,31,0.22)';
  ctx.fillRect(-190, -105, 390, 225);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-200, -115, 390, 225);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(-200, -115, 390, 225);
  if (face === 'eat') {
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(side * 140 - 5, -5 - 22 * jab);
      ctx.rotate(side * (0.18 + 0.25 * jab));
      (side < 0 ? fork : knife)(ctx, 170);
      ctx.restore();
    }
    drawTextLine(ctx, 'EAT', -5, 10, 120, 700, 1, RED_INK);
    drawTextLine(ctx, 'this fish', -5, 82, 62, 700, 1, ON_PAPER);
  } else {
    ctx.save();
    ctx.translate(-120, -10);
    chefHat(ctx, 140);
    ctx.restore();
    drawTextLine(ctx, 'safe', 55, -10, 88, 700, 1, GREEN_INK);
    drawTextLine(ctx, 'to eat ✓', 55, 72, 70, 700, 1, GREEN_INK);
  }
  ctx.restore();
}

/** The venomous spines glowing red: a halo along each, and a red line over it. */
export function drawSpineGlow(ctx: CanvasRenderingContext2D, spines: readonly { readonly base: Pt; readonly tip: Pt }[], glow: number, t: number): void {
  if (glow <= 0) return;
  const pulse = 0.8 + 0.2 * Math.sin(t * 14);
  for (const s of spines) {
    halo(ctx, (s.base.x + s.tip.x) / 2, (s.base.y + s.tip.y) / 2, 70, '#ff3b1f', 0.35 * glow * pulse);
  }
  ctx.save();
  ctx.globalAlpha = glow;
  for (const s of spines) {
    ctx.beginPath();
    ctx.moveTo(s.base.x, s.base.y);
    ctx.lineTo(s.tip.x, s.tip.y);
    inked(ctx, 6, '#ff4a2a');
  }
  ctx.restore();
}

/** A label with a leader line ending in a dot on what it names. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size: number, colours: TextInk = ON_PAPER): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      inked(ctx, 4, colours.fill);
      ctx.beginPath();
      ctx.arc(to.x, to.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = colours.fill;
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/** A dashed ellipse round something, drawn on as `u` goes 0 → 1. */
export function drawDashedRing(ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, u: number, colour: string): void {
  if (u <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, u * 2);
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, -0.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * smooth(u));
  inked(ctx, 6, colour);
  ctx.restore();
}

/** A hand-inked "?" over a puzzled fish, `s` its size 0 .. 1. */
export function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  if (s <= 0) return;
  drawTextLine(ctx, '?', x, y, 170 * Math.min(1.15, s * 1.15), 700, Math.min(1, s * 2), ON_PAPER);
}

/** A little wall calendar: rings on top, "week 3" (or, circled, "5 weeks"). */
export function drawCalendar(ctx: CanvasRenderingContext2D, x: number, y: number, week: number, five: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - 120, y - 70, 240, 150);
  ctx.fillStyle = RED;
  ctx.fillRect(x - 120, y - 70, 240, 38);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 120, y - 70, 240, 150);
  for (const rx of [-70, 70]) {
    ctx.beginPath();
    ctx.moveTo(x + rx, y - 86);
    ctx.lineTo(x + rx, y - 56);
    inked(ctx, 7);
  }
  ctx.restore();
  const text = five > 0.5 ? '5 weeks' : `week ${week}`;
  drawTextLine(ctx, text, x, y + 50, 64, 700, alpha, ON_PAPER);
  if (five > 0) drawDashedRing(ctx, { x, y: y + 30 }, 150, 70, five, RED);
}

/** The counter: "young fish" over the share gone; the final −79% stamped big and red. */
export function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number, percent: number, stamp: number, alpha: number): void {
  if (alpha <= 0) return;
  // On a card, so the number reads clean over the fins behind it.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(27,26,31,0.2)';
  ctx.fillRect(x - 150, y - 158, 310, 225);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - 160, y - 168, 310, 225);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 160, y - 168, 310, 225);
  ctx.restore();
  drawTextLine(ctx, 'young fish', x, y - 105, 60, 700, alpha, ON_PAPER);
  const pop = stamp > 0 && stamp < 1 ? 1 + 0.35 * Math.sin(Math.PI * stamp) : 1;
  drawTextLine(ctx, `−${percent}%`, x, y + 20, 140 * pop, 700, alpha, percent > 0 ? RED_INK : ON_PAPER);
}
