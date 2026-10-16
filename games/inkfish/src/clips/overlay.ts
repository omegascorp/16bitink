import type { ClipCard } from '../logic/clips/card';
import { BLUE_INK, HAND_FONT, RED_INK } from '../scenes/ui';

type Ctx = OffscreenCanvasRenderingContext2D;

const PAPER = '#f4eddc';
const INK = '#2b2822';
const GREY_INK = '#5b5446';

/** Splits text into lines no wider than `width` at the context's current font. */
function wrap(ctx: Ctx, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(tryLine).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  return line ? [...lines, line] : lines;
}

/** Text outlined in paper, so it reads over any part of the sea. */
function inkText(ctx: Ctx, text: string, x: number, y: number, size: number, color: string): void {
  ctx.font = `700 ${size}px ${HAND_FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = PAPER;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** The game's name (and address, off portals) along the bottom of every frame. */
export function drawFooter(ctx: Ctx, footer: string, w: number, h: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  inkText(ctx, footer, w / 2, h - 54, 46, BLUE_INK);
  ctx.restore();
}

/** A slightly wobbly pen rectangle: drawn by hand, like the rest of the game. */
function penBox(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const wobble = (i: number): number => Math.sin(i * 12.9898) * 3;
  ctx.beginPath();
  ctx.moveTo(x + wobble(1), y + wobble(2));
  ctx.lineTo(x + w + wobble(3), y + wobble(4));
  ctx.lineTo(x + w + wobble(5), y + h + wobble(6));
  ctx.lineTo(x + wobble(7), y + h + wobble(8));
  ctx.closePath();
}

/**
 * The card written over the held frame: an obituary for a lost level, a
 * cheer for a won one. `p` runs 0..1 over the hold; the card fades in at the start.
 */
export function drawCard(ctx: Ctx, card: ClipCard, won: boolean, p: number, w: number, h: number): void {
  const fade = Math.min(1, p / 0.18);
  const boxW = w * 0.86;
  const lineSize = 40;
  const titleSize = 72;
  ctx.save();
  ctx.font = `700 ${lineSize}px ${HAND_FONT}`;
  const lines = card.lines.flatMap((l) => wrap(ctx, l, boxW - 70));
  ctx.font = `700 ${titleSize}px ${HAND_FONT}`;
  const titles = wrap(ctx, card.title, boxW - 60);
  const boxH = 70 + titles.length * titleSize * 1.05 + lines.length * lineSize * 1.25;
  const x = (w - boxW) / 2;
  const y = h * 0.4 - boxH / 2;
  // Settles into place as it fades in.
  ctx.translate(0, (1 - fade) * 30);
  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(244, 237, 220, 0.93)';
  penBox(ctx, x, y, boxW, boxH);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let ty = y + 34;
  for (const t of titles) {
    inkText(ctx, t, w / 2, ty, titleSize, won ? BLUE_INK : RED_INK);
    ty += titleSize * 1.05;
  }
  ty += 10;
  lines.forEach((l, i) => {
    inkText(ctx, l, w / 2, ty, lineSize, i === lines.length - 1 ? GREY_INK : INK);
    ty += lineSize * 1.25;
  });
  ctx.restore();
}

/**
 * Winding back to the start: the still washes pale while pen strokes sweep
 * across it, right to left, like a page being scribbled over. `p` runs 0..1.
 */
export function drawRewind(ctx: Ctx, p: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = `rgba(244, 237, 220, ${0.55 * p})`;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const reach = w * (1.15 - p * 1.3);
  ctx.beginPath();
  for (let row = 0; row < 7; row++) {
    const y = h * (0.12 + row * 0.12);
    ctx.moveTo(w + 20, y);
    for (let i = 1; w + 20 - i * 23 > reach; i++) ctx.lineTo(w + 20 - i * 23, y + (i % 2 ? 13 : -13));
  }
  ctx.globalAlpha = 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  inkText(ctx, 'earlier…', w / 2, h * 0.45, 84, INK);
  ctx.restore();
}
