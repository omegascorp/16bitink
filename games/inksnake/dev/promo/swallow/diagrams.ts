import { RED } from '../../../src/art/palette';
import { clamp01, smooth, window01 } from '../short';
import { card, stamp, write } from './hud';

/**
 * The explainer insets, drawn in pen on a paper card: the cold open's
 * unhinge myth stamped out, the two prey circles for the twist, and the
 * corn snake's chequered belly beside a cob of corn (anatomy.ts has the
 * jaws and the snorkel).
 */

const LINE = '#2b2418';
const BONE = '#f1e6c8';

function bone(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], w: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w + 6;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** The cold open's myth: a jaw dropping off its hinge, stamped with a red ✗. */
export function drawUnhinge(ctx: CanvasRenderingContext2D, t: number, from: number, to: number): void {
  const a = window01(t, from, to, 0.25);
  if (a <= 0) return;
  const x = 1520;
  const y = 330;
  card(ctx, x - 230, y - 170, 460, 340, a, 0.02);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y + 10);
  // A side-on skull with the lower jaw swung down off a broken hinge (the myth).
  ctx.fillStyle = '#e4d6b2';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -40, 150, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const drop = smooth((t - from) / 0.6);
  ctx.save();
  ctx.translate(-120, -10 + drop * 40);
  ctx.rotate(0.15 + drop * 0.35);
  bone(ctx, [[0, 0], [130, 18], [250, 10]], 18);
  ctx.restore();
  ctx.restore();
  write(ctx, 'unhinged?', x, y - 115, 50, { alpha: a });
  const u = clamp01((t - from - 0.5) / 0.25);
  if (u > 0) {
    ctx.save();
    ctx.globalAlpha = a * clamp01(u * 2);
    ctx.translate(x, y + 20);
    const s = 1 + 1.2 * (1 - smooth(u));
    ctx.scale(s, s);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-110, -110);
    ctx.lineTo(110, 110);
    ctx.moveTo(110, -110);
    ctx.lineTo(-110, 110);
    ctx.stroke();
    ctx.restore();
  }
}

/** Two prey circles at the same snake weight: the Burmese python's, and the egg-eater's (over twice the area). */
export function drawCircles(ctx: CanvasRenderingContext2D, t: number, from: number, to: number): void {
  const a = window01(t, from, to, 0.3);
  if (a <= 0) return;
  card(ctx, 1020, 180, 860, 560, a, -0.01);
  const r = 80;
  const grow = 0.35 + 0.65 * smooth((t - from) / 0.5);
  const circle = (cx: number, rr: number, fill: string): void => {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = fill;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, 460, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  circle(1230, r, '#c9a56e');
  circle(1660, r * (1 + 0.5 * grow), '#d8c9a8');
  write(ctx, 'same snake weight', 1450, 250, 48, { alpha: a });
  write(ctx, 'Burmese python', 1230, 690, 42, { alpha: a });
  write(ctx, 'egg-eater', 1660, 690, 42, { alpha: a });
  write(ctx, '× 2+', 1425, 485, 96, { alpha: a * clamp01((t - from - 0.4) / 0.3), fill: RED });
  write(ctx, 'area', 1425, 535, 40, { alpha: a * clamp01((t - from - 0.4) / 0.3), weight: 500 });
}

/** The corn snake's chequered belly beside a cob of corn. */
export function drawBellyCorn(ctx: CanvasRenderingContext2D, t: number, from: number, to: number): void {
  const a = window01(t, from, to, 0.3);
  if (a <= 0) return;
  card(ctx, 1180, 170, 700, 470, a, 0.012);
  ctx.save();
  ctx.globalAlpha = a;
  // The belly: a band of scutes, black and white squares chequered on cream.
  ctx.translate(1340, 410);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#efe4c6';
  ctx.fillRect(-60, -200, 120, 400);
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 === 0 && (i * 7 + j * 3) % 5 !== 0) {
        ctx.fillStyle = '#1e1a16';
        ctx.fillRect(-60 + j * 40 + 4, -200 + i * 25 + 3, 30, 19);
      }
    }
  }
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4;
  ctx.strokeRect(-60, -200, 120, 400);
  ctx.restore();
  // The cob: husk leaves behind, then rows of kernels, pen and wash.
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(1665, 410);
  ctx.rotate(0.18);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.bezierCurveTo(sx * 120, 120, sx * 110, -60, sx * 40, -150);
    ctx.bezierCurveTo(sx * 60, -40, sx * 50, 100, 0, 200);
    ctx.fillStyle = sx < 0 ? '#86a456' : '#6f8f45';
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, -5, 62, 175, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e9c24a';
  ctx.fill();
  ctx.clip();
  for (let row = 0; row < 16; row++) {
    const ky = -175 + row * 22 + 4;
    const half = 62 * Math.sqrt(Math.max(0, 1 - ((ky + 5) / 175) ** 2));
    for (let col = -3; col <= 3; col++) {
      const kx = col * 17 + (row % 2) * 8;
      if (Math.abs(kx) > half - 4) continue;
      const shade = 1 - Math.abs(kx) / (half + 1);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 7, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade > 0.55 ? '#f6dc73' : '#d4a52f';
      ctx.fill();
      ctx.strokeStyle = '#8a6418';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(1665, 410);
  ctx.rotate(0.18);
  ctx.beginPath();
  ctx.ellipse(0, -5, 62, 175, 0, 0, Math.PI * 2);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  write(ctx, 'belly', 1340, 230, 48, { alpha: a });
  write(ctx, 'corn', 1665, 210, 48, { alpha: a });
}
