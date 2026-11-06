import { bodyProportions } from '../../../src/art/fishArt';
import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { INK } from '../../../src/art/pen';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { pointOn, type SwimLook } from '../gape/swimmer';
import type { EyeLook } from './story';

/**
 * What the game's drawings lack for this short, drawn over them: the
 * puffer's standing spines (the game puffs a puffer up by scaling it, so the
 * inflated look is its drawing, bigger), its smug lids and raspberry, and the
 * viper's bulging, crossed, dizzy or narrowed eyes.
 */

const PUFFER = bodyProportions('puffer');
const SPINE = '#f1e8bd';
const LID = '#c9b36a';
const VIPER_SKIN = '#8a9fd3';

/** The puffer's frame: origin at its centre, units texture px (its drawing faces right). */
function inFrame(ctx: CanvasRenderingContext2D, pose: Pose, squash: number, stretch: number): void {
  const k = pose.length / (2 * PUFFER.hl);
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(k * stretch, k * squash);
}

/** Spines standing out round the body: `amt` 0 (the drawing's own prickles) .. 1 (fully puffed). */
export function drawSpines(ctx: CanvasRenderingContext2D, pose: Pose, amt: number, squash: number, stretch: number): void {
  if (amt <= 0.02) return;
  const n = 30;
  ctx.save();
  inFrame(ctx, pose, squash, stretch);
  ctx.lineJoin = 'round';
  ctx.fillStyle = SPINE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  const cx = PUFFER.hl * 0.12;
  const rx = PUFFER.hl * 0.82;
  const ry = PUFFER.hh * 1.0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.05;
    // Not at the tail stalk (straight back) or the beak (straight ahead).
    const back = Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI)));
    if (back < 0.42 || Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.2) continue;
    const bx = cx + Math.cos(a) * rx;
    const by = Math.sin(a) * ry;
    const nx = Math.cos(a) * ry;
    const ny = Math.sin(a) * rx;
    const nl = Math.hypot(nx, ny);
    const len = 3 + 17 * amt * (0.8 + 0.4 * ((i * 7) % 5) / 4);
    const w = 3.2;
    const tx = -ny / nl;
    const ty = nx / nl;
    ctx.beginPath();
    ctx.moveTo(bx + tx * w - (nx / nl) * 3, by + ty * w - (ny / nl) * 3);
    ctx.lineTo(bx + (nx / nl) * len, by + (ny / nl) * len);
    ctx.lineTo(bx - tx * w - (nx / nl) * 3, by - ty * w - (ny / nl) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The puffer's eyes: a heavy smug lid over the top half (`smug` 0 .. 1), or wide open. */
export function drawPufferFace(ctx: CanvasRenderingContext2D, pose: Pose, squash: number, stretch: number, smug: number, tongue: number): void {
  const a = ANATOMY.puffer;
  const ex = xAt(a, a.eye.t) - 128;
  const ey = C - heightAt(a, a.eye.t) * 0.3 - 128;
  const r = a.eye.r;
  ctx.save();
  inFrame(ctx, pose, squash, stretch);
  if (smug > 0.05) {
    ctx.beginPath();
    ctx.arc(ex, ey, r * 1.08, Math.PI, Math.PI * 2);
    ctx.lineTo(ex + r * 1.08, ey - r * (1 - 1.1 * smug) * 1.0);
    ctx.closePath();
    ctx.save();
    ctx.beginPath();
    ctx.rect(ex - r * 1.2, ey - r * 1.2, r * 2.4, r * 1.2 * (0.4 + 0.6 * smug) + r * 0.2);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(ex, ey, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = LID;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const lidY = ey - r * 0.1 + r * 0.25 * (1 - smug);
    ctx.moveTo(ex - r * 1.15, lidY + r * 0.1);
    ctx.lineTo(ex + r * 1.15, lidY - r * 0.1);
    ctx.stroke();
  }
  if (tongue > 0.02) {
    // A raspberry: a pink tongue blown out of the beak, wobbling.
    const nose = xAt(a, 0) - 128;
    const len = 15 * tongue;
    const wob = Math.sin(tongue * 40) * 2;
    ctx.fillStyle = '#d86a7c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(nose + len * 0.5, 9 + wob, len * 0.6, 3.6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e9f1ff';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(nose + len * (0.8 + i * 0.35), 3 + i * 5 + wob, 1.8 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The viper's eyes: bulging, crossed, dizzy or narrowed, over its own drawing (screen px; `up` is where its jaw has lifted the eye). */
export function drawViperEyes(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook, how: EyeLook, t: number): void {
  if (!how || how === 'squeeze') return;
  const a = ANATOMY.viperfish;
  const tex = { x: xAt(a, a.eye.t), y: C - heightAt(a, a.eye.t) * 0.3 };
  const at = pointOn(sprite, pose, look, tex);
  const k = pose.length / (2 * bodyProportions('viperfish').hl);
  const r = a.eye.r * k;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  if (how === 'narrow') {
    ctx.fillStyle = VIPER_SKIN;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    ctx.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 1.4 + r * 0.05);
    ctx.fillRect(-r * 1.4, r * 0.45, r * 2.8, r);
    ctx.restore();
    // A hard slanted brow and a thin glare of eye.
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath();
    ctx.moveTo(-r * 1.3, -r * 0.75);
    ctx.lineTo(r * 1.3, -r * 0.1);
    ctx.stroke();
  } else if (how === 'dizzy') {
    ctx.fillStyle = '#f4f6ff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.6, r * 0.14);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const ang = u * Math.PI * 5 + t * 14;
      const rad = r * 1.05 * u;
      if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    ctx.stroke();
  } else {
    // Bulging, then crossed: a big white eye with the pupil dead ahead, then driven towards the nose and up.
    const big = how === 'cross' ? 1.75 : 1.55;
    ctx.fillStyle = '#f4f6ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * big, r * big, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.stroke();
    const p = how === 'cross' ? { x: r * 0.85, y: -r * 0.55 } : { x: r * 0.15, y: 0 };
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (how === 'cross' ? 0.5 : 0.42), 0, Math.PI * 2);
    ctx.fill();
    // Strain: sweat-drop lines beside it when crossed.
    if (how === 'cross') {
      ctx.lineWidth = Math.max(1.6, r * 0.12);
      for (const s of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 1.9, s * r * 0.6 - r * 0.2);
        ctx.lineTo(-r * 2.5, s * r * 0.9 - r * 0.4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
