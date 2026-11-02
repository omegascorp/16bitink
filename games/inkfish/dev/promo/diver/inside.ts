import { Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp, ramp, VIDEO } from '../short';
import { INSIDE, NO_AT, TEETH_AT, torchAt, wrap } from './story';

/**
 * Inside the humpback's mouth, in the dark: its roof ridged, the baleen
 * hanging in a long curtain, the tongue's pink folds below. Only the diver's
 * torch lights it, a cone swung nervously about until it settles on the
 * plates: no teeth. Drawn lit, then the dark laid over it with the beam cut out.
 */

const DARK = '#030605';
const ORIGIN: Pt = { x: 470, y: 1560 };

const PLATES = (() => {
  const rng = createRng(1964);
  const row = (n: number, y0: number, far: number) =>
    Array.from({ length: n }, (_, i) => ({
      x: -20 + (i / (n - 1)) * 1120 + (rng() - 0.5) * 10,
      len: (560 + 120 * Math.sin(Math.PI * (i / (n - 1)))) * far + rng() * 60,
      lean: -26 + rng() * 22,
      w: (26 + rng() * 12) * far,
      y0,
      far,
    }));
  return [...row(26, 300, 0.8), ...row(24, 330, 1)];
})();

/** Where the torch points: swinging about, then still on the baleen once "teeth" is said. */
export function aimAt(t: number): Pt {
  const u = wrap(t);
  const swing = 1 - ramp(u, NO_AT - 0.1, TEETH_AT + 0.1);
  const k = u - INSIDE.from;
  return { x: 540 + 300 * swing * Math.sin(k * 2.6) + 40 * Math.sin(k * 9), y: lerp(900, 880, 1 - swing) - 160 * swing * Math.sin(k * 1.7 + 1) };
}

function drawScene(ctx: CanvasRenderingContext2D, pen: Pen, t: number): void {
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The roof: ridged and wet.
  const roof = ctx.createLinearGradient(0, 0, 0, 380);
  roof.addColorStop(0, '#3a1b20');
  roof.addColorStop(1, '#6a3a3c');
  ctx.fillStyle = roof;
  ctx.fillRect(0, 0, VIDEO.width, 340);
  for (let i = 0; i < 12; i++) pen.hair([{ x: -10, y: 20 + i * 28 }, { x: 540, y: 10 + i * 28 + 8 * Math.sin(i) }, { x: 1090, y: 22 + i * 28 }], 3, '#1c0b0e', 0.7);
  // The baleen: far row, then near, each plate a dark blade fringed at its tip and edges.
  for (const p of PLATES) {
    const top = { x: p.x, y: p.y0 };
    const tip = { x: p.x + p.lean, y: p.y0 + p.len };
    const plate = [{ x: top.x - p.w / 2, y: top.y }, { x: top.x + p.w / 2, y: top.y }, { x: tip.x + p.w * 0.25, y: tip.y }, { x: tip.x - p.w * 0.25, y: tip.y - 10 }];
    pen.fill(plate, p.far < 1 ? '#2a211b' : '#3a2c22', 1);
    pen.hair([{ x: top.x - p.w * 0.1, y: top.y + 20 }, { x: tip.x, y: tip.y - 20 }], 2, '#6c5a46', 0.7);
    pen.hair([{ x: top.x + p.w / 2, y: top.y }, { x: tip.x + p.w * 0.25, y: tip.y }], 2.2, '#b09a76', 0.7);
    for (let k = -2; k <= 2; k++) pen.hair([{ x: tip.x + k * 3, y: tip.y - 60 }, { x: tip.x + k * 6 + p.lean * 0.2, y: tip.y + 30 }], 1.6, '#c8b48e', 0.7);
    pen.closed(plate, 1.8, '#0a0807');
  }
  // The tongue below, in folds, and the pool in the throat.
  const tongue = ctx.createLinearGradient(0, 1300, 0, VIDEO.height);
  tongue.addColorStop(0, '#7a4547');
  tongue.addColorStop(1, '#3b1f22');
  ctx.fillStyle = tongue;
  ctx.fillRect(0, 1320, VIDEO.width, 700);
  for (let i = 0; i < 6; i++) pen.hair([{ x: -20, y: 1340 + i * 60 }, { x: 540, y: 1320 + i * 60 + 10 * Math.sin(i) }, { x: 1100, y: 1344 + i * 60 }], 4, '#c98f8a', 0.45);
  pen.stroke([{ x: -20, y: 1322 }, { x: 540, y: 1308 }, { x: 1100, y: 1324 }], 4, '#a8d0c8', 0.5, false);
  // A drip off a plate.
  const drip = ((t / 1.05) % 1);
  ctx.fillStyle = 'rgba(190,220,215,0.8)';
  ctx.beginPath();
  ctx.ellipse(700, 760 + drip * 520, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The hand and torch at the bottom, the beam's origin. */
function drawTorchHand(ctx: CanvasRenderingContext2D, pen: Pen, aim: Pt): void {
  const a = Math.atan2(aim.y - ORIGIN.y, aim.x - ORIGIN.x);
  ctx.save();
  ctx.translate(ORIGIN.x, ORIGIN.y);
  ctx.rotate(a);
  const body = [{ x: -90, y: -26 }, { x: 40, y: -32 }, { x: 40, y: 32 }, { x: -90, y: 26 }];
  pen.fill(body, '#2a3138', 1);
  pen.closed(body, 3, '#0a0d10');
  const head = [{ x: 40, y: -44 }, { x: 70, y: -54 }, { x: 70, y: 54 }, { x: 40, y: 44 }];
  pen.fill(head, '#fff3b8', 1);
  pen.closed(head, 3, '#0a0d10');
  // The glove round it.
  pen.dot(-60, 0, 44, '#1a2128', 1);
  pen.circle(-60, 0, 44, 3, '#0a0d10');
  ctx.restore();
}

/**
 * The inside view at `t`, `show` 0 .. 1 over whatever is behind it. `shade` is
 * a scratch canvas of the frame's size for the dark with the beam cut out.
 */
export function drawInside(ctx: CanvasRenderingContext2D, shade: CanvasRenderingContext2D, t: number, show: number, boil: number): void {
  if (show <= 0.005) return;
  const pen = new Pen(ctx, 515 + boil * 977, 1.3);
  const aim = aimAt(t);
  const torch = torchAt(t);
  ctx.save();
  ctx.globalAlpha = show;
  drawScene(ctx, pen, t);
  drawTorchHand(ctx, pen, aim);
  // The dark, with the cone and its pool of light cut out.
  shade.globalCompositeOperation = 'source-over';
  shade.clearRect(0, 0, VIDEO.width, VIDEO.height);
  shade.fillStyle = 'rgba(2,5,4,0.985)';
  shade.fillRect(0, 0, VIDEO.width, VIDEO.height);
  shade.globalCompositeOperation = 'destination-out';
  const dir = { x: aim.x - ORIGIN.x, y: aim.y - ORIGIN.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const d = { x: dir.x / len, y: dir.y / len };
  const n = { x: -d.y, y: d.x };
  const far = 1500;
  const spread = 560;
  const cone = shade.createLinearGradient(ORIGIN.x, ORIGIN.y, ORIGIN.x + d.x * far, ORIGIN.y + d.y * far);
  cone.addColorStop(0, `rgba(0,0,0,${(0.98 * torch).toFixed(3)})`);
  cone.addColorStop(1, `rgba(0,0,0,${(0.6 * torch).toFixed(3)})`);
  shade.fillStyle = cone;
  shade.beginPath();
  shade.moveTo(ORIGIN.x + n.x * 20, ORIGIN.y + n.y * 20);
  shade.lineTo(ORIGIN.x + d.x * far + n.x * spread, ORIGIN.y + d.y * far + n.y * spread);
  shade.lineTo(ORIGIN.x + d.x * far - n.x * spread, ORIGIN.y + d.y * far - n.y * spread);
  shade.lineTo(ORIGIN.x - n.x * 20, ORIGIN.y - n.y * 20);
  shade.closePath();
  shade.fill();
  const pool = shade.createRadialGradient(aim.x, aim.y, 0, aim.x, aim.y, 700);
  pool.addColorStop(0, `rgba(0,0,0,${torch.toFixed(3)})`);
  pool.addColorStop(1, 'rgba(0,0,0,0)');
  shade.fillStyle = pool;
  shade.fillRect(aim.x - 700, aim.y - 700, 1400, 1400);
  shade.globalCompositeOperation = 'source-over';
  ctx.drawImage(shade.canvas, 0, 0);
  // The beam's haze, and a yellow bloom at the lens.
  ctx.globalCompositeOperation = 'lighter';
  const haze = ctx.createLinearGradient(ORIGIN.x, ORIGIN.y, aim.x, aim.y);
  haze.addColorStop(0, `rgba(255,236,160,${(0.2 * torch).toFixed(3)})`);
  haze.addColorStop(1, 'rgba(255,236,160,0)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.moveTo(ORIGIN.x + n.x * 20, ORIGIN.y + n.y * 20);
  ctx.lineTo(aim.x + n.x * 330, aim.y + n.y * 330);
  ctx.lineTo(aim.x - n.x * 330, aim.y - n.y * 330);
  ctx.lineTo(ORIGIN.x - n.x * 20, ORIGIN.y - n.y * 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
