import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { RED, RED_ON_PAPER } from './props';

/**
 * The sketched figures: the lucky cat, the newspaper, the bidder (a generic
 * sushi boss, nobody in particular), the winter morning's lanterns and snow,
 * and the stream of current marks the tuna powers through.
 */

const GOLD = '#e7b43c';
const NEWS = '#f8f3e6';
const COAT = '#fbf8f1';

function outlined(ctx: CanvasRenderingContext2D, fill: string, width = 4): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], width: number): void {
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
}

/** A beckoning lucky cat, `s` px tall, its raised paw waving (`paw` 0 .. 1), holding a gold coin. */
export function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shown: number, paw: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((shown * s) / 200, (shown * s) / 200);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // The raised paw, behind the head, waving from the shoulder.
  ctx.save();
  ctx.translate(-46, -10);
  ctx.rotate(-0.25 - 0.35 * paw);
  ctx.beginPath();
  ctx.roundRect(-18, -92, 36, 96, 18);
  outlined(ctx, PAPER, 4);
  ctx.restore();
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 40, 66, 62, 0, 0, Math.PI * 2);
  outlined(ctx, PAPER, 4);
  // The coin, held to its chest.
  ctx.beginPath();
  ctx.ellipse(18, 48, 26, 36, 0.15, 0, Math.PI * 2);
  outlined(ctx, GOLD, 3);
  line(ctx, [[10, 30], [26, 66]], 2);
  // Head: ears, face, closed happy eyes, nose, whiskers.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 26, -64);
    ctx.lineTo(side * 52, -100);
    ctx.lineTo(side * 58, -52);
    ctx.closePath();
    outlined(ctx, PAPER, 4);
  }
  ctx.beginPath();
  ctx.ellipse(0, -40, 62, 48, 0, 0, Math.PI * 2);
  outlined(ctx, PAPER, 4);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 22, -44, 10, Math.PI * 1.1, Math.PI * 1.9);
    ctx.lineWidth = 4;
    ctx.stroke();
    line(ctx, [[side * 34, -28], [side * 70, -34]], 2);
    line(ctx, [[side * 34, -22], [side * 70, -18]], 2);
  }
  ctx.fillStyle = '#e07a8a';
  ctx.beginPath();
  ctx.arc(0, -30, 5, 0, Math.PI * 2);
  ctx.fill();
  // Collar and bell.
  ctx.beginPath();
  ctx.roundRect(-44, -4, 88, 14, 7);
  outlined(ctx, RED, 3);
  ctx.beginPath();
  ctx.arc(0, 16, 10, 0, Math.PI * 2);
  outlined(ctx, GOLD, 3);
  ctx.restore();
}

/** A front page spinning in: masthead, the headline, a sketch of the tuna (`sketch` draws it at the origin, 160 px long). */
export function drawPaper(
  ctx: CanvasRenderingContext2D, x: number, y: number, spin: number, shown: number, sketch: (c: CanvasRenderingContext2D) => void,
): void {
  if (shown <= 0) return;
  const W = 400;
  const H = 300;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.08 + (1 - spin) * Math.PI * 3);
  ctx.scale(0.2 + 0.8 * spin, 0.2 + 0.8 * spin);
  ctx.globalAlpha = Math.min(1, shown * 1.5);
  ctx.beginPath();
  ctx.rect(-W / 2, -H / 2, W, H);
  outlined(ctx, NEWS, 4);
  drawTextLine(ctx, 'THE DAILY CATCH', 0, -H / 2 + 46, 40, 700, 1);
  ctx.strokeStyle = INK;
  line(ctx, [[-W / 2 + 16, -H / 2 + 60], [W / 2 - 16, -H / 2 + 60]], 3);
  drawTextLine(ctx, '$3.1M TUNA!', 0, -H / 2 + 124, 64, 700, 1, RED_ON_PAPER);
  ctx.save();
  ctx.translate(-80, 62);
  sketch(ctx);
  ctx.restore();
  ctx.globalAlpha *= 0.55;
  for (let k = 0; k < 5; k++) line(ctx, [[30, 22 + k * 22], [W / 2 - 22 - (k % 2) * 30, 22 + k * 22]], 3);
  ctx.restore();
}

/**
 * A generic sushi boss: a round head in a tied white headband, a big grin,
 * a chef's white coat; his right arm lifts a bidding paddle (`raise` 0 .. 1).
 */
export function drawBidder(ctx: CanvasRenderingContext2D, x: number, y: number, shown: number, raise: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(shown, shown);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // The paddle arm, behind him: from his shoulder up and out.
  const a = -0.35 - 1.05 * raise;
  const shoulder = { x: 70, y: 70 };
  const hand = { x: shoulder.x + Math.cos(a) * 120, y: shoulder.y + Math.sin(a) * 120 };
  ctx.lineWidth = 34;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.lineWidth = 26;
  ctx.strokeStyle = COAT;
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(a + Math.PI / 2 + 0.2);
  ctx.beginPath();
  ctx.rect(-7, -70, 14, 80);
  outlined(ctx, '#b0703c', 3);
  ctx.beginPath();
  ctx.arc(0, -110, 50, 0, Math.PI * 2);
  outlined(ctx, PAPER, 4);
  drawTextLine(ctx, '88', 0, -92, 56, 700, 1, RED_ON_PAPER);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 18, 0, Math.PI * 2);
  outlined(ctx, '#f2d2b0', 3);
  // The coat: shoulders and a crossed collar.
  ctx.beginPath();
  ctx.moveTo(-110, 190);
  ctx.quadraticCurveTo(-110, 60, 0, 52);
  ctx.quadraticCurveTo(110, 60, 110, 190);
  ctx.closePath();
  outlined(ctx, COAT, 4);
  line(ctx, [[-34, 56], [22, 140]], 3);
  line(ctx, [[34, 56], [-6, 110]], 3);
  // Head, headband with its knot, face.
  ctx.beginPath();
  ctx.ellipse(0, -10, 62, 70, 0, 0, Math.PI * 2);
  outlined(ctx, '#f2d2b0', 4);
  ctx.beginPath();
  ctx.moveTo(-62, -36);
  ctx.quadraticCurveTo(0, -54, 62, -36);
  ctx.lineTo(62, -14);
  ctx.quadraticCurveTo(0, -32, -62, -14);
  ctx.closePath();
  outlined(ctx, COAT, 3);
  ctx.beginPath();
  ctx.moveTo(-58, -30);
  ctx.lineTo(-92, -56);
  ctx.lineTo(-88, -22);
  ctx.closePath();
  outlined(ctx, COAT, 3);
  for (const side of [-1, 1]) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(side * 22, 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, [[side * 32, -12], [side * 12, -8]], 4);
  }
  ctx.beginPath();
  ctx.moveTo(-28, 26);
  ctx.quadraticCurveTo(0, 54 + 6 * raise, 28, 26);
  ctx.closePath();
  outlined(ctx, '#ffffff', 3);
  ctx.restore();
}

/** A bid called out, in a speech bubble. */
export function drawCall(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, shown: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(shown, shown);
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 58, 0, 0, Math.PI * 2);
  ctx.moveTo(-70, 40);
  ctx.lineTo(-110, 84);
  ctx.lineTo(-30, 52);
  outlined(ctx, PAPER, 4);
  ctx.restore();
  drawTextLine(ctx, text, x, y + 20 * shown, 58 * shown, 700, 1, RED_ON_PAPER);
}

// ---------------------------------------------------------------- the winter morning

const LANTERN_XS = [110, 330, 550, 770, 990];
const ROPE_Y = 286;

/** A string of paper lanterns across the top, sliding down into view (`w` 0 .. 1) and swinging (`t` loops over `loopS`). */
export function drawLanterns(ctx: CanvasRenderingContext2D, t: number, loopS: number, w: number): void {
  if (w <= 0) return;
  const drop = -260 * (1 - w);
  const sag = (x: number): number => ROPE_Y + drop + 46 * Math.sin((Math.PI * x) / VIDEO.width);
  ctx.save();
  ctx.globalAlpha = Math.min(1, w * 1.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 20) (x === -20 ? ctx.moveTo(x, sag(x)) : ctx.lineTo(x, sag(x)));
  ctx.stroke();
  LANTERN_XS.forEach((x, k) => {
    const swing = 0.09 * Math.sin((2 * Math.PI * (2 + (k % 2)) * t) / loopS + k * 1.3);
    ctx.save();
    ctx.translate(x, sag(x));
    ctx.rotate(swing);
    ctx.fillStyle = 'rgba(255,190,90,0.22)';
    ctx.beginPath();
    ctx.arc(0, 62, 70, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, [[0, 0], [0, 14]], 3);
    ctx.beginPath();
    ctx.rect(-20, 14, 40, 10);
    outlined(ctx, INK, 2);
    ctx.beginPath();
    ctx.ellipse(0, 62, 42, 40, 0, 0, Math.PI * 2);
    outlined(ctx, RED, 3);
    ctx.globalAlpha *= 0.6;
    for (const rx of [-22, 0, 22]) {
      ctx.beginPath();
      ctx.ellipse(0, 62, Math.abs(rx) + 2, 39, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha /= 0.6;
    ctx.beginPath();
    ctx.rect(-20, 100, 40, 10);
    outlined(ctx, INK, 2);
    line(ctx, [[0, 110], [0, 140]], 3);
    ctx.restore();
  });
  ctx.restore();
}

interface Flake { readonly x: number; readonly y: number; readonly r: number; readonly falls: number; readonly phase: number }

const FLAKES: readonly Flake[] = (() => {
  const rng = createRng(1905);
  return Array.from({ length: 46 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 7 + rng() * 9, falls: 1 + Math.floor(rng() * 2), phase: rng() * 6.3 }));
})();

/** Snowflakes drifting down through the frame (each falls the frame's height a whole number of times a loop), and a cold wash. */
export function drawSnow(ctx: CanvasRenderingContext2D, t: number, loopS: number, w: number): void {
  if (w <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(150,185,225,${0.22 * w})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (const f of FLAKES) {
    const span = VIDEO.height + 60;
    const y = ((f.y + (f.falls * span * t) / loopS) % span) - 30;
    const x = f.x + 24 * Math.sin((2 * Math.PI * 3 * t) / loopS + f.phase);
    ctx.globalAlpha = 0.45 * w;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3 + f.phase;
      ctx.moveTo(x - Math.cos(a) * f.r, y - Math.sin(a) * f.r);
      ctx.lineTo(x + Math.cos(a) * f.r, y + Math.sin(a) * f.r);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the stream

interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly laps: number }

export const MARKS: readonly Mark[] = (() => {
  const rng = createRng(278);
  return Array.from({ length: 34 }, () => ({ x: rng(), y: 280 + rng() * 1000, size: 0.6 + rng() * 0.9, wave: rng() < 0.7, laps: 3 + Math.floor(rng() * 3) }));
})();

/** The sea streaming past to the right as the tuna powers left: "~" marks and specks, each lapping the frame a whole number of times a loop. */
export function drawStream(ctx: CanvasRenderingContext2D, t: number, loopS: number): void {
  const span = VIDEO.width + 240;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const m of MARKS) {
    const x = ((m.x * span + (m.laps * span * t) / loopS) % span) - 120;
    const len = 70 * m.size;
    ctx.globalAlpha = m.wave ? 0.22 : 0.28;
    if (!m.wave) {
      ctx.beginPath();
      ctx.arc(x, m.y, Math.max(1.5, len * 0.035), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = m.y + Math.sin(k * 1.4 + m.y) * len * 0.06;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
