import { INK } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { VIDEO } from '../../short';

/**
 * The naturalist's work table across the foot of the "ten fingers" frame, so he
 * is framed from the waist up: dark oak lit from the lamp above, an open tally
 * book with its five-bar gates, a pen and an ink bottle.
 */

const TOP_Y = 1440;

function wood(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, TOP_Y, 0, VIDEO.height);
  g.addColorStop(0, '#7a4e2a');
  g.addColorStop(0.16, '#5a3519');
  g.addColorStop(0.18, '#2e1a0c');
  g.addColorStop(1, '#1a0f07');
  ctx.fillStyle = g;
  ctx.fillRect(0, TOP_Y, VIDEO.width, VIDEO.height - TOP_Y);
  const rng = createRng(5);
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const y = TOP_Y + 6 + rng() * 80;
    const x = rng() * VIDEO.width;
    ctx.strokeStyle = rng() < 0.5 ? 'rgba(30,14,4,0.3)' : 'rgba(214,160,104,0.16)';
    ctx.lineWidth = 1 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 80 + rng() * 240, y + rng() * 3);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, TOP_Y);
  ctx.lineTo(VIDEO.width, TOP_Y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(248,214,160,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, TOP_Y + 3);
  ctx.lineTo(VIDEO.width, TOP_Y + 3);
  ctx.stroke();
}

function gate(ctx: CanvasRenderingContext2D, x: number, y: number, n: number): void {
  ctx.beginPath();
  for (let i = 0; i < Math.min(4, n); i++) {
    ctx.moveTo(x + i * 11, y);
    ctx.lineTo(x + i * 11 + 2, y + 32);
  }
  if (n >= 5) {
    ctx.moveTo(x - 6, y + 28);
    ctx.lineTo(x + 40, y + 4);
  }
  ctx.stroke();
}

function book(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(540, 1505);
  ctx.transform(1, 0, -0.12, 0.72, 0, 0);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 120, -18, s * 250, -6);
    ctx.lineTo(s * 262, 126);
    ctx.quadraticCurveTo(s * 120, 112, 0, 132);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, s * 260, 0);
    g.addColorStop(0, '#c9b78e');
    g.addColorStop(0.2, '#f1e7cc');
    g.addColorStop(1, '#e9dcbc');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a2230';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) gate(ctx, -226 + i * 66, 16, 5);
  for (let i = 0; i < 3; i++) gate(ctx, 28 + i * 66, 16, i === 2 ? 4 : 5);
  for (let i = 0; i < 2; i++) gate(ctx, -226 + i * 66, 66, 5);
  ctx.restore();
}

function inkBottle(ctx: CanvasRenderingContext2D): void {
  const [x, y] = [905, 1500];
  ctx.beginPath();
  ctx.roundRect(x - 44, y - 56, 88, 74, 12);
  const g = ctx.createLinearGradient(x - 44, 0, x + 44, 0);
  g.addColorStop(0, '#39415a');
  g.addColorStop(0.3, '#11141e');
  g.addColorStop(1, '#06070c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#20242f';
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 78, 44, 26, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214,226,240,0.6)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 42);
  ctx.lineTo(x - 30, y - 8);
  ctx.stroke();
}

export function makeDesk(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = VIDEO.width;
  c.height = VIDEO.height;
  const ctx = c.getContext('2d')!;
  wood(ctx);
  book(ctx);
  inkBottle(ctx);
  return c;
}
