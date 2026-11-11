import { createRng } from '../../../src/logic/rng';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { Pen } from '../../../src/art/pen';
import { drawHeadOn, drawTongue } from '../cobra/lay';
import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import { BURM_SNOUT } from './burmeseHead';
import type { Cast } from './cast';
import { drawCta } from './cta';
import { drawHook } from './hook';
import { coilOf, drawCoil } from './lay';
import { irisAt, plateLook, tongueAt } from './story';

/**
 * "So next time you can't finish dinner, remember:": a wooden table out on
 * the bank at dusk, a half-finished plate of spaghetti with the fork left in
 * it, and the python coiled up beside it, looking at the plate; the call to
 * action over it; then frame 1 opens out of the python's mouth.
 */
const TABLE_Y = 1340;
const PLATE: Pt = { x: 330, y: 1640 };
const COIL = coilOf({ x: 800, y: 1650 }, 170, 44, 2.4, 76, 0.4, -0.94);
const IRIS_AT_PT: Pt = { x: 470, y: 1080 };
const IRIS_R = 1500;

function table(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const g = ctx.createLinearGradient(0, TABLE_Y, 0, VIDEO.height);
  g.addColorStop(0, '#a87848');
  g.addColorStop(0.5, '#8a5c34');
  g.addColorStop(1, '#5a3a20');
  ctx.fillStyle = g;
  ctx.fillRect(0, TABLE_Y, VIDEO.width, VIDEO.height - TABLE_Y);
  for (let y = TABLE_Y + 120; y < VIDEO.height; y += 150 + (y - TABLE_Y) * 0.2) pen.hair([{ x: -10, y }, { x: VIDEO.width + 10, y: y + 4 }], 3, '#3a2412', 0.7);
  const rng = createRng(77);
  for (let i = 0; i < 70; i++) {
    const y = TABLE_Y + rng() * (VIDEO.height - TABLE_Y);
    const x = rng() * VIDEO.width;
    pen.hair([{ x, y }, { x: x + 60 + rng() * 120, y: y + (rng() - 0.5) * 4 }], 1, '#5a3a20', 0.35);
  }
  pen.stroke([{ x: -10, y: TABLE_Y }, { x: VIDEO.width + 10, y: TABLE_Y }], 4, '#20140a', 1, false);
  glaze(ctx, 540, TABLE_Y + 80, 600, 70, 0, '#f6c890', 0.25);
}

function plate(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const { x, y } = PLATE;
  ctx.fillStyle = 'rgba(30,16,6,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 22, 240, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 60, y - 30, 20, x, y, 240);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d8d4ca');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 230, 88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,110,100,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 160, 58, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Half the spaghetti left, its sauce, one meatball, a few peas.
  const rng = createRng(99);
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const sx = x - 20 + (rng() - 0.3) * 150;
    const sy = y - 10 + (rng() - 0.5) * 60;
    ctx.strokeStyle = rng() < 0.5 ? '#e8b850' : '#d89c3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 30, sy - 30 * rng(), sx + 60, sy + 30 * rng(), sx + 40 + rng() * 50, sy + (rng() - 0.5) * 30);
    ctx.stroke();
  }
  pen.fill(Array.from({ length: 20 }, (_, i) => ({ x: x + 30 + Math.cos((i / 20) * Math.PI * 2) * 56 * (0.85 + 0.15 * Math.sin(i * 3)), y: y - 14 + Math.sin((i / 20) * Math.PI * 2) * 24 })), '#b83a24', 0.92);
  glaze(ctx, x + 20, y - 22, 30, 10, 0, '#f07050', 0.6);
  ctx.fillStyle = '#6a3a22';
  ctx.beginPath();
  ctx.arc(x + 44, y - 18, 18, 0, Math.PI * 2);
  ctx.fill();
  glaze(ctx, x + 38, y - 24, 8, 6, 0, '#c08060', 0.8);
  for (const [px, py] of [[x - 120, y + 30], [x - 100, y + 40], [x + 120, y + 30], [x + 140, y + 10]] as const) {
    ctx.fillStyle = '#5a9a3a';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e3a12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // The fork, left in it.
  ctx.save();
  ctx.translate(x - 60, y + 6);
  ctx.rotate(0.35);
  ctx.fillStyle = '#c9ced6';
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-210, -7, 170, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-40, -13, 30, 26, 6);
  ctx.fill();
  ctx.stroke();
  for (const dy of [-10, -3.5, 3.5, 10]) {
    ctx.beginPath();
    ctx.moveTo(-12, dy);
    ctx.lineTo(28, dy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRest(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const pen = new Pen(ctx, 9500 + boil, 0.6);
  ctx.drawImage(cast.restBg, 0, 0);
  table(ctx, pen);
  plate(ctx, pen);
  drawCoil(ctx, cast.burm, boil, COIL, 0.7);
  const lift = 0.5 + 0.25 * plateLook(t);
  drawHeadOn(ctx, cast.head.shut, boil, COIL.head, lift);
  drawTongue(ctx, COIL.head, BURM_SNOUT.x, lift, tongueAt(t));
  drawCta(ctx, cast.game, t, boil);
  drawIris(ctx, cast, t, boil);
}

/** Frame 1 opening out of the last shot in a widening circle, its edge inked. */
function drawIris(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = irisAt(t);
  if (k <= 0) return;
  if (k >= 1) return drawHook(ctx, cast, t, boil);
  const r = IRIS_R * k * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(IRIS_AT_PT.x, IRIS_AT_PT.y, r, 0, Math.PI * 2);
  ctx.clip();
  drawHook(ctx, cast, t, boil);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#1a120a';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(IRIS_AT_PT.x, IRIS_AT_PT.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
