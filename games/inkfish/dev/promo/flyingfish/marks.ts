import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';

/**
 * The notes inked over the flight: the racing stopwatch, the record badge,
 * the TV camera's REC frame, the "fins = wings" note, the 400 m ruler and
 * the hunters' names.
 */

export const ORANGE = '#d9541e';
const REC_RED = '#d23c2f';
/** Ink on paper for the captions; the word being spoken in orange. */
export const SPOKEN: TextInk = { fill: ORANGE, halo: PAPER };
export const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const ORANGE_INK: TextInk = { fill: ORANGE, halo: PAPER };

const TAU = Math.PI * 2;

/** A pen stopwatch: crown, dial, 12 ticks, the hand sweeping round once a minute, and the seconds written in it. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seconds: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Crown and the side button.
  ctx.lineWidth = 4;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.rect(x - 13, y - r - 26, 26, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - r - 10);
  ctx.lineTo(x, y - r);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.75);
  ctx.beginPath();
  ctx.rect(-8, -r - 14, 16, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // The dial.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  // The time gone, washed in orange.
  const sweep = (seconds / 60) * TAU;
  if (sweep > 0) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 0.86, -Math.PI / 2, -Math.PI / 2 + sweep);
    ctx.closePath();
    ctx.fillStyle = 'rgba(217,84,30,0.22)';
    ctx.fill();
  }
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const inner = i % 3 === 0 ? 0.74 : 0.82;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * r * inner, y - Math.cos(a) * r * inner);
    ctx.lineTo(x + Math.sin(a) * r * 0.93, y - Math.cos(a) * r * 0.93);
    ctx.stroke();
  }
  // The hand.
  ctx.lineWidth = 4;
  ctx.strokeStyle = ORANGE;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(sweep) * r * 0.8, y - Math.cos(sweep) * r * 0.8);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, `${Math.floor(seconds)} s`, x - r - 85, y + 24, 76, 700, alpha, seconds >= 45 ? ORANGE_INK : UNSPOKEN);
  // Fast-forward arrows while it races.
  if (seconds > 0 && seconds < 45) drawFastForward(ctx, x - r - 85, y - 52, alpha);
}

function drawFastForward(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = INK;
  for (const dx of [-16, 8]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 12, y - 14);
    ctx.lineTo(x + dx + 12, y);
    ctx.lineTo(x + dx - 12, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** "record: 45 s" and, on "2008", the year and place under it. */
export function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, year: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, 'record: 45 s', x, y, 78, 700, alpha, ORANGE_INK);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 190, y + 14);
  ctx.quadraticCurveTo(x, y + 4, x + 190, y + 12);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'Yakushima, Japan · 2008', x, y + 62, 50, 700, year);
}

/** The TV camera's view: corner brackets round the fish, "● REC" blinking. */
export function drawRecFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, t: number): void {
  if (alpha <= 0) return;
  const corner = 46;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const cx = x + (sx * w) / 2;
    const cy = y + (sy * h) / 2;
    ctx.beginPath();
    ctx.moveTo(cx - sx * corner, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - sy * corner);
    ctx.stroke();
  }
  const blink = Math.floor(t * 2.5) % 2 === 0 ? 1 : 0.25;
  ctx.fillStyle = REC_RED;
  ctx.globalAlpha = alpha * blink;
  ctx.beginPath();
  ctx.arc(x - w / 2 + 30, y - h / 2 + 34, 10, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'REC', x - w / 2 + 78, y - h / 2 + 50, 46, 700, alpha, { fill: REC_RED, halo: PAPER });
}

/** A dashed line of sight from the camera's lens to the fish. */
export function drawSightLine(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.45 * alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/** A hand-drawn arrow from a note to what it names, with an open head. */
export function drawArrow(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, alpha: number, color = ORANGE): void {
  if (alpha <= 0) return;
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const mid = { x: (from.x + to.x) / 2 - Math.sin(a) * 18, y: (from.y + to.y) / 2 + Math.cos(a) * 18 };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
  const end = Math.atan2(to.y - mid.y, to.x - mid.x);
  ctx.moveTo(to.x - Math.cos(end - 0.45) * 24, to.y - Math.sin(end - 0.45) * 24);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(end + 0.45) * 24, to.y - Math.sin(end + 0.45) * 24);
  ctx.stroke();
  ctx.restore();
}

/** "fins", then "= wings" beside it. */
export function drawFinsNote(ctx: CanvasRenderingContext2D, x: number, y: number, fins: number, wings: number): void {
  ctx.save();
  ctx.font = `700 84px ${CAPTION_FONT}`;
  const wFins = ctx.measureText('fins').width;
  const wWings = ctx.measureText(' = wings').width;
  ctx.restore();
  const left = x - (wFins + wWings * Math.min(1, wings * 3)) / 2;
  drawTextLine(ctx, 'fins', left + wFins / 2, y, 84, 700, fins);
  drawTextLine(ctx, '= wings', left + wFins + wWings / 2 + 6, y, 84, 700, wings, ORANGE_INK);
}

/** The ruler along the top: 0 to 400 m, the marker out at `metres`, "400 m" ringed when it gets there. */
export function drawRuler(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, metres: number, alpha: number, ringed: number): void {
  if (alpha <= 0) return;
  const xOf = (m: number): number => x0 + ((x1 - x0) * m) / 400;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  // The bar, and the distance flown along it in orange.
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.rect(x0, y - 9, x1 - x0, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(217,84,30,0.55)';
  ctx.fillRect(x0, y - 9, xOf(metres) - x0, 18);
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y - 9, x1 - x0, 18);
  ctx.lineWidth = 2.4;
  for (let m = 0; m <= 400; m += 25) {
    const big = m % 100 === 0;
    ctx.beginPath();
    ctx.moveTo(xOf(m), y - 9);
    ctx.lineTo(xOf(m), y - 9 - (big ? 20 : 9));
    ctx.stroke();
  }
  // The marker: a pen triangle riding on the bar.
  const mx = xOf(metres);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(mx, y + 12);
  ctx.lineTo(mx - 14, y + 36);
  ctx.lineTo(mx + 14, y + 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (const m of [0, 100, 200, 300]) drawTextLine(ctx, `${m}`, xOf(m), y - 40, 46, 700, alpha * (metres >= m - 1 ? 1 : 0.45));
  drawTextLine(ctx, '400 m', xOf(400) - 20, y - 40, 56, 700, alpha * (metres >= 399 ? 1 : 0.45), metres >= 399 ? ORANGE_INK : UNSPOKEN);
  if (ringed > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * ringed;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(xOf(400) - 20, y - 56, 84 * (0.6 + 0.4 * ringed), 40, -0.06, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/** A small handwritten name beside a creature. */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number, ink: TextInk = UNSPOKEN): void {
  drawTextLine(ctx, text, x, y, 60, 700, alpha, ink);
}
