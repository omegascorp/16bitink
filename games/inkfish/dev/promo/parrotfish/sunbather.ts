import { INK } from '../../../src/art/pen';
import { lerp } from '../short';
import { HIP } from './stage';

/**
 * The sunbather, side-on on the towel: feet towards the sea, one knee up,
 * sunglasses on. `sit` 0 lies them flat, 1 has them bolt upright, facing
 * the water.
 */
const SKIN = '#e9b48a';
const SUIT = '#2f8f9a';
const HAIR = '#5a3a24';
const TORSO = 64;
const HEAD_R = 19;

interface Pt { readonly x: number; readonly y: number }

/** Where the head is (for the "!" and the "you" arrow). */
export function headOf(sit: number): Pt {
  const a = lerp(-0.04, -1.22, sit);
  const d = { x: Math.cos(a), y: Math.sin(a) };
  return { x: HIP.x + d.x * (TORSO + HEAD_R + 2), y: HIP.y + d.y * (TORSO + HEAD_R + 2) };
}

function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 5;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function drawSunbather(ctx: CanvasRenderingContext2D, sit: number): void {
  // The torso's direction from the hip: flat towards the right (head end), or up.
  const a = lerp(-0.04, -1.22, sit);
  const d = { x: Math.cos(a), y: Math.sin(a) };
  const shoulder = { x: HIP.x + d.x * TORSO, y: HIP.y + d.y * TORSO };
  const head = headOf(sit);
  // Facing: up while lying on their back, towards the sea (left) sitting up.
  const face = { x: d.y, y: -d.x };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs: one flat, one with the knee up; both feet towards the sea.
  limb(ctx, [HIP, { x: HIP.x - 50, y: HIP.y + 3 }, { x: HIP.x - 92, y: HIP.y + 5 }], 15, SKIN);
  limb(ctx, [HIP, { x: HIP.x - 38, y: HIP.y - 34 }, { x: HIP.x - 70, y: HIP.y + 4 }], 15, SKIN);
  // The far arm: resting by the side, or propping them up behind.
  const hand = { x: lerp(HIP.x + 18, HIP.x + 46, sit), y: lerp(HIP.y + 4, HIP.y + 8, sit) };
  const elbow = { x: lerp(shoulder.x - 28, hand.x + 6, 0.5), y: lerp(shoulder.y + 8, hand.y, 0.5) + 6 };
  limb(ctx, [shoulder, elbow, hand], 11, SKIN);
  // Torso in a swimsuit.
  limb(ctx, [{ x: HIP.x - 8 * d.x, y: HIP.y - 8 * d.y }, shoulder], 30, SUIT);
  // Head, hair at the back, sunglasses on the face side.
  ctx.beginPath();
  ctx.arc(head.x, head.y, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(head.x, head.y, HEAD_R, Math.atan2(-face.y, -face.x) - 1.3, Math.atan2(-face.y, -face.x) + 1.3);
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 9;
  ctx.stroke();
  const eye = { x: head.x + face.x * HEAD_R * 0.7 - d.x * 4, y: head.y + face.y * HEAD_R * 0.7 - d.y * 4 };
  ctx.save();
  ctx.translate(eye.x, eye.y);
  ctx.rotate(Math.atan2(d.y, d.x));
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The near arm, along the side.
  const nearHand = { x: lerp(HIP.x + 6, HIP.x - 34, sit), y: lerp(HIP.y + 2, HIP.y - 6, sit) };
  limb(ctx, [shoulder, { x: (shoulder.x + nearHand.x) / 2 + 6, y: (shoulder.y + nearHand.y) / 2 + 10 }, nearHand], 11, SKIN);
  ctx.restore();
}
