import { drawFairing, drawSail, drawSphere, SEAM_X } from './alvinBody';
import { drawArm, drawBasket, drawFrame, drawLamp, drawStern, drawThruster } from './alvinParts';
import { blob, type Pt, ink, lin, LINE } from './draw';

/**
 * The research submersible Alvin as it was in 1967, painted: a stubby white
 * fairing (not a military sub), the steel crew sphere with three round viewports
 * low at the front, a small sail with a hatch on top, a stern propeller, a side
 * thruster, lamps on brackets, a sample basket and a mechanical arm at the nose.
 * About 7 m long. Own units: 100 long (stern -53, nose +55), nose to the right
 * unless flipped, belly down (+y).
 */

export const ALVIN_UNITS = 100;
/** Viewport centres and radius, in own units. */
export const PORTS: readonly Pt[] = [{ x: 27.6, y: 7 }, { x: 37, y: 7.6 }, { x: 46.4, y: 7 }];
export const PORT_R = 4.2;
/** The crevice between two sections of the fairing, where the sword wedges: high on the shoulder for a fish coming from above. */
export const SEAM_STUCK: Pt = { x: SEAM_X, y: -8 };
const LAMPS: readonly Pt[] = [{ x: 53, y: -12.4 }, { x: 45.6, y: -16.2 }];

export interface AlvinLook {
  /** How lit the hull is (lamps and sun on it), 0 dark blue .. 1 bright white. */
  readonly lit: number;
  /** Lamp beams on, 0 .. 1. */
  readonly beams: number;
  /** How far the lamp beams reach, in own units (default 90). */
  readonly reach?: number;
  /** Propeller turning, in radians. */
  readonly prop: number;
  /** The name on the flank, 0 .. 1 (default none). */
  readonly name?: number;
  /** Paints what shows in each viewport, in own units, clipped to the glass. */
  readonly port?: (ctx: CanvasRenderingContext2D, i: number, at: Pt, r: number) => void;
}

export interface Placed {
  readonly x: number;
  readonly y: number;
  /** Screen length of 100 own units. */
  readonly len: number;
  readonly rot: number;
  /** Nose to the left. */
  readonly flip?: boolean;
}

/** Where a point in the sub's own units lands on screen. */
export function onAlvin(p: Placed, local: Pt): Pt {
  const k = p.len / ALVIN_UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const lx = (p.flip ? -local.x : local.x) * k;
  const ly = local.y * k;
  return { x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c };
}

/** A soft cone of lamp light in the water: no hard edge, fading out along its length and across it. */
function beam(ctx: CanvasRenderingContext2D, from: Pt, reach: number, strength: number): void {
  ctx.save();
  ctx.translate(from.x, from.y);
  ctx.rotate(0.3);
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    blob(ctx, reach * (0.14 + 0.5 * u), 0, reach * (0.2 + 0.34 * u), reach * (0.06 + 0.2 * u), 0, '255,246,212', (0.34 - 0.2 * u) * strength);
  }
  ctx.restore();
}

function drawPort(ctx: CanvasRenderingContext2D, i: number, look: AlvinLook, lw: number): void {
  const c = PORTS[i]!;
  const r = PORT_R;
  ctx.save();
  ctx.translate(c.x, c.y);
  // The sphere turns away at the sides, so the outer viewports narrow a little.
  ctx.scale(1 - 0.11 * Math.abs(i - 1), 1);
  ctx.translate(-c.x, -c.y);
  // The heavy steel collar, bolted to the sphere.
  ctx.fillStyle = lin(ctx, c.x - r, c.y - r * 1.5, c.x + r, c.y + r * 1.5, [[0, '#c9d3da'], [0.5, '#7d8a96'], [1, '#2e3843']]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 0.9;
  ctx.stroke();
  for (let b = 0; b < 10; b++) {
    const a = (b / 10) * Math.PI * 2 + 0.3;
    ctx.fillStyle = '#39434d';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(a) * r * 1.17, c.y + Math.sin(a) * r * 1.17, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  // The warm cabin glow behind the glass.
  const glow = ctx.createRadialGradient(c.x, c.y - r * 0.2, r * 0.1, c.x, c.y, r * 1.1);
  glow.addColorStop(0, '#ffd98f');
  glow.addColorStop(0.6, '#d99540');
  glow.addColorStop(1, '#6a3c1a');
  ctx.fillStyle = glow;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  look.port?.(ctx, i, c, r);
  // Thick glass: cool at the rim, a soft curved reflection across the top.
  const rim = ctx.createRadialGradient(c.x, c.y, r * 0.66, c.x, c.y, r);
  rim.addColorStop(0, 'rgba(20,50,70,0)');
  rim.addColorStop(1, 'rgba(10,30,50,0.62)');
  ctx.fillStyle = rim;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  blob(ctx, c.x - r * 0.42, c.y - r * 0.62, r * 0.62, r * 0.17, -0.5, '235,247,255', 0.42);
  ctx.restore();
  ctx.strokeStyle = '#141a22';
  ctx.lineWidth = r * 0.075;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.02, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Alvin in its own units, placed and turned by `p`. */
export function drawAlvin(ctx: CanvasRenderingContext2D, p: Placed, look: AlvinLook, boil: number): void {
  const k = p.len / ALVIN_UNITS;
  const lw = 2.4 / k;
  const hull = { lit: look.lit, beams: look.beams, name: look.name ?? 0 };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.flip ? -k : k, k);
  if (look.beams > 0.01) for (const lamp of LAMPS) beam(ctx, { x: lamp.x + 3, y: lamp.y }, look.reach ?? 90, look.beams);
  drawStern(ctx, look.prop, lw);
  drawFrame(ctx, lw);
  drawBasket(ctx, lw);
  drawSphere(ctx, hull, lw);
  drawFairing(ctx, hull, boil, lw);
  ink(ctx, [{ x: 24, y: -2.6 }, { x: 29, y: -2.8 }, { x: 40, y: -3.4 }, { x: 49, y: -2.6 }], lw * 2.4, '#0c1218', 0.35);
  drawThruster(ctx, { x: -33, y: 1 }, look.prop * 1.3, lw);
  drawSail(ctx, hull, lw);
  drawArm(ctx, lw);
  PORTS.forEach((_, i) => drawPort(ctx, i, look, lw));
  LAMPS.forEach((l) => drawLamp(ctx, l, look.beams, lw));
  ctx.restore();
}
