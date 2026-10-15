import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { smooth } from '../short';
import type { Pt } from './story';

/** The notes inked over the reef: callouts, ✗ and ✓, the head's measure, the film slate, the camera and the "2007" stamp. */

export const SPOKEN: TextInk = { fill: '#d9541e', halo: PAPER };
export const RED = '#d6402c';
const GREEN = '#3f8a3c';
const ORANGE = '#e2632a';
const SLATE = '#2b2930';

/** A label in handwriting with an inked leader line to what it names. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64, colours: TextInk = INK_ON_PAPER): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.3 : at.y - size * 0.85 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      for (const [w, c] of [[9, PAPER], [4, colours.fill]] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
        ctx.lineTo(to.x - (dx / len) * 14, to.y - (dy / len) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = colours.fill;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/** A hand-drawn ✗ (red) or ✓ (green), popping in with `u` (may overshoot past 1). */
export function drawMark(ctx: CanvasRenderingContext2D, kind: 'cross' | 'tick', at: Pt, size: number, u: number): void {
  if (u <= 0) return;
  const s = size * u;
  const strokes: readonly (readonly Pt[])[] = kind === 'cross'
    ? [[{ x: -0.5, y: -0.5 }, { x: 0.5, y: 0.5 }], [{ x: 0.5, y: -0.5 }, { x: -0.5, y: 0.5 }]]
    : [[{ x: -0.5, y: 0.02 }, { x: -0.14, y: 0.42 }, { x: 0.55, y: -0.5 }]];
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = Math.min(1, u);
  for (const [w, c] of [[0.3, PAPER], [0.16, kind === 'cross' ? RED : GREEN]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = s * w;
    for (const line of strokes) {
      ctx.beginPath();
      line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * s, p.y * s) : ctx.lineTo(p.x * s, p.y * s)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A double-headed measuring arrow between two points, with end ticks. */
export function drawMeasure(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, alpha: number): void {
  if (alpha <= 0) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 22;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[12, PAPER], [5, ORANGE]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    for (const [p, s] of [[a, 1], [b, -1]] as const) {
      ctx.moveTo(p.x + s * (ux * head - uy * head * 0.6), p.y + s * (uy * head + ux * head * 0.6));
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + s * (ux * head + uy * head * 0.6), p.y + s * (uy * head - ux * head * 0.6));
      ctx.moveTo(p.x - uy * 30, p.y + ux * 30);
      ctx.lineTo(p.x + uy * 30, p.y - ux * 30);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A ring round something, inked in as `u` runs 0 → 1. */
export function drawRing(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, u: number, alpha: number): void {
  if (alpha <= 0 || u <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const [w, c] of [[13, PAPER], [6, ORANGE]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, rx, ry, -0.1, -0.6, -0.6 + Math.PI * 2.1 * smooth(u));
    ctx.stroke();
  }
  ctx.restore();
}

/** A clapperboard: `show` pops it in, `open` lifts the clapstick (0 shut). The film's title in chalk. */
export function drawSlate(ctx: CanvasRenderingContext2D, at: Pt, show: number, open: number): void {
  if (show <= 0) return;
  const w = 290;
  const hgt = 190;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-0.08);
  ctx.scale(0.7 + 0.3 * show, 0.7 + 0.3 * show);
  ctx.globalAlpha = Math.min(1, show * 1.5);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  // The board.
  ctx.fillStyle = SLATE;
  ctx.fillRect(-w / 2, -hgt / 2, w, hgt);
  ctx.strokeRect(-w / 2, -hgt / 2, w, hgt);
  ctx.strokeStyle = 'rgba(244,237,220,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 14, 22);
  ctx.lineTo(w / 2 - 14, 22);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'ALIEN', at.x - 4, at.y + 4, 74, 700, Math.min(1, show * 1.5), { fill: PAPER, halo: SLATE });
  drawTextLine(ctx, '1979', at.x, at.y + 78, 46, 700, Math.min(1, show * 1.5), { fill: PAPER, halo: SLATE });
  // The clapstick, hinged at its left end, and the striped strip it claps onto.
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-0.08);
  ctx.scale(0.7 + 0.3 * show, 0.7 + 0.3 * show);
  ctx.globalAlpha = Math.min(1, show * 1.5);
  const stick = (y: number, angle: number): void => {
    ctx.save();
    ctx.translate(-w / 2, y);
    ctx.rotate(angle);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, -36, w, 36);
    ctx.fillStyle = SLATE;
    for (let x = 10; x < w; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 26, 0);
      ctx.lineTo(x + 46, -36);
      ctx.lineTo(x + 20, -36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, -36, w, 36);
    ctx.restore();
  };
  stick(-hgt / 2 + 2, 0);
  stick(-hgt / 2 - 36, -0.5 * open);
  ctx.restore();
}

/** An old film camera on a sketchy body: two reels on top (turning with `spin`), a lens pointing down-left. */
export function drawCamera(ctx: CanvasRenderingContext2D, at: Pt, alpha: number, spin: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#d9cfb6';
  ctx.lineWidth = 6;
  // Reels.
  for (const [x, r] of [[-50, 52], [52, 46]] as const) {
    ctx.beginPath();
    ctx.arc(x, -78, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      const a = spin + (k * 2 * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.5, -78 + Math.sin(a) * r * 0.5, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
  }
  // Body.
  ctx.fillStyle = '#4a4650';
  ctx.beginPath();
  ctx.roundRect(-100, -30, 190, 110, 12);
  ctx.fill();
  ctx.stroke();
  // Lens, angled down to the left.
  ctx.save();
  ctx.translate(-100, 30);
  ctx.rotate(0.45);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-62, -36);
  ctx.lineTo(-62, 36);
  ctx.lineTo(0, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fc6e8';
  ctx.beginPath();
  ctx.ellipse(-62, 0, 9, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Corner brackets of a viewfinder round a box, with a blinking "REC ●". */
export function drawViewfinder(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, alpha: number, blink: number): void {
  if (alpha <= 0) return;
  const arm = 60;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[13, PAPER], [6, INK]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]] as const) {
      ctx.moveTo(x + sx * arm, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * arm);
    }
    ctx.stroke();
  }
  ctx.fillStyle = RED;
  ctx.globalAlpha = alpha * blink;
  ctx.beginPath();
  ctx.arc(x0 + 44, y0 + 46, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'REC', x0 + 108, y0 + 62, 50, 700, alpha, { fill: RED, halo: PAPER });
}

/** The "2007" rubber stamp: slammed down (`slam` 0 → 1 shrinks it onto the page), slightly askew. */
export function drawStamp(ctx: CanvasRenderingContext2D, at: Pt, text: string, alpha: number, slam: number): void {
  if (alpha <= 0) return;
  const scale = 1 + 0.9 * (1 - slam);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-0.12);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha * (0.4 + 0.6 * slam);
  ctx.font = `700 150px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + 60;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -105, w, 150, 18);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 12, -93, w - 24, 126, 12);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 20);
  ctx.restore();
}
