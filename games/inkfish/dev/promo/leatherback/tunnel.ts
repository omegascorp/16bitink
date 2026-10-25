import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01 } from '../short';
import { glow, mix } from './paint';
import { FOCAL, type Pt as SPt } from './story';

/**
 * The throat seen head-on: a fleshy, uneven tube curving away and down into
 * the dark, lined with hundreds of pale, wet, conical spines (the papillae)
 * of every size, all angled inward and down, towards the stomach. Big ones
 * crowd the lips; smaller ones recede in the fog. Drawn in perspective from a
 * camera on the throat's axis (`camD`, in depth units; the beak's lips are at
 * depth 0): the wall far to near, then the spines far to near, each casting a
 * shadow on the wall below it. Light comes in through the mouth from above.
 */

const STEP = 0.22;
const DEEPEST = 14;
/** The throat curving down (and wandering a little sideways): px at scale 1. */
const bendAt = (k: number): Pt => ({ x: -10 * Math.sin(k * 0.22) * k * 0.3, y: 9.5 * k * k });

const FLESH_NEAR = '#9c4248';
const FLESH_MID = '#73282f';
const FLESH_FAR = '#170507';
const SPINE_LIT = '#f8ece0';
const SPINE_MID = '#e0beb2';
const SPINE_SHADE = '#6e3438';
const SPINE_FAR = '#2a0f11';

/** The throat's mean radius at a depth, px at scale 1: the mouth's width at the lips, narrowing to the gullet. */
const radiusAt = (d: number): number => 250 + 190 * Math.exp(-Math.max(0, d) / 0.9);
/** The tube isn't round: lumpy, a little flattened, the lumps shifting with depth. */
const shapeAt = (d: number, a: number): number =>
  1 + 0.12 * Math.sin(2 * a + 0.9 * d + 0.4) + 0.07 * Math.sin(3 * a - 1.4 * d + 1.1) + 0.04 * Math.sin(5 * a + 2.3 * d);
const FLAT = 0.9;

/** How dark a depth is: the light comes in through the open mouth and dies away down the throat (0 lit .. 1 black). */
const fogAt = (d: number): number => clamp01(1 - Math.exp(-Math.max(0, d - 0.15) / 2.6));

export interface TunnelView {
  /** The camera's depth on the axis. */
  readonly camD: number;
  /** Screen point of the axis at the lips (the face's origin). */
  readonly at: SPt;
  /** Horizontal squeeze (the turn on "But"). */
  readonly squeeze: number;
  /** Spines glinting as they're named, 0 .. 1. */
  readonly glint: number;
}

interface Projected {
  readonly c: Pt;
  readonly s: number;
}

/** Where the throat's axis is at depth d on screen, and its scale there; null behind the camera. */
function project(v: TunnelView, d: number): Projected | null {
  const z = d - v.camD;
  if (z < 0.14) return null;
  const s = FOCAL / z;
  const b = bendAt(Math.max(0, d - Math.max(0, v.camD)));
  return { c: { x: v.at.x + b.x * s * v.squeeze, y: v.at.y + b.y * s }, s };
}

/** A point on the wall (or `inset` of the way in towards the axis) at depth d, angle a. */
function wallPoint(v: TunnelView, p: Projected, d: number, a: number, inset = 0): Pt {
  const r = radiusAt(d) * shapeAt(d, a) * (1 - inset) * p.s;
  return { x: p.c.x + Math.cos(a) * r * v.squeeze, y: p.c.y + Math.sin(a) * r * FLAT };
}

function ringPath(ctx: CanvasRenderingContext2D, v: TunnelView, p: Projected, d: number, grow = 1): void {
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const q = wallPoint(v, p, d, a, 1 - grow);
    if (i) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  }
  ctx.closePath();
}

interface Spine {
  readonly d: number;
  readonly a: number;
  /** Depth it reaches past its base, how far in its tip comes, its base half-width (radians), a twist and a bow. */
  readonly len: number;
  readonly inset: number;
  readonly half: number;
  readonly twist: number;
  readonly bow: number;
  readonly seed: number;
}

/** Hundreds of spines, scattered (no rows, no pattern): thickest near the lips, every size and lean. */
const SPINES: readonly Spine[] = (() => {
  const rng = createRng(2012);
  const out: Spine[] = [];
  for (let i = 0; i < 1100; i++) {
    const d = 0.06 + 13 * rng() ** 1.7;
    const big = Math.exp(-d / 3) * (0.6 + 0.8 * rng());
    out.push({
      d,
      a: rng() * Math.PI * 2,
      len: 0.06 + 0.22 * rng() * (0.5 + big),
      inset: 0.07 + 0.17 * rng() * (0.6 + big),
      half: 0.08 + 0.1 * rng() * (0.6 + big),
      twist: (rng() - 0.5) * 0.5,
      bow: (rng() - 0.5) * 0.5,
      seed: i,
    });
  }
  return out.sort((x, y) => y.d - x.d);
})();

/** Wet folds of the lining: short arcs at fixed depths and angles. */
const FOLDS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 110 }, () => ({ d: 0.1 + 12 * rng() ** 1.5, a: rng() * Math.PI * 2, span: 0.3 + rng() * 0.9, wet: rng() < 0.45 }));
})();

/** The tunnel. Clip it to the mouth before calling when the lips are in view. */
export function drawTunnel(ctx: CanvasRenderingContext2D, v: TunnelView, boil: number, t: number): void {
  const pen = new Pen(ctx, 4211 + boil * 977, 0.8);
  ctx.save();
  ctx.fillStyle = '#040102';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  drawWall(ctx, pen, v);
  for (const s of SPINES) drawSpine(ctx, pen, v, s, t);
}

function drawWall(ctx: CanvasRenderingContext2D, pen: Pen, v: TunnelView): void {
  const first = Math.max(0, Math.floor((v.camD + 0.14) / STEP));
  const last = Math.ceil(DEEPEST / STEP);
  for (let i = last; i >= first; i--) {
    const d = i * STEP;
    const p = project(v, d);
    const q = project(v, d + STEP);
    if (!p) continue;
    const fog = fogAt(d);
    const r = radiusAt(d) * p.s;
    ctx.save();
    ctx.beginPath();
    ringPath(ctx, v, p, d, 1.7);
    if (q) ringPath(ctx, v, q, d + STEP);
    // Lit from above through the mouth: the roof of the throat paler, its floor in shade.
    const base = fog < 0.5 ? mix(FLESH_NEAR, FLESH_MID, fog * 2) : mix(FLESH_MID, FLESH_FAR, fog * 2 - 1);
    const g = ctx.createLinearGradient(0, p.c.y - r, 0, p.c.y + r);
    g.addColorStop(0, mix(base, '#f0b0a8', 0.22 * (1 - fog)));
    g.addColorStop(0.5, base);
    g.addColorStop(1, mix(base, FLESH_FAR, 0.55));
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    ctx.restore();
  }
  // Folds and wet sheens on the lining.
  for (const f of FOLDS) {
    if (f.d < v.camD + 0.2) continue;
    const p = project(v, f.d);
    if (!p) continue;
    const fog = fogAt(f.d);
    if (fog > 0.9) continue;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) pts.push(wallPoint(v, p, f.d, f.a + (k / 8) * f.span, 0.01));
    if (f.wet) pen.hair(pts, Math.max(0.6, 5 * p.s), '#ffd9cf', 0.25 * (1 - fog) * (Math.sin(f.a) < 0 ? 1.4 : 0.6));
    else pen.hair(pts, Math.max(0.6, 4 * p.s), '#2a070b', 0.55 * (1 - fog));
  }
}

function drawSpine(ctx: CanvasRenderingContext2D, pen: Pen, v: TunnelView, sp: Spine, t: number): void {
  if (sp.d < v.camD + 0.45) return;
  const fog = fogAt(sp.d);
  if (fog > 0.97) return;
  const p = project(v, sp.d);
  const pt = project(v, sp.d + sp.len);
  if (!p || !pt) return;
  const b0 = wallPoint(v, p, sp.d, sp.a - sp.half, -0.01);
  const b1 = wallPoint(v, p, sp.d, sp.a + sp.half, -0.01);
  const root = { x: (b0.x + b1.x) / 2, y: (b0.y + b1.y) / 2 };
  const tip = wallPoint(v, pt, sp.d + sp.len, sp.a + sp.twist * 0.4, sp.inset);
  const ax = { x: tip.x - root.x, y: tip.y - root.y };
  const size = Math.hypot(ax.x, ax.y);
  if (size < 2) return;
  const across = { x: (b1.x - b0.x) / 2, y: (b1.y - b0.y) / 2 };
  const width = Math.hypot(across.x, across.y) * 2;
  const bow = sp.bow * 0.25;
  // A fang-like cone: full width a third of the way out, tapering to a sharp, slightly curved tip.
  const at = (k: number, side: number, w: number): Pt => ({
    x: root.x + ax.x * k + across.x * side * w + across.x * bow * Math.sin(Math.PI * k),
    y: root.y + ax.y * k + across.y * side * w + across.y * bow * Math.sin(Math.PI * k),
  });
  const left = [b0, at(0.3, -1, 0.95), at(0.65, -1, 0.5), tip];
  const right = [tip, at(0.65, 1, 0.5), at(0.3, 1, 0.95), b1];
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y);
    ctx.bezierCurveTo(left[1]!.x, left[1]!.y, left[2]!.x, left[2]!.y, tip.x, tip.y);
    ctx.bezierCurveTo(right[1]!.x, right[1]!.y, right[2]!.x, right[2]!.y, b1.x, b1.y);
    ctx.closePath();
  };
  // Light from above-left: which flank faces it, and how much the spine as a whole is lit (roof spines more than floor ones).
  const litLeft = across.x * 0.6 + across.y * 0.8 > 0;
  const roof = 0.5 - 0.5 * Math.sin(sp.a);
  const dim = clamp01(fog * 1.05 + (1 - roof) * 0.25);
  const shimmer = v.glint * Math.max(0, Math.sin(t * 8 - sp.d * 1.3 + sp.seed));
  const lit = mix(mix(SPINE_MID, SPINE_LIT, roof), SPINE_FAR, dim);
  const shade = mix(SPINE_SHADE, SPINE_FAR, dim);
  ctx.save();
  // The fold its root sits in.
  ctx.globalAlpha = 0.55 * (1 - fog);
  ctx.fillStyle = '#1c0306';
  ctx.beginPath();
  ctx.ellipse(root.x, root.y, Math.min(60, width * 0.7), Math.min(16, Math.max(1, width * 0.18)), Math.atan2(across.y, across.x), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Rounded across its width: a bright band on the lit flank, rolling into deep shade.
  const g = ctx.createLinearGradient(b0.x, b0.y, b1.x, b1.y);
  const l = litLeft ? 0 : 1;
  g.addColorStop(l ? 1 : 0, mix(lit, shade, 0.25));
  g.addColorStop(l ? 0.75 : 0.25, lit);
  g.addColorStop(0.55, mix(lit, shade, 0.45));
  g.addColorStop(l ? 0 : 1, shade);
  ctx.fillStyle = g;
  outline();
  ctx.fill();
  // Pinker at the root, bleached at the tip.
  const along = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
  along.addColorStop(0, 'rgba(140,40,52,0.55)');
  along.addColorStop(0.3, 'rgba(140,40,52,0)');
  along.addColorStop(0.75, 'rgba(255,248,236,0)');
  along.addColorStop(1, `rgba(255,248,236,${(0.45 * (1 - dim)).toFixed(3)})`);
  ctx.fillStyle = along;
  ctx.fill();
  ctx.restore();
  // Ink only down its shaded flank and round the tip.
  if (fog < 0.85) {
    const shadeSide = litLeft ? [at(0.05, 1, 1), right[2]!, right[1]!, tip] : [at(0.05, -1, 1), left[1]!, left[2]!, tip];
    pen.stroke(shadeSide, Math.max(0.4, Math.min(2.4, width * 0.05)) * (1 - 0.7 * fog), '#1e0508', 0.75 * (1 - fog), false);
  }
  // A wet glint along the lit flank.
  if (fog < 0.75 && size > 6) {
    const side = litLeft ? -1 : 1;
    const q0 = at(0.15, side, 0.45);
    const q1 = at(0.5, side, 0.4);
    const q2 = at(0.82, side, 0.18);
    ctx.save();
    ctx.globalAlpha = (0.6 + 0.4 * shimmer) * (1 - fog / 0.75) * (0.45 + 0.55 * roof);
    ctx.strokeStyle = '#fffef8';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.6, Math.min(6, width * 0.12));
    ctx.beginPath();
    ctx.moveTo(q0.x, q0.y);
    ctx.quadraticCurveTo(q1.x, q1.y, q2.x, q2.y);
    ctx.stroke();
    ctx.restore();
  }
  if (shimmer > 0.7 && fog < 0.5) glow(ctx, tip.x, tip.y, Math.max(5, size * 0.1), '#fff3dc', 0.35 * (shimmer - 0.7) / 0.3);
}
