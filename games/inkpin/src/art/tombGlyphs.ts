import { ART_RES, INK } from './palette';
import { makeCanvas } from './pen';
import { SAND_LIGHT } from './tomb';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's plate symbols, carved into stone: the ankh, the scarab,
 * the eye and the feather of Ma'at. Each is cut as a mask once, then laid
 * into a plate or a door three times (the cut's shaded upper wall, its lit
 * lower lip, and the paint in it), so it reads as an inset in the stone, not
 * a raised button. Bold shapes, so they read at 12–16 px.
 */

export type Glyph = 'ankh' | 'scarab' | 'eye' | 'feather';

type Ctx = CanvasRenderingContext2D;

function ankh(ctx: Ctx, r: number): void {
  // The loop: a ring, cut out of a filled oval.
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.52, r * 0.36, r * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.5, r * 0.15, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The arms, flaring to their ends.
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, -r * 0.2);
  ctx.lineTo(-r * 0.12, -r * 0.08);
  ctx.lineTo(r * 0.12, -r * 0.08);
  ctx.lineTo(r * 0.78, -r * 0.2);
  ctx.lineTo(r * 0.78, r * 0.2);
  ctx.lineTo(r * 0.12, r * 0.1);
  ctx.lineTo(-r * 0.12, r * 0.1);
  ctx.lineTo(-r * 0.78, r * 0.2);
  ctx.closePath();
  ctx.fill();
  // The stem, flaring to its foot.
  ctx.beginPath();
  ctx.moveTo(-r * 0.13, 0);
  ctx.lineTo(r * 0.13, 0);
  ctx.lineTo(r * 0.3, r * 0.98);
  ctx.lineTo(-r * 0.3, r * 0.98);
  ctx.closePath();
  ctx.fill();
}

function scarab(ctx: Ctx, r: number): void {
  // Wing cases, split down the back.
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.46, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head and the sun-disc it pushes.
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.5, r * 0.26, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = r * 0.15;
  for (const s of [-1, 1]) {
    for (const k of [-0.1, 0.22, 0.54]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.38, r * k);
      ctx.lineTo(s * r * 0.84, r * (k + 0.2));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s * r * 0.14, -r * 0.6);
    ctx.quadraticCurveTo(s * r * 0.3, -r * 0.92, s * r * 0.5, -r * 0.88);
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.3);
  ctx.lineTo(0, r * 0.72);
  ctx.moveTo(-r * 0.46, -r * 0.3);
  ctx.lineTo(r * 0.46, -r * 0.3);
  ctx.stroke();
  ctx.restore();
}

function eye(ctx: Ctx, r: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle;
  // The brow.
  ctx.lineWidth = r * 0.17;
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, -r * 0.5);
  ctx.quadraticCurveTo(0, -r * 0.9, r * 0.9, -r * 0.56);
  ctx.stroke();
  // The almond of the eye, and its long painted corner.
  ctx.lineWidth = r * 0.15;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.06);
  ctx.quadraticCurveTo(0, -r * 0.62, r * 0.7, -r * 0.08);
  ctx.lineTo(r * 0.98, -r * 0.1);
  ctx.moveTo(r * 0.7, -r * 0.08);
  ctx.quadraticCurveTo(0, r * 0.4, -r * 0.9, -r * 0.06);
  ctx.stroke();
  // The pupil.
  ctx.beginPath();
  ctx.arc(-r * 0.06, -r * 0.14, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // The falcon's marks under it: a straight tear and a curl.
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.22);
  ctx.lineTo(-r * 0.32, r * 0.9);
  ctx.moveTo(r * 0.2, r * 0.22);
  ctx.quadraticCurveTo(r * 0.3, r * 0.82, r * 0.62, r * 0.8);
  ctx.quadraticCurveTo(r * 0.82, r * 0.72, r * 0.68, r * 0.54);
  ctx.stroke();
}

function feather(ctx: Ctx, r: number): void {
  // The feather of Ma'at: an upright plume whose tip curls over.
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, r * 0.98);
  ctx.quadraticCurveTo(-r * 0.46, r * 0.3, -r * 0.4, -r * 0.4);
  ctx.quadraticCurveTo(-r * 0.32, -r * 0.92, r * 0.12, -r * 0.98);
  ctx.quadraticCurveTo(r * 0.56, -r * 0.96, r * 0.6, -r * 0.62);
  ctx.quadraticCurveTo(r * 0.44, -r * 0.7, r * 0.3, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.38, r * 0.2, r * 0.08, r * 0.98);
  ctx.closePath();
  ctx.fill();
  // The quill and a few parted barbs, cut back out.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(0.01 * r, r * 0.9);
  ctx.quadraticCurveTo(-r * 0.06, -r * 0.2, r * 0.08, -r * 0.72);
  ctx.stroke();
  ctx.lineWidth = r * 0.07;
  for (const k of [-0.18, 0.18, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, r * (k - 0.06));
    ctx.lineTo(-r * 0.2, r * (k + 0.06));
    ctx.stroke();
  }
  ctx.restore();
}

const SHAPES: Record<Glyph, (ctx: Ctx, r: number) => void> = { ankh, scarab, eye, feather };

const stamps = new Map<string, HTMLCanvasElement>();

/** The symbol as a solid shape in `color`, centred in a square canvas 2(r + 1) board px across. */
function stamp(glyph: Glyph, r: number, color: string): HTMLCanvasElement {
  const key = `${glyph}-${r.toFixed(2)}-${color}`;
  const have = stamps.get(key);
  if (have) return have;
  const size = Math.ceil((r + 1) * 2 * ART_RES);
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(size / ART_RES / 2, size / ART_RES / 2);
  ctx.fillStyle = color;
  SHAPES[glyph](ctx, r);
  // Paint it all in one colour (the cut-outs stay cut).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  stamps.set(key, canvas);
  return canvas;
}

function lay(ctx: Ctx, glyph: Glyph, r: number, color: string, dx: number, dy: number, alpha: number): void {
  const s = stamp(glyph, r, color);
  const half = s.width / ART_RES / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, dx - half, dy - half, half * 2, half * 2);
  ctx.restore();
}

export interface CarveOpts {
  /** Glowing: its plate is down. */
  readonly lit?: boolean;
  /** The light: the plate mark's glow colour. */
  readonly glow?: string;
  /** The stone it is cut in, for the cut's shaded wall. */
  readonly stone: string;
  /** Turned so it reads upright on a rotated picture. */
  readonly turn?: number;
}

/**
 * The symbol cut into stone at (x, y), `r` its half-height, painted with
 * `tint`: the cut's upper wall in shadow, its lower lip catching the light.
 * Lit, the paint glows in `glow`.
 */
export function carveGlyph(ctx: Ctx, glyph: Glyph, r: number, x: number, y: number, tint: string, o: CarveOpts): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.turn ?? 0);
  const glow = o.glow ?? tint;
  if (o.lit) {
    const R = r * 2.1;
    const halo = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, R);
    halo.addColorStop(0, rgba('#fffbe8', 0.6));
    halo.addColorStop(0.45, rgba(glow, 0.5));
    halo.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-R, -R, R * 2, R * 2);
  }
  lay(ctx, glyph, r, mix(o.stone, INK, 0.62), 0, -0.85, 0.85);
  lay(ctx, glyph, r, SAND_LIGHT, 0.2, 0.9, 0.9);
  if (o.lit) {
    // Lit: the paint glows, still in its own colour so it pairs with its doors.
    lay(ctx, glyph, r, mix(tint, glow, 0.35), 0, 0, 1);
    lay(ctx, glyph, r, glow, 0, 0, 0.55);
  } else {
    lay(ctx, glyph, r, tint, 0, 0, 1);
    // The paint worn thin on the raised side of the cut.
    lay(ctx, glyph, r, mix(tint, INK, 0.35), 0, -0.35, 0.45);
  }
  ctx.restore();
}
