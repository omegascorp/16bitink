import { INK, PAPER, RED } from '../../../src/art/palette';
import { clamp01, smooth, window01 } from '../short';
import { drawSprite, type Pt, type Sprite } from '../sprites';
import { card, GOLD, write } from './hud';

/**
 * The cards over the meal shots: the two-pan balance (snake against meal),
 * the tape measure across the jaws, the ghost of a bigger deer, the
 * beating heart, the "ha ha" that gets crossed out. Pen on paper.
 */

const LINE = '#2b2418';

export interface Balance {
  readonly from: number;
  readonly to: number;
  readonly left: string;
  readonly leftAt: number;
  readonly right: string;
  readonly rightAt: number;
  /** +1 tips to the right (the meal), -1 to the left (the snake). */
  readonly tips: number;
  readonly share: string;
}

function pan(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 110);
  ctx.lineTo(x - 80, y);
  ctx.moveTo(x, y - 110);
  ctx.lineTo(x + 80, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 95, y);
  ctx.quadraticCurveTo(x, y + 50, x + 95, y);
  ctx.closePath();
  ctx.fillStyle = '#c9a56e';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const [a, b] = text.split('\n');
  write(ctx, a!, x, y - 50, 38, { alpha });
  write(ctx, b ?? '', x, y - 12, 44, { alpha });
}

/** The balance on the right: the snake's pan, then the meal's, and it tips (with a clunk). */
export function drawBalance(ctx: CanvasRenderingContext2D, b: Balance, t: number): void {
  const a = window01(t, b.from, b.to, 0.3);
  if (a <= 0) return;
  const x = 1560;
  const y = 330;
  card(ctx, x - 300, y - 150, 600, 520, a, 0.01);
  ctx.save();
  ctx.globalAlpha = a;
  const right = smooth((t - b.rightAt) / 0.5);
  // Settles with a wobble after tipping.
  const wob = right > 0 ? Math.exp(-(t - b.rightAt - 0.5) * 3) * Math.sin((t - b.rightAt) * 14) * 0.05 * right : 0;
  const tilt = (1 - right) * -0.22 + right * b.tips * 0.16 + wob;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + 330);
  ctx.lineTo(x, y - 20);
  ctx.moveTo(x - 70, y + 330);
  ctx.lineTo(x + 70, y + 330);
  ctx.stroke();
  const ends = [-1, 1].map((sx) => ({ x: x + Math.cos(tilt) * 200 * sx, y: y - 20 + Math.sin(tilt) * 200 * sx }));
  ctx.beginPath();
  ctx.moveTo(ends[0]!.x, ends[0]!.y);
  ctx.lineTo(ends[1]!.x, ends[1]!.y);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x, y - 20, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  pan(ctx, ends[0]!.x, ends[0]!.y + 130, b.left, a * smooth((t - b.leftAt) / 0.3));
  pan(ctx, ends[1]!.x, ends[1]!.y + 130, b.right, a * right);
  const u = smooth((t - b.rightAt - 0.6) / 0.3);
  write(ctx, b.share, x, y + 300, 74, { alpha: a * u, fill: RED });
  write(ctx, 'meal ÷ snake', x, y + 345, 34, { alpha: a * u, weight: 500 });
}

/** A yellow tape measure laid across the jaws at `at`, `w` px wide, turned `angle`. */
export function drawTape(ctx: CanvasRenderingContext2D, at: Pt, angle: number, w: number, show: number, text: string): void {
  if (show <= 0) return;
  const len = w * smooth(show);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#e9c43a';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.fillRect(-w / 2, -14, len, 28);
  ctx.strokeRect(-w / 2, -14, len, 28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i * 10 < len; i++) {
    const x = -w / 2 + i * 10;
    ctx.moveTo(x, -14);
    ctx.lineTo(x, i % 5 ? -6 : 2);
  }
  ctx.stroke();
  ctx.restore();
  const tip = { x: at.x + Math.cos(angle) * 0, y: at.y };
  write(ctx, text, tip.x, tip.y - w / 2 - 40, 64, { alpha: clamp01((show - 0.6) * 3), fill: INK });
}

/** The ghost of a bigger meal round the lump, swelling, with its weight. */
export function drawGhost(ctx: CanvasRenderingContext2D, rim: Sprite, ghost: Sprite, at: Pt, angle: number, scale: number, boil: number, grow: number, alpha: number, text: string): void {
  if (alpha <= 0) return;
  const k = scale * (1 + 0.28 * smooth(grow));
  drawSprite(ctx, ghost, boil, { x: at.x, y: at.y, scale: k, rotation: angle, alpha: alpha * 0.25 });
  drawSprite(ctx, rim, boil, { x: at.x, y: at.y, scale: k, rotation: angle, alpha });
  write(ctx, text, at.x, at.y - 190, 90, { alpha: alpha * smooth(grow * 1.4), fill: RED });
}

/** A heart shape centred on (0, 0), `r` across. */
function heartPath(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(-r * 1.3, r * 0.1, -r * 0.95, -r * 1.05, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.95, -r * 1.05, r * 1.3, r * 0.1, 0, r * 0.95);
  ctx.closePath();
}

/** The heart beats at this rate (for the heartbeat sound). */
export const BEAT_S = 0.95;

/** The python's heart, beating and swelling by 40% from `growFrom`. */
export function drawHeart(ctx: CanvasRenderingContext2D, t: number, from: number, growFrom: number, to: number): void {
  const a = window01(t, from, to, 0.3);
  if (a <= 0) return;
  const x = 1560;
  const y = 470;
  card(ctx, x - 300, y - 290, 600, 600, a, -0.012);
  const grow = 1 + 0.4 * smooth((t - growFrom) / 1.0);
  const ph = ((t - from) % BEAT_S) / BEAT_S;
  const beat = 1 + 0.09 * Math.exp(-ph * 9) + 0.05 * Math.exp(-Math.max(0, ph - 0.22) * 12) * (ph > 0.22 ? 1 : 0);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y + 10);
  // The heart before the meal, faint, for scale.
  heartPath(ctx, 110);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.scale(grow * beat, grow * beat);
  heartPath(ctx, 110);
  const g = ctx.createRadialGradient(-30, -30, 10, 0, 0, 140);
  g.addColorStop(0, '#e0705a');
  g.addColorStop(1, '#8e2a22');
  ctx.fillStyle = g;
  ctx.globalAlpha = a * 0.85;
  ctx.fill();
  ctx.globalAlpha = a;
  ctx.lineWidth = 4 / grow;
  ctx.stroke();
  ctx.restore();
  write(ctx, 'heart', x, y - 190, 48, { alpha: a });
  write(ctx, '+40%', x + 150, y + 215, 110, { alpha: a * smooth((t - growFrom) / 0.4), fill: RED, halo: PAPER });
}

/** "ha ha" in the game's hand near the lump, crossed out on "wasn't". */
export function drawHaHa(ctx: CanvasRenderingContext2D, at: Pt, t: number, from: number, cross: number, to: number): void {
  const a = window01(t, from, to, 0.25);
  if (a <= 0) return;
  write(ctx, 'ha ha!', at.x, at.y, 96, { alpha: a, weight: 700 });
  const u = smooth((t - cross) / 0.25);
  if (u <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(at.x - 130, at.y - 20);
  ctx.lineTo(at.x - 130 + 260 * u, at.y - 40 + 10 * u);
  ctx.stroke();
  ctx.restore();
}

/** A soft paper flash (on the counter slams and the crack). */
export function flash(ctx: CanvasRenderingContext2D, k: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.35 * k;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
}
