import { INK, PAPER, RED } from '../../../src/art/palette';
import { smooth, VIDEO } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { drawDark, zoomAbout } from './boaRig';
import { BULB_W, drawTube } from './bulbArt';
import type { Cast } from './cast';
import { drawVignette } from './night';
import { bulbShown, DEAD_AT, LEFT_AT, pumpAt, pumpOn, SCIENCE_AT } from './story';

/**
 * The experiment, calmly: a dead rat lying still on a cloth under a lamp, eyes
 * closed, and no snake yet. A round window of paper over its chest shows the
 * bulb hidden in it (a drawing's cutaway, nothing cut), its tube running out
 * to a small pump on the table with its switch on.
 */
const RAT: Pt = { x: 520, y: 960 };
const RAT_SCALE = 5.7;
const CHEST: Pt = { x: 410, y: 996 };
const WINDOW_R = 124;
const BULB_PX = 176;
const PUMP: Pt = { x: 800, y: 1352 };

function drawLamp(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(540, 1040, 60, 540, 1040, 640);
  g.addColorStop(0, 'rgba(236,214,170,0.34)');
  g.addColorStop(0.6, 'rgba(200,170,130,0.12)');
  g.addColorStop(1, 'rgba(200,170,130,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-60, 300, VIDEO.width + 120, VIDEO.height);
}

/** The cloth it lies on. */
function drawCloth(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8,5,6,0.4)';
  ctx.beginPath();
  ctx.ellipse(548, 1194, 500, 96, -0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9bda2';
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(540, 1176, 490, 84, -0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,24,16,0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(150 + i * 120, 1128 + (i % 2) * 18);
    ctx.quadraticCurveTo(190 + i * 120, 1176, 150 + i * 128, 1236 - (i % 2) * 14);
    ctx.stroke();
  }
  ctx.restore();
}

/** The cutaway: a window of paper on the chest, inked round, with the bulb inside. */
function drawWindow(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, shown: number): void {
  if (shown <= 0) return;
  const pump = pumpAt(t);
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(CHEST.x, CHEST.y, WINDOW_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  ctx.stroke();
  ctx.setLineDash([]);
  drawTube(ctx, CHEST, [{ x: 500, y: 1100 }, { x: 560, y: 1340 }, { x: PUMP.x - 96, y: PUMP.y }], t, 11);
  drawSprite(ctx, cast.bulb, boil, { x: CHEST.x, y: CHEST.y, rotation: 0.2, scale: (BULB_PX / BULB_W) * (1 + 0.12 * pump) });
  ctx.restore();
}

/** The little switch: a plate and a lever, up for on, over for off, and its lamp. */
export function drawSwitch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, off: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-44, -30, 88, 60, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.rotate(0.62 - 1.24 * off);
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -28);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = off < 0.5 ? '#5f9c4e' : RED;
  ctx.beginPath();
  ctx.arc(-29, -15, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPump(ctx: CanvasRenderingContext2D, t: number, shown: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.fillStyle = '#6d6a64';
  ctx.strokeStyle = '#150c0a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(PUMP.x - 100, PUMP.y - 74, 190, 124, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawSwitch(ctx, PUMP.x - 4, PUMP.y - 14, 1, pumpOn(t) ? 0 : 1, shown);
}

export function drawTableShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const shown = bulbShown(t);
  const p = (t - SCIENCE_AT) / (LEFT_AT - SCIENCE_AT);
  const face = smooth((t - DEAD_AT + 0.1) / 0.6);
  ctx.save();
  drawDark(ctx, cast.dark);
  zoomAbout(ctx, { x: 300, y: 960 }, 1 + 0.05 * p + 0.1 * face);
  drawLamp(ctx);
  drawCloth(ctx);
  drawSprite(ctx, cast.rat.shut, boil, { x: RAT.x, y: RAT.y + 100, scale: RAT_SCALE, rotation: Math.PI + 0.06, flip: -1 });
  drawPump(ctx, t, shown);
  drawWindow(ctx, cast, t, boil, shown);
  ctx.restore();
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.5);
}
