import { bodyProportions } from '../../../src/art/fishArt';
import { INK } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { EYE_R, EYE_TEX } from './cast';
import type { Gaze } from './story';
import { texToPose, type SwimLook } from './swimmer';

/**
 * The wreckfish's big eye, drawn over its sprite so it can look about: a
 * bronze iris round a big black pupil that turns to where it looks, a heavy
 * lid that drops for the smug look, and a brow.
 */

const SKIN = '#6a665d';
const IRIS = '#b8954f';
const IRIS_DARK = '#6d5426';

/** Where the eye is on screen and its radius, px. */
export function eyeOf(pose: Pose, look: SwimLook): { readonly x: number; readonly y: number; readonly r: number } {
  const p = texToPose(pose, look, EYE_TEX);
  return { ...p, r: (EYE_R * pose.length) / (2 * bodyProportions(pose.shape).hl) };
}

export function drawEye(ctx: CanvasRenderingContext2D, pose: Pose, look: SwimLook, gaze: Gaze, alpha = 1): void {
  if (alpha <= 0.01) return;
  const e = eyeOf(pose, look);
  const r = e.r;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(e.x, e.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  // The socket's rim, then the iris.
  ctx.fillStyle = '#2b2924';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#e1c27a');
  g.addColorStop(0.6, IRIS);
  g.addColorStop(1, IRIS_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Fine ink lines in the iris.
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  // The pupil, turned to the gaze.
  const px = gaze.x * r * 0.3;
  const py = gaze.y * r * 0.3;
  ctx.fillStyle = '#08090b';
  ctx.beginPath();
  ctx.arc(px, py, r * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,235,0.9)';
  ctx.beginPath();
  ctx.arc(px + r * 0.18, py - r * 0.22, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  // The lid, down from the top by `lid`, with its inked edge.
  const lidY = -r * 1.15 + gaze.lid * r * 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.moveTo(-r * 1.3, -r * 1.3);
  ctx.lineTo(r * 1.3, -r * 1.3);
  ctx.lineTo(r * 1.3, lidY - r * 0.1);
  ctx.quadraticCurveTo(0, lidY + r * 0.22, -r * 1.3, lidY - r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 1.3, lidY - r * 0.1);
  ctx.quadraticCurveTo(0, lidY + r * 0.22, -r * 1.3, lidY - r * 0.05);
  ctx.stroke();
  ctx.restore();
  // The rim's ink, and a heavy brow.
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(-r * 1.5, -r * 1.25 + gaze.lid * r * 0.35);
  ctx.quadraticCurveTo(0, -r * 1.7 + gaze.lid * r * 0.45, r * 1.4, -r * 1.05 + gaze.lid * r * 0.2);
  ctx.stroke();
  ctx.restore();
}
