import { type Draw } from '../../../src/art/kit';
import { LINE } from './bodyArt';

/** A viper's eye, centred at (x, y): a gold iris flecked dark, an upright slit, a catchlight, a lid that can droop. */
export function paintEye(d: Draw, x: number, y: number, r: number, lid: number, look: number, sorrow: number): void {
  const { ctx, } = d.pen;
  // The socket's shade, then the rim of small pale scales.
  ctx.fillStyle = '#1b1410';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.16, r * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  iris.addColorStop(0, '#f6d76a');
  iris.addColorStop(0.55, '#d69a2c');
  iris.addColorStop(0.86, '#8a5a1a');
  iris.addColorStop(1, '#3f2810');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    d.pen.hair([{ x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4 }, { x: x + Math.cos(a) * r * 0.92, y: y + Math.sin(a) * r * 0.92 }], 1, '#6b4412', 0.5);
  }
  const px = x + (look - 0.5) * r * 0.5;
  ctx.fillStyle = '#080604';
  ctx.beginPath();
  ctx.moveTo(px, y - r * 0.9);
  ctx.quadraticCurveTo(px + r * 0.27, y, px, y + r * 0.9);
  ctx.quadraticCurveTo(px - r * 0.27, y, px, y - r * 0.9);
  ctx.fill();
  d.pen.dot(x - r * 0.42, y - r * 0.44, r * 0.2, '#fffbea', 0.97);
  d.pen.dot(x + r * 0.34, y + r * 0.42, r * 0.08, '#fff2c8', 0.7);
  // The lid, drooping and slanting when sad; its edge is the eye's top line.
  if (lid > 0.01) {
    const cut = y - r + 2 * r * lid;
    const slant = sorrow * r * 0.4;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.1, r * 1.04, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#9b8a72';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.3, y - r * 1.3);
    ctx.lineTo(x + r * 1.3, y - r * 1.3);
    ctx.lineTo(x + r * 1.3, cut + slant);
    ctx.quadraticCurveTo(x, cut - slant * 0.1, x - r * 1.3, cut - slant);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    d.pen.stroke([{ x: x - r * 1.08, y: cut - slant * 0.8 }, { x, y: cut - slant * 0.05 }, { x: x + r * 1.08, y: cut + slant * 0.8 }], 3.4, LINE, 0.95, false);
  }
  d.pen.hair(Array.from({ length: 25 }, (_, i) => ({ x: x + Math.cos(i * 0.262) * r * 1.02, y: y + Math.sin(i * 0.262) * r * 0.98 })), 2.2, LINE, 0.8);
}
