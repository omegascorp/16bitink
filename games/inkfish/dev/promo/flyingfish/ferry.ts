import { INK, PAPER } from '../../../src/art/pen';
import { FERRY_LEN, FERRY_SCALE } from './hunters';

/**
 * The ferry the Japanese TV crew filmed the record from: a little white
 * ferry in pen, the Japanese flag at its stern, and a cameraman on the top
 * deck with a TV camera on his shoulder, turning to follow the fish.
 */

const HULL = '#fbf7ee';
const STRIPE = '#2f68ad';
const RED = '#d23c2f';

export interface FerryLook {
  readonly x: number;
  readonly y: number;
  readonly roll: number;
  /** Where the camera is pointed (screen px), and how much of it shows (0 .. 1). */
  readonly aim: { readonly x: number; readonly y: number };
  readonly camera: number;
  /** The flag's flutter phase. */
  readonly t: number;
}

const L = FERRY_LEN / 2;

/** Where the cameraman's lens is, relative to the ferry's waterline centre (before roll). */
export const LENS = { x: -L * 0.42, y: -142 } as const;

function strokeFill(ctx: CanvasRenderingContext2D, fill: string, width = 3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawHull(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-L, -44);
  ctx.lineTo(L * 0.82, -44);
  ctx.quadraticCurveTo(L * 1.02, -50, L * 1.08, -56);
  ctx.quadraticCurveTo(L * 0.98, 4, L * 0.7, 26);
  ctx.lineTo(-L * 0.92, 26);
  ctx.quadraticCurveTo(-L * 1.02, 0, -L, -44);
  ctx.closePath();
  strokeFill(ctx, HULL);
  // A blue stripe along the hull, and portholes.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = STRIPE;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(-L * 1.1, -6, L * 2.3, 12);
  ctx.restore();
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(-L * 0.78 + i * L * 0.19, -24, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDecks(ctx: CanvasRenderingContext2D): void {
  // Lower cabin, with a row of windows.
  ctx.beginPath();
  ctx.rect(-L * 0.72, -96, L * 1.3, 52);
  strokeFill(ctx, HULL);
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.rect(-L * 0.64 + i * L * 0.15, -84, L * 0.09, 18);
    ctx.fillStyle = 'rgba(70,120,165,0.35)';
    ctx.fill();
    ctx.stroke();
  }
  // Bridge, its windows raked, and the funnel.
  ctx.beginPath();
  ctx.moveTo(-L * 0.1, -96);
  ctx.lineTo(-L * 0.1, -140);
  ctx.lineTo(L * 0.42, -140);
  ctx.lineTo(L * 0.5, -96);
  ctx.closePath();
  strokeFill(ctx, HULL);
  ctx.beginPath();
  ctx.moveTo(L * 0.05, -126);
  ctx.lineTo(L * 0.42, -126);
  ctx.lineTo(L * 0.45, -112);
  ctx.lineTo(L * 0.05, -112);
  ctx.closePath();
  ctx.fillStyle = 'rgba(70,120,165,0.45)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-L * 0.02, -140);
  ctx.lineTo(-L * 0.04, -178);
  ctx.lineTo(L * 0.16, -178);
  ctx.lineTo(L * 0.14, -140);
  ctx.closePath();
  strokeFill(ctx, HULL);
  ctx.fillStyle = RED;
  ctx.fillRect(-L * 0.035, -172, L * 0.19, 9);
  // Railing along the top of the lower cabin.
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-L * 0.72, -112);
  ctx.lineTo(-L * 0.1, -112);
  for (let i = 0; i <= 6; i++) {
    const x = -L * 0.72 + i * L * 0.1;
    ctx.moveTo(x, -96);
    ctx.lineTo(x, -112);
  }
  ctx.stroke();
}

/** The Japanese flag on a staff at the stern, fluttering. */
function drawFlag(ctx: CanvasRenderingContext2D, t: number): void {
  const x0 = -L * 0.95;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, -44);
  ctx.lineTo(x0, -150);
  ctx.stroke();
  const w = 66;
  const h = 44;
  const wave = (u: number): number => 4 * Math.sin(2 * Math.PI * (u * 1.2 - t * 1.6)) * u;
  ctx.beginPath();
  ctx.moveTo(x0, -150);
  for (let i = 1; i <= 8; i++) ctx.lineTo(x0 - (w * i) / 8, -150 + wave(i / 8));
  for (let i = 8; i >= 0; i--) ctx.lineTo(x0 - (w * i) / 8, -150 + h + wave(i / 8));
  ctx.closePath();
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x0 - w / 2, -150 + h / 2 + wave(0.5), 11, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
}

/** The cameraman on the top deck, a shoulder camera aimed at `angle` (screen radians). */
function drawCameraman(ctx: CanvasRenderingContext2D, angle: number, shown: number): void {
  const feet = { x: LENS.x + 22, y: -112 };
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Legs, body, head.
  ctx.beginPath();
  ctx.moveTo(feet.x - 10, feet.y);
  ctx.lineTo(feet.x - 2, feet.y - 26);
  ctx.lineTo(feet.x + 9, feet.y);
  ctx.stroke();
  // His jacket.
  ctx.beginPath();
  ctx.moveTo(feet.x - 10, feet.y - 24);
  ctx.lineTo(feet.x - 12, feet.y - 50);
  ctx.quadraticCurveTo(feet.x - 2, feet.y - 56, feet.x + 8, feet.y - 50);
  ctx.lineTo(feet.x + 6, feet.y - 24);
  ctx.closePath();
  ctx.fillStyle = STRIPE;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(feet.x - 3, feet.y - 62, 9, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.stroke();
  if (shown <= 0) return;
  // The camera on his shoulder, turned to the fish (it can't point back through him).
  const a = Math.max(-Math.PI + 0.35, Math.min(-0.2, angle));
  ctx.save();
  ctx.globalAlpha *= shown;
  ctx.translate(LENS.x, LENS.y + 8);
  ctx.rotate(a + Math.PI);
  ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.rect(-26, -11, 34, 22);
  strokeFill(ctx, '#3a3c44', 2.4);
  ctx.beginPath();
  ctx.rect(8, -7, 18, 14);
  strokeFill(ctx, '#55585f', 2.2);
  ctx.beginPath();
  ctx.arc(-18, -15, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.restore();
  // His arm up to it.
  ctx.beginPath();
  ctx.moveTo(feet.x - 2, feet.y - 46);
  ctx.lineTo(LENS.x + 6, LENS.y + 12);
  ctx.stroke();
}

export function drawFerry(ctx: CanvasRenderingContext2D, f: FerryLook): void {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.roll);
  ctx.scale(FERRY_SCALE, FERRY_SCALE);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawFlag(ctx, f.t);
  drawDecks(ctx);
  drawHull(ctx);
  const lens = lensOf(f.x, f.y);
  drawCameraman(ctx, Math.atan2(f.aim.y - lens.y, f.aim.x - lens.x) - f.roll, f.camera);
  ctx.restore();
}

/** Where the lens is on screen. */
export const lensOf = (x: number, y: number): { readonly x: number; readonly y: number } => ({ x: x + LENS.x * FERRY_SCALE, y: y + (LENS.y + 8) * FERRY_SCALE });
