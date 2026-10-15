import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01 } from '../short';
import type { Pt } from './fish';

/**
 * The auction's props, inked like the game's sketchbook: the price tag, the
 * scale, the bidding paddles, the price board, the gavel, rubber stamps, the
 * "1st" rosette and the planned-vs-paid bars.
 */

export const RED = '#c8352b';
const TAG = '#f1deac';
const WOOD = '#b0703c';
const WOOD_DARK = '#7d4a24';
const GOLD = '#e7b43c';
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER };

function outlined(ctx: CanvasRenderingContext2D, fill: string, width = 4): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A rubber stamp in red ink: comes down big and lands (`shown` 0 .. 1, overshooting a touch as it pops). */
export function drawStamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rot: number, size: number, shown: number): void {
  if (shown <= 0) return;
  const land = clamp01(shown);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(2.2 - 1.2 * land, 2.2 - 1.2 * land);
  ctx.globalAlpha = 0.9 * Math.min(1, land * 2);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + size * 0.6;
  const h = size * 1.05;
  ctx.strokeStyle = RED;
  ctx.lineWidth = size * 0.07;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(-w / 2 + size * 0.1, -h / 2 + size * 0.1, w - size * 0.2, h - size * 0.2);
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.05);
  ctx.restore();
}

/** The price tag: a string from where it is tied (`from`) to the tag, which flutters level-ish at the end. */
export function drawTag(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, rot: number, pop: number, sold: number): void {
  const W = 350;
  const H = 120;
  const HOLE = 26;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x + to.x) / 2 + 14, (from.y + to.y) / 2 + 12, to.x, to.y);
  ctx.stroke();
  ctx.translate(to.x, to.y);
  ctx.rotate(rot);
  ctx.scale(1 + 0.16 * pop, 1 + 0.16 * pop);
  ctx.translate(-HOLE, 0);
  ctx.beginPath();
  ctx.moveTo(0, -H / 2 + 26);
  ctx.lineTo(26, -H / 2);
  ctx.lineTo(W, -H / 2);
  ctx.lineTo(W, H / 2);
  ctx.lineTo(26, H / 2);
  ctx.lineTo(0, H / 2 - 26);
  ctx.closePath();
  outlined(ctx, TAG, 4);
  ctx.beginPath();
  ctx.arc(HOLE, 0, 9, 0, Math.PI * 2);
  outlined(ctx, PAPER, 3);
  drawTextLine(ctx, '$3,100,000', W / 2 + 22, 26, 80, 700, 1, { fill: INK, halo: TAG });
  ctx.restore();
  if (sold > 0) {
    // Stamped over the tag's top edge, clear of the price.
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const at = { x: W * 0.62, y: -H / 2 - 30 };
    drawStamp(ctx, 'SOLD', to.x + c * at.x - s * at.y, to.y + s * at.x + c * at.y, rot - 0.12, 64, sold);
  }
}

/** A spring scale's dial: ticks 0–300 kg round 270°, the needle at `kg`, and the readout as it is said. */
export function drawScale(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, kg: number, text: string, shown: number): void {
  if (shown <= 0) return;
  const angle = (v: number): number => Math.PI * 0.75 + (Math.PI * 1.5 * v) / 300;
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.translate(cx, cy);
  ctx.scale(0.6 + 0.4 * shown, 0.6 + 0.4 * shown);
  // The hook it hangs from.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -r - 34, 20, Math.PI * 0.6, Math.PI * 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  outlined(ctx, PAPER, 6);
  ctx.beginPath();
  ctx.arc(0, 0, r - 14, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let v = 0; v <= 300; v += 25) {
    const a = angle(v);
    const major = v % 100 === 0;
    const r0 = r - (major ? 40 : 30);
    ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * (r - 16), Math.sin(a) * (r - 16));
    ctx.stroke();
    if (major) drawTextLine(ctx, String(v), Math.cos(a) * (r - 62), Math.sin(a) * (r - 62) + 12, 34, 700, 1);
  }
  const a = angle(kg);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-Math.cos(a) * 16, -Math.sin(a) * 16);
  ctx.lineTo(Math.cos(a) * (r - 26), Math.sin(a) * (r - 26));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  outlined(ctx, RED, 2);
  ctx.restore();
  if (text) drawTextLine(ctx, text, cx + r + 200, cy + 36, 110, 700, shown, RED_ON_PAPER);
}

/** "¥90M": a bid, short, for a paddle. */
const shortYen = (yen: number): string => `¥${Math.round(yen / 100_000) / 10}M`;

/** Where the bidders' hands are: everything of a paddle stays above the caption band (y ≈ 1120–1260). */
export const PADDLE_HAND_Y = 1078;
const PADDLE_R = 60;
const STICK = 52;

/**
 * A bidding paddle shooting up out of a bidder's fist, its bid on it: it
 * grows from the hand (`up` 0 .. 1, overshooting as it pops), so nothing
 * of it ever dips below the hand.
 */
export function drawPaddle(ctx: CanvasRenderingContext2D, x: number, up: number, bid: number, tilt: number): void {
  if (up <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, up * 3);
  ctx.translate(x, PADDLE_HAND_Y);
  ctx.rotate(tilt);
  ctx.scale(up, up);
  ctx.beginPath();
  ctx.rect(-8, -STICK - 4, 16, STICK + 4);
  outlined(ctx, WOOD, 3);
  ctx.translate(0, -STICK - PADDLE_R);
  ctx.beginPath();
  ctx.arc(0, 0, PADDLE_R, 0, Math.PI * 2);
  outlined(ctx, PAPER, 5);
  ctx.beginPath();
  ctx.arc(0, 0, PADDLE_R - 9, 0, Math.PI * 2);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.stroke();
  drawTextLine(ctx, shortYen(bid), 0, 12, bid >= 100_000_000 ? 34 : 40, 700, 1);
  ctx.translate(0, STICK + PADDLE_R);
  // The fist round the handle.
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 16, 0, 0, Math.PI * 2);
  outlined(ctx, '#f2d2b0', 3);
  ctx.restore();
}

/** The gavel, held from off the left edge: `angle` 0 is the strike, its head's face on the block. */
export const GAVEL = { pivot: { x: -60, y: 470 }, handle: 270, block: { x: 210, y: 545 } } as const;

export function drawGavel(ctx: CanvasRenderingContext2D, angle: number, shown: number): void {
  if (shown <= 0) return;
  const { pivot, handle, block } = GAVEL;
  ctx.save();
  ctx.globalAlpha = shown;
  // The sound block.
  ctx.beginPath();
  ctx.ellipse(block.x, block.y + 26, 92, 18, 0, 0, Math.PI * 2);
  outlined(ctx, WOOD_DARK, 4);
  ctx.beginPath();
  ctx.rect(block.x - 92, block.y + 8, 184, 18);
  ctx.fillStyle = WOOD_DARK;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(block.x, block.y + 8, 92, 18, 0, 0, Math.PI * 2);
  outlined(ctx, WOOD, 4);
  // The gavel: a handle out from the pivot, the head across its end.
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(-angle);
  ctx.beginPath();
  ctx.roundRect(0, -11, handle, 22, 10);
  outlined(ctx, WOOD, 4);
  ctx.beginPath();
  ctx.roundRect(handle - 34, -70, 68, 140, 16);
  outlined(ctx, WOOD, 5);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 6;
  for (const y of [-44, 44]) {
    ctx.beginPath();
    ctx.moveTo(handle - 34, y);
    ctx.lineTo(handle + 34, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ink lines bursting up and out from the block as the gavel lands, `u` 0 .. 1. */
export function drawStrike(ctx: CanvasRenderingContext2D, u: number): void {
  if (u < 0 || u > 1) return;
  const { block } = GAVEL;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  ctx.lineWidth = 8 * (1 - 0.6 * u);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    const r0 = 110 + 40 * grow;
    const r1 = r0 + 70 * (k % 2 ? 0.6 : 1) * (1 - u * 0.5);
    ctx.beginPath();
    ctx.moveTo(block.x + Math.cos(a) * r0, block.y + Math.sin(a) * r0 * 0.75);
    ctx.lineTo(block.x + Math.cos(a) * r1, block.y + Math.sin(a) * r1 * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

/** A "1st" rosette pinned on, ribbons and all. */
export function drawRosette(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shown: number, sway: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.scale(shown, shown);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.15, 0);
    ctx.lineTo(side * r * 0.75, r * 1.9);
    ctx.lineTo(side * r * 0.45, r * 1.65);
    ctx.lineTo(side * r * 0.2, r * 1.95);
    ctx.lineTo(side * r * -0.2, 0);
    ctx.closePath();
    outlined(ctx, RED, 3);
  }
  ctx.beginPath();
  for (let k = 0; k <= 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    const rr = k % 2 ? r * 0.86 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  outlined(ctx, GOLD, 3);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  outlined(ctx, PAPER, 3);
  ctx.restore();
  drawTextLine(ctx, '1st', x, y + r * 0.3 * shown, r * 0.85 * shown, 700, 1);
}

/** Paid vs planned: a long bar and a stub, `ring` circling the stub on "fraction" (0 .. 1 over its life). */
export function drawBars(ctx: CanvasRenderingContext2D, shown: number, paid: number, planned: number, plannedShare: number, ring: number): void {
  if (shown <= 0) return;
  const X0 = 110;
  const FULL = 860;
  const rows = [
    { y: 360, label: 'paid', value: '¥333.6M', w: FULL * paid, fill: RED },
    { y: 520, label: 'planned', value: '¥30–50M', w: FULL * plannedShare * planned, fill: '#e9c46a' },
  ];
  ctx.save();
  ctx.globalAlpha = shown;
  for (const row of rows) {
    drawTextLine(ctx, row.label, X0 + 70, row.y - 52, 52, 700, 1);
    if (row.w > 1) {
      ctx.beginPath();
      ctx.roundRect(X0, row.y - 28, row.w, 62, 8);
      outlined(ctx, row.fill, 4);
    }
    if (row.w > 4) drawTextLine(ctx, row.value, Math.min(X0 + row.w + 120, 900), row.y + (row.w > FULL * 0.7 ? -46 : 20), 56, 700, 1, RED_ON_PAPER);
  }
  if (ring >= 0 && ring <= 1) {
    const stub = rows[1]!;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 6;
    ctx.globalAlpha = shown * Math.sin(Math.PI * ring);
    ctx.beginPath();
    ctx.ellipse(X0 + stub.w / 2, stub.y + 3, stub.w / 2 + 40 + 30 * ring, 58 + 14 * ring, -0.04, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
