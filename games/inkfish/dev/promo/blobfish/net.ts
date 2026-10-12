import { createRng } from '../../../src/logic/rng';
import { lerp, smooth } from '../short';
import { CHALK, type Pt } from './scene';

/**
 * The trawl net the fish lies in: a cradle of diamond mesh under and round
 * it, a thicker headrope round its rim and four cords up to a knot on the
 * rope it hangs from. Laid on the seafloor it goes slack: the mesh falls
 * flat into a strip on the sand and the knot drops beside the fish, the
 * rope in loose curves.
 *
 * Drawn in fish units about the fish's belly (see fish.ts), turned with it.
 */
interface NetShape {
  /** Half-width at the rim, and at the bottom. */
  readonly w: number;
  readonly floorW: number;
  readonly bottom: number;
  /** How much the mesh bellies down under the fish's weight. */
  readonly belly: number;
  readonly rim: number;
  readonly knot: Pt;
}

function netShape(slack: number, pivot: number): NetShape {
  const s = smooth(slack);
  return {
    w: lerp(0.64, 0.8, s),
    floorW: lerp(0.5, 0.78, s),
    bottom: 0.03,
    belly: lerp(0.035, 0.0, s),
    rim: lerp(-0.14, 0.0, s),
    knot: { x: lerp(0, 1.05, s), y: lerp(-pivot, 0.02, s) },
  };
}

/** A point on the mesh: `s` across (-1 .. 1), `h` up from the bottom (0) to the rim (1). */
function meshAt(net: NetShape, s: number, h: number): Pt {
  const half = lerp(net.floorW, net.w, Math.sqrt(h));
  return { x: s * half, y: lerp(net.bottom + net.belly * (1 - s * s), net.rim, h) };
}

/** The mesh's diamonds: two families of slanting lines across the cradle. */
const SLANT = 0.32;
const STEP = 0.11;
const BOIL_JIT = 0.003;

function drawMesh(ctx: CanvasRenderingContext2D, net: NetShape, offset: number, boil: number): void {
  const rng = createRng(301 + boil);
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
        const p = meshAt(net, s, h);
        const x = p.x + (rng() - 0.5) * BOIL_JIT;
        const y = p.y + (rng() - 0.5) * BOIL_JIT;
        if (drawing) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        drawing = true;
      }
      ctx.stroke();
    }
  }
}

const RIM_RY = 0.05;
/** The cords from the rim up to the knot, by where they leave the rim. */
const CORDS = [-1, -0.35, 0.35, 1] as const;

/** The back of the net (behind the fish) or its front (over it, faint, so the fish shows through). */
export function drawNet(
  ctx: CanvasRenderingContext2D, belly: Pt, length: number, angle: number, slack: number, pivot: number, front: boolean, boil: number,
): void {
  const net = netShape(slack, pivot);
  ctx.save();
  ctx.translate(belly.x, belly.y);
  ctx.rotate(angle);
  ctx.scale(length, length);
  ctx.strokeStyle = CHALK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const thin = Math.max(1.3, length * 0.0032) / length;
  ctx.lineWidth = thin;
  ctx.globalAlpha = front ? 0.2 : 0.42;
  drawMesh(ctx, net, front ? STEP / 2 : 0, boil);
  // The headrope round the rim: its back half behind the fish, its front half over it.
  ctx.globalAlpha = front ? 0.45 : 0.6;
  ctx.lineWidth = thin * 2.2;
  ctx.beginPath();
  ctx.ellipse(0, net.rim, net.w, RIM_RY * net.w, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  ctx.stroke();
  if (!front) {
    // Cords up to the knot, gathering the bag.
    ctx.lineWidth = thin * 1.6;
    ctx.globalAlpha = 0.6;
    for (const s of CORDS) {
      const from = { x: s * net.w, y: net.rim };
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(lerp(from.x, net.knot.x, 0.35), lerp(from.y, net.knot.y, 0.12) + 0.03 * smooth(slack), net.knot.x, net.knot.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The rope from the net's knot up out of the picture: straight when hauling, in loose curves when slack. */
export function drawRope(ctx: CanvasRenderingContext2D, belly: Pt, length: number, angle: number, slack: number, pivot: number): void {
  const net = netShape(slack, pivot);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const knot = { x: belly.x + (net.knot.x * c - net.knot.y * s) * length, y: belly.y + (net.knot.x * s + net.knot.y * c) * length };
  if (knot.y < -10) return;
  const loose = smooth(slack) * length;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(3, length * 0.009);
  ctx.beginPath();
  ctx.moveTo(knot.x, knot.y);
  ctx.bezierCurveTo(knot.x + 0.45 * loose, knot.y + 0.02 * loose, knot.x - 0.1 * loose, knot.y - 1.1 * loose, knot.x + 0.15 * loose, -20);
  ctx.stroke();
  // The knot.
  ctx.fillStyle = CHALK;
  ctx.beginPath();
  ctx.arc(knot.x, knot.y, Math.max(4, length * 0.012), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
