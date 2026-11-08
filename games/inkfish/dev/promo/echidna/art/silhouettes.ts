import { type PassKind } from '../story';

/**
 * The three things a tiger shark has been found to swallow, as dark shapes with
 * a pale rim of light (so they read against the bright water): a sea turtle, a
 * seabird and a tyre. Drawn live, nose/beak right, in whatever units the
 * context is in: `len` is the long side.
 */

const DARK = '#10282e';
const RIM = 'rgba(210,245,240,0.8)';

function rim(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.strokeStyle = RIM;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function turtle(ctx: CanvasRenderingContext2D, t: number, w: number): void {
  const flap = 0.35 * Math.sin(t * 9);
  ctx.fillStyle = DARK;
  // Back flipper, shell, head, front flipper.
  ctx.beginPath();
  ctx.ellipse(-0.36, 0.14 + 0.03 * flap, 0.14, 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.1);
  ctx.bezierCurveTo(-0.38, -0.3, 0.2, -0.38, 0.34, 0.02);
  ctx.bezierCurveTo(0.2, 0.2, -0.2, 0.2, -0.34, 0.1);
  ctx.closePath();
  ctx.fill();
  rim(ctx, w);
  ctx.beginPath();
  ctx.ellipse(0.46, -0.02, 0.15, 0.08, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(0.1, 0.12);
  ctx.rotate(0.9 + flap);
  ctx.beginPath();
  ctx.ellipse(0.2, 0, 0.26, 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(210,245,240,0.4)';
  ctx.lineWidth = w * 0.8;
  for (const x of [-0.18, 0, 0.16]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.28 + Math.abs(x) * 0.5);
    ctx.quadraticCurveTo(x + 0.05, -0.1, x, 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4efe0';
  ctx.beginPath();
  ctx.arc(0.5, -0.04, 0.018, 0, Math.PI * 2);
  ctx.fill();
}

function bird(ctx: CanvasRenderingContext2D, t: number, w: number): void {
  const flap = Math.sin(t * 11);
  ctx.fillStyle = DARK;
  // Body, tail, head and beak, then the wing.
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.02);
  ctx.lineTo(-0.28, -0.06);
  ctx.bezierCurveTo(-0.1, -0.2, 0.26, -0.14, 0.34, -0.04);
  ctx.bezierCurveTo(0.3, 0.1, 0, 0.16, -0.28, 0.08);
  ctx.closePath();
  ctx.fill();
  rim(ctx, w);
  ctx.beginPath();
  ctx.arc(0.38, -0.1, 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8a02c';
  ctx.beginPath();
  ctx.moveTo(0.45, -0.12);
  ctx.lineTo(0.62, -0.07);
  ctx.lineTo(0.45, -0.06);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = DARK;
  ctx.save();
  ctx.translate(-0.05, -0.08);
  ctx.rotate(-0.9 - 0.7 * flap);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(0.1, -0.5, 0.45, -0.6, 0.78, -0.4);
  ctx.bezierCurveTo(0.45, -0.32, 0.25, -0.2, 0.1, 0.02);
  ctx.closePath();
  ctx.fill();
  rim(ctx, w);
  ctx.restore();
}

function tyre(ctx: CanvasRenderingContext2D, t: number, w: number): void {
  ctx.save();
  ctx.rotate(t * 3);
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
  ctx.arc(0, 0, 0.24, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = RIM;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(210,245,240,0.35)';
  ctx.lineWidth = w * 0.9;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 0.43, Math.sin(a) * 0.43);
    ctx.lineTo(Math.cos(a + 0.12) * 0.5, Math.sin(a + 0.12) * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A dark shape of `kind` centred on x,y, `len` long, turned by `rot`; `t` paces its flipper, wing or roll. */
export function drawSilhouette(ctx: CanvasRenderingContext2D, kind: PassKind, x: number, y: number, len: number, rot: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(len, len);
  const w = 1.8 / Math.max(0.1, Math.abs(ctx.getTransform().a));
  if (kind === 'turtle') turtle(ctx, t, w);
  else if (kind === 'bird') bird(ctx, t, w);
  else tyre(ctx, t, w);
  ctx.restore();
}
