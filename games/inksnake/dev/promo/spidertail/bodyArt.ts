import { type Draw, ribbon } from '../../../src/art/kit';
import { VIPER_PAINT as V } from '../../../src/art/chapters/mountainsSnakePaint';
import { type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { css, hex, mixRgb, type Rgb, vnoise } from './noise';

/**
 * The viper's body: a heavy round tube covered in rows of rough keeled
 * scales, each painted on its own: dusty sand and stone, lit from the upper
 * left round the body, a keel catching the light down its middle, the dark
 * skin showing between them. Dark bars cross the back, edged pale. The scale
 * rows stay the same in number from the fat coil to the thin tail, so they
 * shrink into the bulb as a real tail's do.
 */

export const LINE = '#241b15';
const UNDER = '#4a3c30';

export interface Spine {
  /** Tail tip first, about 3 px apart, with the radius at each. */
  readonly pts: readonly Pt[];
  readonly r: readonly number[];
}

/** A dense Catmull-Rom line through the control points. */
export function through(ctrl: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]!;
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]!;
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3));
    for (let j = 0; j < n; j++) {
      const u = j / n;
      const u2 = u * u;
      const u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - a - 3 * c + d) * u3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(ctrl[ctrl.length - 1]!);
  return out;
}

export function spineOf(ctrl: readonly Pt[], radius: (u: number) => number): Spine {
  const pts = through(ctrl);
  return { pts, r: pts.map((_, i) => radius(i / (pts.length - 1))) };
}

const SKIN = hex(V.buff);
const STONE = hex(V.stone);
const GROUND = hex(V.ground);
const BAR = hex(V.bar);
const DEEP = hex(V.barDeep);
const HALO = hex(V.halo);
const BELLY = hex(V.belly);
const SHADOW = hex('#5a4c4c');
const BOUNCE = hex('#d2a874');
const ROWS = 11;

export interface TubeLook {
  readonly seed: number;
  /** The camera's height: 0 from the side, PI/2 from straight above. */
  readonly elevation: number;
  /** Where along the bars this piece starts. */
  readonly phase: number;
  readonly shadow?: boolean;
}

/** One scale at (x, y), its tip pointing along (tx, ty) towards the tail: rough and rhombic, a keel down the middle. */
export function scale(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, nx: number, ny: number, len: number, wid: number, base: Rgb, keel = 1): void {
  const hl = len * 0.5;
  const hw = wid * 0.5;
  ctx.fillStyle = css(base);
  ctx.beginPath();
  ctx.moveTo(x - tx * hl * 0.9, y - ty * hl * 0.9);
  ctx.quadraticCurveTo(x - tx * hl * 0.2 + nx * hw * 1.05, y - ty * hl * 0.2 + ny * hw * 1.05, x + tx * hl * 0.25 + nx * hw * 0.82, y + ty * hl * 0.25 + ny * hw * 0.82);
  ctx.lineTo(x + tx * hl * 1.08, y + ty * hl * 1.08);
  ctx.lineTo(x + tx * hl * 0.25 - nx * hw * 0.82, y + ty * hl * 0.25 - ny * hw * 0.82);
  ctx.quadraticCurveTo(x - tx * hl * 0.2 - nx * hw * 1.05, y - ty * hl * 0.2 - ny * hw * 1.05, x - tx * hl * 0.9, y - ty * hl * 0.9);
  ctx.fill();
  if (keel <= 0 || wid < 2.5) return;
  // The lower edge in shade, the keel lit, a fine dark line under it.
  ctx.strokeStyle = css([base[0] * 0.56, base[1] * 0.53, base[2] * 0.52]);
  ctx.lineWidth = Math.max(0.8, wid * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + tx * hl * 0.25 + nx * hw * 0.82, y + ty * hl * 0.25 + ny * hw * 0.82);
  ctx.lineTo(x + tx * hl * 1.08, y + ty * hl * 1.08);
  ctx.lineTo(x + tx * hl * 0.25 - nx * hw * 0.82, y + ty * hl * 0.25 - ny * hw * 0.82);
  ctx.stroke();
  ctx.strokeStyle = css([Math.min(255, base[0] * 1.2 + 14), Math.min(255, base[1] * 1.2 + 12), Math.min(255, base[2] * 1.18 + 8)]);
  ctx.lineWidth = Math.max(1, wid * 0.13 * keel);
  ctx.beginPath();
  ctx.moveTo(x - tx * hl * 0.5, y - ty * hl * 0.5);
  ctx.lineTo(x + tx * hl * 0.82, y + ty * hl * 0.82);
  ctx.stroke();
}

/** How dark the bar is at this place on the back (0..1): saddles with wandering edges, narrowing down the flank. */
function barAt(phase: number, dorsal: number, seed: number): number {
  const wander = 0.2 * (vnoise(phase * 2.3 + seed, dorsal * 3) - 0.5);
  const p = phase + wander;
  const dist = Math.abs(p - Math.round(p));
  const flank = 0.13 + 0.17 * Math.max(0, dorsal);
  return dist < flank ? 1 : dist < flank + 0.05 ? -1 : 0;
}

const unit3 = (x: number, y: number, z: number): readonly [number, number, number] => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const LIGHT = unit3(-0.52, -0.72, 0.5);

/** The colour of the scale whose outward normal is (nx, ny, nz) on the screen. */
export function scaleColour(nx: number, ny: number, nz: number, elevation: number, bar: number, value: number, tone: number): Rgb {
  const dorsal = -ny * Math.cos(elevation) + nz * Math.sin(elevation);
  let c = mixRgb(mixRgb(GROUND, SKIN, tone), STONE, Math.max(0, tone - 0.6) * 0.8);
  if (bar === 1) c = mixRgb(mixRgb(BAR, GROUND, 0.42), DEEP, value * 0.34);
  else if (bar === -1) c = mixRgb(c, HALO, 0.34);
  if (dorsal < -0.45) c = mixRgb(c, BELLY, Math.min(1, (-dorsal - 0.45) * 2.4));
  const diff = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  const lit = 0.6 + 0.56 * diff;
  const shaded = mixRgb(SHADOW, [c[0] * lit, c[1] * lit, c[2] * lit], Math.min(1, 0.62 + diff * 0.9));
  const under = Math.max(0, ny - 0.55) * 0.5;
  return mixRgb(shaded, BOUNCE, under * 0.5);
}

/** The tube's outline between two indices. */
export function tubeShape(sp: Spine, i0: number, i1: number): Pt[] {
  const pts = sp.pts.slice(i0, i1 + 1);
  const n = pts.length - 1 || 1;
  return ribbon(pts, (u) => 2 * sp.r[i0 + Math.round(u * n)]!).shape;
}

/** Paints the tube from i0 to i1 (towards the head); returns the bar phase it ended on. */
export function paintTube(ctx: CanvasRenderingContext2D, sp: Spine, i0: number, i1: number, look: TubeLook): number {
  const shape = tubeShape(sp, i0, i1);
  const outline = new Path2D();
  shape.forEach((p, i) => (i === 0 ? outline.moveTo(p.x, p.y) : outline.lineTo(p.x, p.y)));
  outline.closePath();
  if (look.shadow !== false) {
    ctx.save();
    ctx.shadowColor = 'rgba(28,18,14,0.62)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetX = 14;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = UNDER;
    ctx.fill(outline);
    ctx.restore();
  }
  ctx.fillStyle = UNDER;
  ctx.fill(outline);
  const rng = createRng(look.seed);
  let phase = look.phase;
  let at = i0;
  let odd = false;
  while (at < i1) {
    const i = Math.round(at);
    const p = sp.pts[i]!;
    const b = sp.pts[Math.min(sp.pts.length - 1, i + 2)]!;
    const a = sp.pts[Math.max(0, i - 2)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const hx = (b.x - a.x) / dl;
    const hy = (b.y - a.y) / dl;
    const nx = hy;
    const ny = -hx;
    const r = sp.r[i]!;
    const wide = (Math.PI * r) / ROWS;
    const step = wide * 0.72;
    for (let j = 0; j <= ROWS; j++) {
      const th = -Math.PI / 2 + ((j + (odd ? 0.5 : 0)) / ROWS) * Math.PI;
      const s = Math.sin(th);
      const c = Math.cos(th);
      if (c < 0.05) continue;
      const Nx = nx * s;
      const Ny = ny * s;
      const dorsal = -Ny * Math.cos(look.elevation) + c * Math.sin(look.elevation);
      const bar = barAt(phase, dorsal, look.seed);
      const value = rng();
      const col = scaleColour(Nx, Ny, c, look.elevation, bar, value, 0.25 + value * 0.5 + 0.35 * (vnoise(phase * 5, j * 0.7) - 0.5));
      scale(ctx, p.x + nx * s * r, p.y + ny * s * r, -hx, -hy, nx, ny, wide * 1.55, Math.max(1.6, wide * 1.12 * Math.max(0.28, c)), col);
    }
    odd = !odd;
    at += step / 3;
    phase += step / (r * 3.4 + 26);
  }
  return phase;
}

/** The firm thin contour along both sides of a piece of the tube. */
export function inkTube(d: Draw, sp: Spine, i0: number, i1: number, alpha = 0.85): void {
  const pts = sp.pts.slice(i0, i1 + 1);
  const n = pts.length - 1 || 1;
  const { top, bot } = ribbon(pts, (u) => 2 * sp.r[i0 + Math.round(u * n)]! + 1);
  d.pen.stroke(top.filter((_, i) => i % 6 === 0), 3, LINE, alpha, false);
  d.pen.stroke(bot.filter((_, i) => i % 6 === 0), 3.6, LINE, alpha, false);
}
