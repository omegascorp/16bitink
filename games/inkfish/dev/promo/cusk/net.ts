import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { CHALK, type Pt } from './scene';

/**
 * The research net the fish hangs in, and the lines down to the deep: the
 * net's warp from the A-frame, and Challenger's hemp dredge rope with its
 * iron-framed dredge. The net is a cradle of diamond mesh under the fish, a
 * headrope round its rim and four cords up to the knot on the warp; drawn in
 * fish lengths about its centre, turned with its swing.
 */
const RIM_Y = -0.03;
const RIM_W = 0.6;
const RIM_RY = 0.05;
const BOTTOM = 0.17;
/** The knot the cords gather at, above the centre. */
export const KNOT_Y = -0.5;
const CORDS = [-1, -0.35, 0.35, 1] as const;
const SLANT = 0.32;
const STEP = 0.1;

/** A point on the mesh: `s` across (-1 .. 1), `h` up from the bottom (0) to the rim (1). */
function meshAt(s: number, h: number): Pt {
  const half = lerp(RIM_W * 0.55, RIM_W, Math.sqrt(h));
  return { x: s * half, y: lerp(BOTTOM * (1 - 0.5 * s * s), RIM_Y, h) };
}

function drawMesh(ctx: CanvasRenderingContext2D, offset: number, boil: number): void {
  const rng = createRng(311 + boil);
  for (const dir of [1, -1]) {
    for (let c = -1 - SLANT - STEP + offset; c <= 1 + SLANT + STEP; c += STEP) {
      ctx.beginPath();
      let drawing = false;
      for (let k = 0; k <= 12; k++) {
        const h = k / 12;
        const s = c + dir * SLANT * h;
        if (s < -1 || s > 1) {
          drawing = false;
          continue;
        }
        const p = meshAt(s, h);
        const x = p.x + (rng() - 0.5) * 0.003;
        const y = p.y + (rng() - 0.5) * 0.003;
        if (drawing) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        drawing = true;
      }
      ctx.stroke();
    }
  }
}

/** The back of the net (behind the fish, with its cords) or its front (over it, faint). */
export function drawNet(ctx: CanvasRenderingContext2D, centre: Pt, length: number, angle: number, front: boolean, boil: number, alpha = 1): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(angle);
  ctx.scale(length, length);
  ctx.strokeStyle = CHALK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const thin = Math.max(1.2, length * 0.0032) / length;
  ctx.lineWidth = thin;
  ctx.globalAlpha = alpha * (front ? 0.22 : 0.45);
  drawMesh(ctx, front ? STEP / 2 : 0, boil);
  ctx.globalAlpha = alpha * (front ? 0.5 : 0.65);
  ctx.lineWidth = thin * 2.2;
  ctx.beginPath();
  ctx.ellipse(0, RIM_Y, RIM_W, RIM_RY * RIM_W, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  ctx.stroke();
  if (!front) {
    ctx.lineWidth = thin * 1.6;
    ctx.globalAlpha = alpha * 0.65;
    for (const s of CORDS) {
      const from = { x: s * RIM_W, y: RIM_Y };
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(lerp(from.x, 0, 0.35), lerp(from.y, KNOT_Y, 0.12), 0, KNOT_Y);
      ctx.stroke();
    }
    ctx.fillStyle = CHALK;
    ctx.beginPath();
    ctx.arc(0, KNOT_Y, 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Where the knot is on screen, for the warp. */
export function knotOf(centre: Pt, length: number, angle: number): Pt {
  return { x: centre.x - Math.sin(angle) * KNOT_Y * length, y: centre.y + Math.cos(angle) * KNOT_Y * length };
}

/** A taut line (the warp), or the dredge's rope with a little sag. */
export function drawLine(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, width: number, alpha: number, sag = 0): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x + to.x) / 2 + sag, (from.y + to.y) / 2, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/** Challenger's dredge: an iron frame with a net bag trailing behind, `size` its frame's width on screen. */
export function drawDredge(ctx: CanvasRenderingContext2D, at: Pt, size: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(at.x, at.y);
  ctx.strokeStyle = CHALK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.fillStyle = '#2a2c3c';
  // The bag, trailing behind (to the left).
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.35);
  ctx.quadraticCurveTo(-size * 1.4, -size * 0.45, -size * 1.6, -size * 0.05);
  ctx.quadraticCurveTo(-size * 1.4, size * 0.25, 0, size * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, size * 0.03);
  for (let k = 1; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.3 * k, -size * (0.37 + 0.01 * k));
    ctx.lineTo(-size * 0.3 * k, size * 0.07);
    ctx.stroke();
  }
  // The frame.
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.strokeRect(-size * 0.08, -size * 0.45, size * 0.16, size * 0.55);
  ctx.restore();
}
