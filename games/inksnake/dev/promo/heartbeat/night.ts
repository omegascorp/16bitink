import { makeCanvas } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';

/**
 * The dark the boa works in: a deep brown-black wash, warmer towards the
 * middle, with drifts of dead leaves just showing and a faint pen hatch.
 * Plain on purpose: nothing here competes with the snake and the heart.
 */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, colour: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(0, len * 0.42, -len, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,5,6,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.restore();
}

export function paintDark(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#0d090b';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.5, 80, w / 2, h * 0.5, h * 0.62);
  g.addColorStop(0, '#2c1a17');
  g.addColorStop(0.55, '#170f10');
  g.addColorStop(1, '#0a0709');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rng = createRng(9101);
  for (let i = 0; i < 300; i++) {
    const shade = 16 + Math.floor(rng() * 20);
    leaf(ctx, rng() * w, rng() * h, 26 + rng() * 54, rng() * Math.PI, `rgba(${shade + 12},${shade},${shade - 4},${0.2 + rng() * 0.3})`);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.26)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 2400; i++) {
    const x = rng() * w;
    const y = rng() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 16 + rng() * 16, y - 14 - rng() * 14);
    ctx.stroke();
  }
  return canvas;
}

/** Darkness closing in from the frame's edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
  if (alpha <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.2, w / 2, h * 0.5, h * 0.68);
  g.addColorStop(0, 'rgba(6,3,5,0)');
  g.addColorStop(1, `rgba(6,3,5,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, w + 80, h + 80);
}
